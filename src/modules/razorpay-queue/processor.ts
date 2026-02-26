/**
 * Razorpay Event Queue — Job Processor
 *
 * Handles Razorpay webhook payloads that have been dequeued from BullMQ.
 *
 * Security: Idempotency is enforced via a per-event Redis key
 * (razorpay:processed:{eventId}) written ONLY after successful processing.
 * A GET at job-start checks whether a prior attempt already succeeded.
 * A failed/crashed job leaves no key, so BullMQ retries run the full handler
 * again — eliminating the "Zombie Lock" where SET NX at job-start blocked retries.
 *
 * Each event type:
 *   payment.authorized — logged only (medusa-plugin-razorpay-v2 handles capture)
 *   payment.captured   — logged only (fulfillment triggered by order.placed subscriber)
 *   payment.failed     — logged as warning
 *   refund.processed   — looks up Medusa order and sends refund-initiated email
 */

import type { Job } from "bullmq"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getRedisClient } from "../../lib/redis-client"
import { sendOrderRefundedWorkflow } from "../../workflows/send-order-refunded"
import logger from "../../lib/logger"

const log = logger.child({ module: "razorpay-processor" })

// Razorpay webhooks can be retried up to several hours after the initial delivery.
// Keep the idempotency key for 24 hours.
const IDEMPOTENCY_TTL_SECS = 86_400

export function createRazorpayProcessor(container: any) {
    return async (job: Job): Promise<string> => {
        const { eventId, event, payload } = job.data as {
            eventId: string
            event: string
            payload: Record<string, any>
        }

        // ── Idempotency guard ────────────────────────────────────────────
        // READ-FIRST: check if a PRIOR attempt already completed successfully.
        // The key is written ONLY after all processing succeeds (end of this closure).
        // A failed/crashed job leaves no key → BullMQ retries run the full handler.
        // This eliminates the Zombie Lock where SET NX at job-start blocked all retries.
        const redis = getRedisClient()
        const idempotencyKey = `razorpay:processed:${eventId}`
        try {
            const alreadyDone = await redis.get(idempotencyKey)
            if (alreadyDone) {
                log.info({ eventId, event, jobId: job.id }, "Razorpay event already completed on a prior attempt — skipping")
                return "duplicate_completed"
            }
        } catch (redisErr) {
            // Cannot confirm whether this event already ran — fail-closed.
            log.error({ err: redisErr, eventId, event }, "Cannot check idempotency key — failing job for retry")
            throw redisErr
        }

        // ── Event routing ────────────────────────────────────────────────
        const paymentEntity = payload?.payment?.entity as Record<string, any> | undefined
        const refundEntity  = payload?.refund?.entity  as Record<string, any> | undefined

        try {
            switch (event) {
                case "payment.authorized":
                    log.info(
                        { paymentId: paymentEntity?.id, amount: paymentEntity?.amount },
                        "Payment authorized — medusa-plugin-razorpay-v2 handles capture"
                    )
                    break

                case "payment.captured":
                    log.info(
                        { paymentId: paymentEntity?.id, orderId: paymentEntity?.order_id },
                        "Payment captured — fulfillment triggered by order.placed subscriber"
                    )
                    break

                case "payment.failed":
                    log.warn(
                        {
                            paymentId: paymentEntity?.id,
                            errorCode: paymentEntity?.error_code,
                            errorDescription: paymentEntity?.error_description,
                        },
                        "Payment failed — customer notified by Razorpay UI; no backend action"
                    )
                    break

                case "refund.processed":
                    await handleRefundProcessed(container, { refundEntity, paymentEntity })
                    break

                default:
                    log.info({ event }, "Unhandled Razorpay event type — acknowledged but not processed")
            }

            // ── Mark successful completion ────────────────────────────────
            // Only written AFTER all processing succeeds. Any throw above skips
            // this line → key stays absent → BullMQ retry runs the full handler.
            await redis.set(idempotencyKey, "1", "EX", String(IDEMPOTENCY_TTL_SECS))
        } catch (err) {
            // Idempotency key was not written — BullMQ will retry this job.
            log.error({ err, eventId, event }, "Job processing failed — retry will re-run the full handler")
            throw err
        }

        return "processed"
    }
}

// ── Refund Handler ─────────────────────────────────────────────────────────────

async function handleRefundProcessed(
    container: any,
    {
        refundEntity,
        paymentEntity,
    }: {
        refundEntity?: Record<string, any>
        paymentEntity?: Record<string, any>
    }
) {
    const razorpayPaymentId = refundEntity?.payment_id ?? paymentEntity?.id
    const refundId          = refundEntity?.id
    const refundAmount      = refundEntity?.amount ?? 0  // in paise

    log.info(
        { refundId, razorpayPaymentId, amountInr: refundAmount / 100 },
        "Processing refund.processed event"
    )

    if (!razorpayPaymentId) {
        log.warn("refund.processed event missing payment_id — cannot look up order")
        return
    }

    // ── Look up Medusa payment by Razorpay payment ID (single JSONB query) ─
    // Replaces an O(N/100) pagination loop with one SQL query. The payment.data
    // column is JSONB; we probe both key names used by the Razorpay plugin:
    // 'id' (set directly) and 'razorpay_payment_id' (set by some plugin versions).
    // Workspace rules permit raw SQL for performance-critical reads.
    const em: any = container.resolve("manager")
    const rows: Array<{ id: string; payment_collection_id: string }> = await em.execute(
        `SELECT id, payment_collection_id
         FROM payment
         WHERE provider_id LIKE '%razorpay%'
           AND (data->>'id' = ? OR data->>'razorpay_payment_id' = ?)
           AND created_at > NOW() - INTERVAL '180 days'
         LIMIT 1`,
        [razorpayPaymentId, razorpayPaymentId]
    )

    const matchedPayment = rows[0]

    if (!matchedPayment) {
        log.warn(
            { razorpayPaymentId },
            "No Medusa payment found for Razorpay payment_id — cannot send refund email"
        )
        return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    // ── Find the order via payment_collection → order link ─────────────────
    const { data: collections } = await query.graph({
        entity: "payment_collection",
        fields: ["id", "order.*"],
        filters: { id: matchedPayment.payment_collection_id },
    })

    const order = (collections[0] as any)?.order
    if (!order?.id) {
        log.warn(
            { paymentCollectionId: matchedPayment.payment_collection_id },
            "No order linked to payment_collection"
        )
        return
    }

    log.info({ orderId: order.id, displayId: order.display_id }, "Refund mapped to Medusa order")

    // ── Find a return linked to this order ─────────────────────────────────
    const { data: returns } = await query.graph({
        entity: "return",
        fields: ["id", "refund_amount", "created_at"],
        filters: { order_id: order.id },
    })

    if (returns.length > 0) {
        const sortedReturns = [...returns].sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const latestReturn = sortedReturns[0] as any
        log.info({ returnId: latestReturn.id }, "Sending refund email for return")

        await sendOrderRefundedWorkflow(container).run({
            input: { id: latestReturn.id },
        })
    } else {
        // Direct refund from Razorpay dashboard — no formal return record
        log.info({ orderId: order.id }, "No return record found — sending direct refund notification")

        // Convert paise → rupees for email template (fmt() expects major currency unit)
        await sendOrderRefundedWorkflow(container).run({
            input: { id: order.id, directRefundAmount: refundAmount / 100, isDirectRefund: true },
        })
    }
}
