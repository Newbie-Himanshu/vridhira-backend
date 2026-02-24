/**
 * src/lib/razorpay.ts
 *
 * Shared Razorpay client factory.
 *
 * WHY THIS EXISTS:
 *   `getRazorpay()` was duplicated identically across three separate admin route files:
 *     - src/api/admin/custom/razorpay/route.ts
 *     - src/api/admin/custom/razorpay/settlements/route.ts
 *     - src/api/admin/custom/razorpay/[paymentId]/route.ts
 *
 *   Centralising here means:
 *     1. A single place to update if the error message or env-var names ever change.
 *     2. A lazy-cached module-level instance — Node.js module caching ensures the
 *        Razorpay constructor runs exactly once per process lifetime rather than
 *        allocating a new instance for every incoming HTTP request.
 *
 * USAGE:
 *   import { getRazorpay } from "../../../../lib/razorpay"
 *   const rzp = getRazorpay()  // throws if RAZORPAY_KEY_ID / KEY_SECRET are unset
 */

import Razorpay from "razorpay"

let _client: Razorpay | null = null

/**
 * Returns a lazily-initialised Razorpay client.
 * Throws a descriptive Error (caught by each route's try/catch → 500 response)
 * if the required environment variables are not set.
 */
export function getRazorpay(): Razorpay {
    if (_client) return _client

    const key_id     = process.env.RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET

    if (!key_id || !key_secret) {
        throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env")
    }

    _client = new Razorpay({ key_id, key_secret })
    return _client
}
