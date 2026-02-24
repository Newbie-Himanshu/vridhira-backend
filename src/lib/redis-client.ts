import Redis from "ioredis"
import logger from "./logger"

const log = logger.child({ module: "redis-client" })

let client: Redis | null = null

/**
 * Returns a lazily-initialised singleton ioredis client.
 *
 * Reads REDIS_URL from the environment (same value used by Medusa's own
 * event bus and cache module — so no second connection is opened if they
 * share the same Redis instance).
 *
 * Failure behaviour:
 *   - Connect / command errors are LOGGED but do NOT throw at the call site.
 *   - Callers that use Redis for rate-limiting should fail open (allow the
 *     request) when the client is unavailable, so Redis downtime never blocks
 *     legitimate customer checkouts.
 *
 * Usage:
 *   import { getRedisClient } from "../lib/redis-client"
 *   const redis = getRedisClient()
 *   const set = await redis.set("key", "1", "NX", "EX", 60)
 */
export function getRedisClient(): Redis {
    if (client) return client

    const url = process.env.REDIS_URL
    if (!url) {
        throw new Error(
            "[Redis] REDIS_URL is not configured. " +
            "Set REDIS_URL in your .env file to enable Redis-backed OTP rate limiting."
        )
    }

    client = new Redis(url, {
        // OTP rate-limit checks must respond fast — 1 retry avoids thundering-herd
        // without hanging the checkout request for multiple seconds on Redis hiccup.
        maxRetriesPerRequest: 1,
        // Don't delay startup waiting for the READY event — connect on first command.
        enableReadyCheck: false,
        lazyConnect: true,
        // Keep connection alive in serverless / long-running process environments.
        keepAlive: 10000,
    })

    client.on("error", (err: Error) => {
        // Do not re-throw — an ioredis error event that goes unhandled crashes
        // the Node process. Logging here surfaces the issue without killing the server.
        log.error({ err }, "Redis connection error")
    })

    client.on("connect", () => log.info("Redis connected"))
    client.on("reconnecting", () => log.warn("Redis reconnecting…"))

    return client
}
