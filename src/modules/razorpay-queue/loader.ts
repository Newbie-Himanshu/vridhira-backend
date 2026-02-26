/**
 * Razorpay Event Queue — Module Loader
 *
 * Starts the BullMQ Worker that processes Razorpay webhook payloads.
 * This loader runs once during Medusa server startup, AFTER all modules have been
 * registered, so `container` has access to all Medusa services.
 *
 * The Worker uses a dedicated IORedis connection (maxRetriesPerRequest: null is
 * required for Workers that issue blocking Redis commands).
 *
 * BullMQ retry policy (from queue.ts defaultJobOptions):
 *   3 attempts, exponential backoff starting at 5s → 5s, 25s, 125s
 *   Failed jobs are kept in the "failed" set for up to 500 entries.
 */

import { Worker } from "bullmq"
import IORedis from "ioredis"
import { createRazorpayProcessor } from "./processor"
import logger from "../../lib/logger"

const log = logger.child({ module: "razorpay-queue-loader" })

export async function razorpayQueueLoader(
    container: any,
    _pluginOptions?: Record<string, unknown>
) {
    const url = process.env.REDIS_URL
    if (!url) {
        log.warn("REDIS_URL is not set — Razorpay event queue Worker will not start")
        return
    }

    // Workers MUST have their own connection with maxRetriesPerRequest: null.
    // Using the shared getRedisClient() connection here would cause Worker commands
    // to time out because blocking Redis commands (XREAD, BRPOP) never return a value.
    const workerConnection = new IORedis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        keepAlive: 10000,
    })

    workerConnection.on("error", (err: Error) => {
        log.error({ err }, "RazorpayQueue Worker Redis connection error")
    })

    const processor = createRazorpayProcessor(container)

    const worker = new Worker("razorpay-events", processor, {
        connection: workerConnection,
        // Process one job at a time — orders must be processed sequentially
        // to avoid parallel DB writes on the same payment collection.
        concurrency: 1,
        // Wait up to 30s for a job before polling again (keeps CPU usage low).
        drainDelay: 30,
    })

    worker.on("completed", (job, result) => {
        if (result !== "duplicate_completed") {
            log.info({ jobId: job.id, event: job.data.event, result }, "Razorpay job completed")
        }
    })

    worker.on("failed", (job, err) => {
        log.error(
            { jobId: job?.id, event: job?.data?.event, attempt: job?.attemptsMade, err },
            "Razorpay job failed — BullMQ will retry with exponential backoff"
        )
    })

    worker.on("error", (err) => {
        log.error({ err }, "Razorpay Worker experienced an internal error")
    })

    // Graceful shutdown — close Worker before the process exits so in-flight jobs
    // complete and are not left in an ambiguous state.
    const shutdown = async (signal: string) => {
        log.info({ signal }, "Shutting down Razorpay queue Worker")
        try {
            await worker.close()
            await workerConnection.quit()
        } catch {
            // best effort
        }
    }

    process.once("SIGTERM", () => shutdown("SIGTERM"))
    process.once("SIGINT",  () => shutdown("SIGINT"))

    log.info("Razorpay event queue Worker started (concurrency: 1)")
}
