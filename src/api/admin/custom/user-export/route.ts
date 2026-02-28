import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /admin/custom/user-export
 *
 * Returns a merged list of ALL customers + ALL admin users with per-customer
 * order statistics in a single payload.
 *
 * Query params:
 *   type  = "customers" | "admins" | "all" (default: "all")
 *   limit = number (default: 5000)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const type = (req.query.type as string) ?? "all"
  const limit = Math.min(parseInt((req.query.limit as string) ?? "5000", 10), 10000)

  const result: {
    customers: unknown[]
    admins: unknown[]
    total_customers: number
    total_admins: number
    exported_at: string
  } = {
    customers: [],
    admins: [],
    total_customers: 0,
    total_admins: 0,
    exported_at: new Date().toISOString(),
  }

  try {
    // ── Fetch customers ──────────────────────────────────────────────────────
    if (type === "all" || type === "customers") {
      const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
      const orderModule    = req.scope.resolve(Modules.ORDER) as any

      const [customers, orders] = await Promise.all([
        customerModule.listCustomers(
          {},
          {
            select: [
              "id", "email", "first_name", "last_name", "phone",
              "has_account", "created_at", "updated_at", "metadata",
            ],
            relations: ["addresses", "groups"],
            take: limit,
            skip: 0,
          }
        ),
        // Fetch all orders — one DB call, group in JS
        orderModule.listOrders(
          {},
          {
            select: [
              "id", "customer_id", "display_id",
              "status", "fulfillment_status", "payment_status",
              "total", "subtotal", "currency_code",
              "created_at", "updated_at",
            ],
            take: 50000,
            skip: 0,
            order: { created_at: "DESC" },
          }
        ),
      ])

      // ── Build per-customer order index ─────────────────────────────────
      type OrderIndex = {
        total_orders: number
        total_spent: number
        currency_code: string
        last_order_date: string
        last_order_id: string
        last_order_display_id: string
        last_order_status: string
        last_fulfillment_status: string
        last_payment_status: string
      }

      const orderIndex = new Map<string, OrderIndex>()

      for (const o of orders as any[]) {
        const cid: string = o.customer_id
        if (!cid) continue
        const existing = orderIndex.get(cid)
        if (!existing) {
          // First (=most recent, because sorted DESC) order for this customer
          orderIndex.set(cid, {
            total_orders:             1,
            total_spent:              Number(o.total ?? 0),
            currency_code:            o.currency_code ?? "",
            last_order_date:          o.created_at,
            last_order_id:            o.id,
            last_order_display_id:    o.display_id ? `#${o.display_id}` : o.id,
            last_order_status:        o.status ?? "",
            last_fulfillment_status:  o.fulfillment_status ?? "",
            last_payment_status:      o.payment_status ?? "",
          })
        } else {
          // Subsequent orders — accumulate
          existing.total_orders  += 1
          existing.total_spent   += Number(o.total ?? 0)
        }
      }

      const toAmount = (raw: number, currency: string) => {
        // Most currencies use /100 — INR, USD, EUR etc.
        const divisor = ["jpy", "krw", "clp", "gnf"].includes(currency.toLowerCase()) ? 1 : 100
        return (raw / divisor).toFixed(2)
      }

      result.customers = (customers as any[]).map((c: any) => {
        const oi = orderIndex.get(c.id)
        return {
          type:                     "customer",
          id:                       c.id,
          email:                    c.email ?? "",
          first_name:               c.first_name ?? "",
          last_name:                c.last_name ?? "",
          full_name:                [c.first_name, c.last_name].filter(Boolean).join(" ") || "—",
          phone:                    c.phone ?? "",
          has_account:              c.has_account ?? false,
          address_count:            c.addresses?.length ?? 0,
          default_country:          c.addresses?.find((a: any) => a.is_default_shipping)?.country_code ?? "",
          customer_groups:          (c.groups ?? []).map((g: any) => g.name).join(", "),
          // ── Order stats ────────────────────────────────────────────────
          total_orders:             oi?.total_orders ?? 0,
          total_spent:              oi ? toAmount(oi.total_spent, oi.currency_code) : "0.00",
          currency:                 oi?.currency_code.toUpperCase() ?? "",
          avg_order_value:          oi
            ? toAmount(oi.total_spent / oi.total_orders, oi.currency_code)
            : "0.00",
          last_order_date:          oi?.last_order_date ?? "",
          last_order_id:            oi?.last_order_display_id ?? "",
          last_order_status:        oi?.last_order_status ?? "",
          last_fulfillment_status:  oi?.last_fulfillment_status ?? "",
          last_payment_status:      oi?.last_payment_status ?? "",
          // ── Metadata ──────────────────────────────────────────────────
          created_at:               c.created_at,
          updated_at:               c.updated_at,
          metadata:                 c.metadata ? JSON.stringify(c.metadata) : "",
        }
      })
      result.total_customers = result.customers.length
    }

    // ── Fetch admin users ────────────────────────────────────────────────────
    if (type === "all" || type === "admins") {
      const userModule = req.scope.resolve(Modules.USER) as any

      const users = await userModule.listUsers(
        {},
        {
          select: [
            "id", "email", "first_name", "last_name",
            "avatar_url", "created_at", "updated_at", "metadata",
          ],
          take: limit,
          skip: 0,
        }
      )

      result.admins = (users as any[]).map((u: any) => ({
        type:              "admin",
        id:                u.id,
        email:             u.email ?? "",
        first_name:        u.first_name ?? "",
        last_name:         u.last_name ?? "",
        full_name:         [u.first_name, u.last_name].filter(Boolean).join(" ") || "—",
        avatar_url:        u.avatar_url ?? "",
        total_orders:      "N/A",
        total_spent:       "N/A",
        currency:          "N/A",
        avg_order_value:   "N/A",
        last_order_date:   "N/A",
        last_order_id:     "N/A",
        last_order_status: "N/A",
        created_at:        u.created_at,
        updated_at:        u.updated_at,
        metadata:          u.metadata ? JSON.stringify(u.metadata) : "",
      }))
      result.total_admins = result.admins.length
    }

    return res.status(200).json(result)
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err?.message ?? "Failed to export users" })
  }
}
