import {
    AbstractFulfillmentProviderService,
    MedusaError,
    Modules,
} from "@medusajs/framework/utils"
import {
    CalculatedShippingOptionPrice,
    CreateFulfillmentResult,
    FulfillmentOption,
    FulfillmentOrderDTO,
    IProductModuleService,
    ValidateFulfillmentDataContext,
} from "@medusajs/types"
import ShiprocketService from "../../services/shiprocket"
import { resolveShipmentDimensions } from "../../lib/util/shiprocket"
import { retryWithBackoff } from "../../lib/util/retry"
import { SHIPPING_CONFIG_MODULE } from "../shipping-config"

/**
 * Maps Medusa ISO 3166-1 alpha-2 country codes → Shiprocket full country name.
 * The Shiprocket Create Order API requires the full name, not the ISO code.
 * Source: https://apidocs.shiprocket.in/#2a7b8611-3965-4f40-8b1b-71579545465f
 * Extend this map as you expand to new markets.
 */
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
    in: "India",
    us: "United States",
    gb: "United Kingdom",
    ae: "United Arab Emirates",
    sg: "Singapore",
    ca: "Canada",
    au: "Australia",
    de: "Germany",
    fr: "France",
    nl: "Netherlands",
}

type ShiprocketOrderPayload = {
    order_id: string
    order_date: string
    pickup_location: string
    billing_customer_name: string
    billing_last_name: string
    billing_address: string
    billing_city: string
    billing_pincode: string
    billing_state: string
    billing_country: string
    billing_email: string
    billing_phone: string
    shipping_is_billing: boolean
    order_items: Array<{
        name: string
        sku: string
        units: number
        selling_price: number
    }>
    payment_method: "Prepaid" | "COD"
    sub_total: number
    length: number
    breadth: number
    height: number
    weight: number
}

class ShiprocketFulfillmentService extends AbstractFulfillmentProviderService {
    static identifier = "shiprocket"

    protected shiprocketService_: ShiprocketService
    protected productModuleService_: IProductModuleService
    protected shippingConfigService_: any

    constructor(
        container: Record<string, any>,
        options?: Record<string, any>
    ) {
        super()
        this.shiprocketService_ = new ShiprocketService()
        // Injected by Medusa's IoC container — used to enrich FulfillmentItemDTOs
        // with product metadata for accurate shipment dimensions.
        this.productModuleService_ = container[Modules.PRODUCT]
        this.shippingConfigService_ = container[SHIPPING_CONFIG_MODULE]
    }

    async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
        return [
            { id: "shiprocket-standard", name: "Standard Shipping (Shiprocket)" },
            { id: "shiprocket-express", name: "Express Shipping (Shiprocket)" },
        ]
    }

    async validateFulfillmentData(
        optionData: Record<string, unknown>,
        data: Record<string, unknown>,
        context: ValidateFulfillmentDataContext
    ): Promise<Record<string, unknown>> {
        return data
    }

    async validateOption(data: Record<string, unknown>): Promise<boolean> {
        return true
    }

    async canCalculate(data: any): Promise<boolean> {
        // We can calculate dynamic rates if we have address info
        return !!data.postal_code || true
    }

    async calculatePrice(
        optionData: Record<string, unknown>,
        data: Record<string, unknown>,
        cart: any // Medusa passes the Cart object (or Cart-like context) here as the 3rd argument
    ): Promise<CalculatedShippingOptionPrice> {
        // Access address directly from the cart object
        const address = cart?.shipping_address

        // FAIL SAFETY: If we can't calculate a price (no address), we shouldn't return a dangerous fallback.
        if (!address?.postal_code) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Shipping address with postal code is required to calculate shipping rates"
            )
        }

        try {
            // Use resolveShipmentDimensions so checkout weight is consistent with
            // the actual weight sent at shipment creation — single source of truth.
            const dims = resolveShipmentDimensions(cart.items ?? [])
            const isCod = cart?.payment_session?.provider_id === "cod" ||
                cart?.payment_sessions?.some((s: any) => s.provider_id === "cod" && s.is_selected)

            const rates = await this.shiprocketService_.getShippingRates(
                address.postal_code,
                dims.weight,
                isCod
            )

            if (!rates || rates.length === 0) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    "No shipping rates available for this pincode"
                )
            }

            // Standard = cheapest courier; Express = fastest (fewest estimated days)
            const isExpress = (optionData?.id as string)?.includes("express")
            const selectedRate = isExpress
                ? rates.slice().sort((a: any, b: any) => (a.estimated_days ?? 99) - (b.estimated_days ?? 99))[0]
                : rates[0]

            // Load admin-configurable markup settings
            const cfgs = await this.shippingConfigService_
                .listShippingConfigs({}, { take: 1 })
                .catch(() => [])
            const cfg = cfgs[0] ?? {
                enabled: true,
                surcharge_percent: 0,
                handling_fee: 0,
                free_shipping_threshold: 0,
                fallback_rate: 99,
                express_surcharge_percent: 0,
                express_handling_fee: 0,
                express_fallback_rate: 149,
                express_free_shipping_threshold: 0,
            }

            // Medusa cart subtotal is in paise — convert to rupees for the formula
            const subtotalRupees = (cart.subtotal ?? 0) / 100

            const freeThreshold = isExpress
                ? cfg.express_free_shipping_threshold
                : cfg.free_shipping_threshold

            // Free shipping threshold
            if (freeThreshold > 0 && subtotalRupees >= freeThreshold) {
                return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
            }

            const surchargePercent = isExpress ? cfg.express_surcharge_percent : cfg.surcharge_percent
            const handlingFee      = isExpress ? cfg.express_handling_fee      : cfg.handling_fee

            const surcharge  = cfg.enabled ? Math.round(subtotalRupees * (surchargePercent / 100)) : 0
            const handling   = cfg.enabled ? handlingFee : 0
            const totalRupees = selectedRate.rate + surcharge + handling

            return {
                calculated_amount: Math.ceil(totalRupees * 100), // back to paise
                is_calculated_price_tax_inclusive: false,
            }
        } catch (e) {
            console.error("Shiprocket rate calculation failed:", e)
            // Try to use admin fallback rate before throwing
            try {
                const cfgs = await this.shippingConfigService_
                    .listShippingConfigs({}, { take: 1 })
                    .catch(() => [])
                const isExpress = (optionData?.id as string)?.includes("express")
                const fallbackRupees = isExpress
                    ? (cfgs[0]?.express_fallback_rate ?? 149)
                    : (cfgs[0]?.fallback_rate ?? 99)
                return {
                    calculated_amount: Math.ceil(fallbackRupees * 100),
                    is_calculated_price_tax_inclusive: false,
                }
            } catch {
                throw new MedusaError(
                    MedusaError.Types.UNEXPECTED_STATE,
                    "Could not calculate shipping rate via Shiprocket"
                )
            }
        }
    }

    async createFulfillment(
        data: Record<string, unknown>,
        items: any[],
        order: FulfillmentOrderDTO,
        fulfillment: any
    ): Promise<CreateFulfillmentResult> {
        // Validate Inputs
        if (!order) {
            throw new MedusaError(MedusaError.Types.INVALID_DATA, "Order data missing")
        }

        // Address resolution for Orders, Swaps, logic might differ
        // For standard Order: order.shipping_address
        // For Swap: swap.shipping_address (if it exists) or swap.order.shipping_address
        // In the fulfillment provider context, 'order' usually refers to the entity being fulfilled (Order or Swap)
        const address = (order as any).shipping_address || (order as any).order?.shipping_address

        if (!address) {
            throw new MedusaError(MedusaError.Types.INVALID_DATA, "Shipping address missing")
        }

        // Resolve Email
        const email = (order as any).email || (order as any).order?.email

        // Enrich FulfillmentItemDTOs with product metadata so resolveShipmentDimensions
        // can read shiprocket_length/breadth/height/weight from product.metadata.
        // FulfillmentItemDTO only carries { id, quantity, sku, title } — no metadata —
        // so we look up each product via the Product Module.
        const enrichedItems = await Promise.all(
            items.map(async (item: any) => {
                const productId = item.product_id
                if (!productId || !this.productModuleService_) return item
                try {
                    const product = await this.productModuleService_.retrieveProduct(productId, {
                        select: ["id", "metadata"],
                    })
                    return { ...item, product: { metadata: product.metadata } }
                } catch {
                    // Fall back gracefully — dimensions default will apply for this item
                    return item
                }
            })
        )

        // Use shared utility to resolve dimensions (now with real product metadata)
        const dims = resolveShipmentDimensions(enrichedItems)

        // Map Medusa ISO country code ("in") → Shiprocket full name ("India").
        // Shiprocket rejects ISO codes; the full name is required.
        const countryName =
            COUNTRY_CODE_TO_NAME[address.country_code?.toLowerCase()] ?? "India"

        const payload: ShiprocketOrderPayload = {
            // display_id is a number — use String() to convert, not "as string" cast
            order_id: String((order as any).display_id || fulfillment.id || (order as any).id),
            order_date: this.formatDate(new Date((order as any).created_at || Date.now())),
            pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
            billing_customer_name: address.first_name,
            billing_last_name: address.last_name || "",
            billing_address: address.address_1,
            billing_city: address.city,
            billing_pincode: address.postal_code,
            billing_state: address.province || "",
            billing_country: countryName,
            billing_email: email,
            billing_phone: address.phone || "",
            shipping_is_billing: true,
            order_items: items.map((item: any) => ({
                name: item.title,
                sku: item.variant?.sku || item.title,
                units: item.quantity,
                selling_price: item.unit_price / 100, // Medusa stores in paise; Shiprocket expects rupees
            })),
            payment_method: "Prepaid", // Default; overridden below if COD
            sub_total: ((order as any).subtotal || 0) / 100,
            length: dims.length,
            breadth: dims.breadth,
            height: dims.height,
            weight: dims.weight,
        }

        // Handle COD logic
        // If the payment provider is COD, we should mark it as COD in Shiprocket
        // Medusa's order.payments usually contains the provider info
        const payments = (order as any).payments || (order as any).order?.payments
        // Medusa registers the provider as pp_{module_id}_{provider_id} → "pp_cod_cod".
        // Also accept the bare string "cod" as a safety net in case the resolvedId differs.
        const isCod = payments?.some(
            (p: any) => p.provider_id === "pp_cod_cod" || p.provider_id === "cod"
        )
        if (isCod) {
            payload.payment_method = "COD"
        }

        // Call Shiprocket API with in-process retry (3 attempts, exponential backoff: 2s, 4s, 8s).
        // Transient Shiprocket 5xx errors and expired auth tokens (auto-refreshed by getHeaders)
        // are handled transparently by the retry loop.
        try {
            const orderResult = await retryWithBackoff(
                () => this.shiprocketService_.createOrder(payload),
                { attempts: 3, baseDelayMs: 2000, factor: 2 }
            )
            const awbResult = await retryWithBackoff(
                () => this.shiprocketService_.generateAWB(orderResult.shipment_id),
                { attempts: 3, baseDelayMs: 2000, factor: 2 }
            )
            await retryWithBackoff(
                () => this.shiprocketService_.schedulePickup([orderResult.shipment_id]),
                { attempts: 3, baseDelayMs: 2000, factor: 2 }
            )

            return {
                data: {
                    shiprocket_order_id: orderResult.order_id,
                    shiprocket_shipment_id: orderResult.shipment_id,
                    awb_code: awbResult.awb_code,       // real AWB — available to subscriber for email
                    courier_name: awbResult.courier_name, // real courier name — available to subscriber for email
                },
                labels: [],
            }
        } catch (e: any) {
            throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, e.message)
        }
    }

    async cancelFulfillment(data: Record<string, unknown>): Promise<any> {
        const awb = data.awb_code as string
        if (!awb) {
            return {}
        }

        try {
            // Check status before cancelling
            const tracking = await this.shiprocketService_.trackShipment(awb)
            const status = tracking.current_status?.toUpperCase()

            // If already delivered or canceled, don't try to cancel again
            if (status === 'DELIVERED' || status === 'CANCELED') {
                return {}
            }

            await this.shiprocketService_.cancelShipment([awb])
        } catch (e) {
            // If tracking fails (e.g. invalid AWB), we might still want to try cancelling or just ignore
            console.warn("Error verifying/cancelling shipment:", e)
        }

        return {}
    }

    /**
     * Format date as YYYY-MM-DD HH:mm — required by Shiprocket API.
     */
    private formatDate(date: Date): string {
        const pad = (n: number) => n.toString().padStart(2, "0")
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }
}

export default ShiprocketFulfillmentService
