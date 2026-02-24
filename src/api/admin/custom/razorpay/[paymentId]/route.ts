import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getRazorpay } from "../../../../../lib/razorpay"

// ── GET /admin/custom/razorpay/:paymentId ──────────────────────────────────────
// Returns full payment details + payment events (timeline).

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { paymentId } = req.params as { paymentId: string }

    try {
        const rzp = getRazorpay()

        const [payment, eventsResult] = await Promise.allSettled([
            rzp.payments.fetch(paymentId),
            (rzp.payments as any).fetchPaymentEvents(paymentId),
        ])

        const paymentData = payment.status === "fulfilled" ? payment.value : null
        const eventsData =
            eventsResult.status === "fulfilled" ? eventsResult.value : null

        if (!paymentData) {
            return res.status(404).json({ error: `Payment ${paymentId} not found` })
        }

        res.json({
            payment: paymentData,
            events: (eventsData as any)?.items ?? [],
        })
    } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "Failed to fetch payment" })
    }
}
