import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import CodPaymentService from "../../../../modules/cod-payment/service"
import logger from "../../../../lib/logger"

const log = logger.child({ module: "cod-send-otp" })

/**
 * POST /store/cod/send-otp
 *
 * Generates and sends an OTP for a COD payment session.
 * Call this endpoint from the storefront checkout before prompting the customer for the OTP.
 *
 * Request body:
 * {
 *   "payment_session_id": "cod_123...",
 *   "phone": "919876543210" // Optional if already on cart/session context, but best to provide
 * }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const { payment_session_id, phone } = req.body as {
        payment_session_id?: string
        phone?: string
    }

    if (!payment_session_id) {
        return res.status(400).json({ error: "payment_session_id is required" })
    }

    try {
        const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
        const paymentSession = await paymentModule.retrievePaymentSession(payment_session_id)

        if (!paymentSession) {
            return res.status(404).json({ error: "Payment session not found" })
        }

        if (paymentSession.provider_id !== "pp_cod_cod" && paymentSession.provider_id !== "cod") {
            return res.status(400).json({
                error: "OTP generation is only applicable to COD payment sessions",
            })
        }

        const sessionData = (paymentSession.data ?? {}) as Record<string, unknown>

        // Customer ownership check
        const customerId = (req as any).auth_context?.actor_id as string | undefined
        // You could also do the ownership check similar to verify-otp here
        // For simplicity, we assume we want to protect this endpoint as well
        if (!customerId) {
            return res.status(401).json({ error: "Authentication required" })
        }
        
        let targetPhone = phone
        
        // Try to get phone from cart if not explicitly provided
        const queryClient = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
        const pcId = paymentSession.payment_collection_id as string | undefined
        if (pcId) {
            const { data: collections } = await queryClient.graph({
                entity: "payment_collection",
                fields: ["id", "cart_id"],
                filters: { id: pcId },
            })
            const collection = (collections as any[])?.[0]
            const cartId = collection?.cart_id as string | undefined
            if (cartId) {
                const { data: carts } = await queryClient.graph({
                    entity: "cart",
                    fields: ["id", "customer_id", "email", "shipping_address.*", "billing_address.*", "customer.*"],
                    filters: { id: cartId },
                })
                const cart = (carts as any[])?.[0]
                if (!cart || cart.customer_id !== customerId) {
                    log.warn({ session_id: payment_session_id, cart_owner: cart?.customer_id ?? "unknown", requester: customerId }, "COD OTP send ownership check failed")
                    return res.status(403).json({ error: "You do not have permission to send OTP for this payment session" })
                }
                
                if (!targetPhone) {
                    targetPhone = cart.shipping_address?.phone || cart.billing_address?.phone || cart.customer?.phone
                }
            }
        }

        if (!targetPhone) {
             return res.status(400).json({ error: "A phone number is required to send the OTP. Please provide in body or ensure cart address has a phone." })
        }

        let codService: CodPaymentService
        try {
            codService = req.scope.resolve("pp_cod_cod") as CodPaymentService
        } catch {
            codService = req.scope.resolve("cod") as CodPaymentService
        }

        const updatedData = await codService.sendOtpAndStoreHash(sessionData, targetPhone)

        await paymentModule.updatePaymentSession({
            id: payment_session_id,
            data: updatedData,
        })

        log.info({ session_id: payment_session_id, phone_last4: updatedData.otp_phone_last4 }, "COD OTP properly generated and sent")

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            phone_last4: updatedData.otp_phone_last4
        })

    } catch (error: any) {
        const isMedusaError = error?.name === "MedusaError" || error?.type
        const statusCode = isMedusaError ? 400 : 500

        log.error({ err: error, session_id: payment_session_id }, "Failed to send COD OTP")

        return res.status(statusCode).json({
            error: error.message ?? "Failed to send OTP",
        })
    }
}
