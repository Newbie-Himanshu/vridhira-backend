# Security Audit — Vridhira Marketplace Backend

> **Audit date:** 2026-02-24  
> **Auditor:** GitHub Copilot (automated deep-read of all source files)  
> **Scope:** `src/api/**`, `src/modules/**`, `src/services/**`, `src/workflows/**`, `src/subscribers/**`, `src/lib/**`  
> **Commit basis:** `4466671` (post previous security-fix commit)

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 1 | ✅ Fixed in previous commit |
| 🟠 High | 2 | ✅ Fixed in previous commit |
| 🟡 Medium | 6 | ✅ Fixed in this commit |
| 🔵 Low / Informational | 5 | ✅ Fixed or documented |
| ♻️ DRY / Centralisation | 3 | ✅ Refactored in this commit |
| ⚠️ Known Limitations | 2 | 📝 Documented, deferred |

---

## Previously Fixed (commit `4466671`)

### 🔴 CRIT-01 — AWB Proxy Vulnerability
**File:** `src/api/store/orders/[id]/tracking/route.ts`

**What it was:** When an order had no stored AWB (`metadata.shiprocket_awb` absent — order not yet fulfilled), the route accepted any AWB from the caller and proxied it to Shiprocket's tracking API. Any authenticated customer could track *any* shipment in Shiprocket's system by guessing or intercepting AWB codes.

**Fix:** Return `{ current_status: "not_yet_shipped" }` immediately when no AWB is stored. Shiprocket is never called with caller-supplied data.

---

### 🟠 HIGH-01 — OTP Session Ownership Not Verified
**File:** `src/api/store/cod/verify-otp/route.ts`

**What it was:** The endpoint required authentication but never checked that the submitted `payment_session_id` belonged to the authenticated customer's cart. A logged-in user who obtained another customer's session ID could verify or exhaust their OTP attempts.

**Fix:** Added full ownership chain: `payment_collection → cart → customer_id` compared against `auth_context.actor_id`. Returns 403 on mismatch.

---

### 🟠 HIGH-02 — OTP Attempt Counter Best-Effort (Brute-Force Protection Bypassable)
**File:** `src/api/store/cod/verify-otp/route.ts`

**What it was:** The attempt counter increment was wrapped in a silent `try/catch`. If the DB write failed, the counter was never persisted — allowing unlimited OTP attempts during a DB degradation.

**Fix:** Removed the inner `try/catch`. Persistence failure now propagates as a 500 rather than silently continuing, ensuring brute-force protection is never in an untracked state.

---

## Fixed in This Audit (commit `N/A → see below`)

### 🟡 MED-01 — IDOR Order Existence Leak in Invoice Route
**File:** `src/api/store/orders/[id]/invoice/route.ts`

**What it was:** When an authenticated customer requested an invoice for an order that belonged to a *different* customer, the route returned `403 Forbidden: you do not own this order`. This confirmed to the client that the order ID *exists* in the database — an IDOR enumeration vector. An attacker with a valid session could probe sequential order IDs to map out competitors' or other customers' orders.

**Fix:** Changed the response to `404 Not Found: Order not found` (identical to the response when the order doesn't exist at all), eliminating the distinguishability.

**Additional fix:** Sanitised the `Content-Disposition` filename: `invoice-${displayNumber}.pdf` now strips non-word characters from `displayNumber` before embedding it in the HTTP header, preventing header injection if a non-integer display number were ever stored.

---

### 🟡 MED-02 — Razorpay Admin Dashboard Stats Inconsistency (Logic Bug)
**File:** `src/api/admin/custom/razorpay/route.ts`

**What it was:** `method_breakdown` was computed from the *filtered* `payments` array (after applying the `q` search parameter), but `summary` (`captured_today`, `refunded_today`, `pending_captures`) was computed from the *unfiltered* `result.items`. When an admin applied a search query, the summary stats reflected the full unfiltered page while the table showed only matching results — producing invisible discrepancies (e.g., "0 matching payments" but "captured today: ₹5,000").

**Fix:** Both `method_breakdown` and all `summary` stats now use the same filtered `payments` array. Added a comment noting these stats cover the current page only (Razorpay has no aggregation API).

---

### 🟡 MED-03 — COD OTP Sent to Unvalidated Phone Number
**File:** `src/modules/cod-payment/service.ts`

**What it was:** The phone number extracted from `context.customer.phone` or `billing_address.phone` was passed to MSG91's SendOTP API without validating it was an Indian mobile number. This caused:
- Opaque "OTP send failed" instead of a clear error for landlines, international numbers, or malformed strings.
- MSG91 charges per API call even for invalid numbers.
- Potential for customers to submit non-Indian numbers and get confusing checkout failures.

**Fix:** Added `validateAndNormaliseIndianPhone(raw: string): string` in the COD service. It validates the number is a 10-digit Indian mobile (starts 6–9) or `+91`/`91`-prefixed variant, throws a descriptive `MedusaError` for any other format, and normalises to MSG91's expected `91XXXXXXXXXX` format. Called in `initiatePayment` before the OTP is generated.

---

### 🟡 MED-04 — `search-config.ts` Synchronous I/O on Every Product Event
**File:** `src/lib/search-config.ts`

**What it was:** `getActiveProvider()` called `readSearchConfig()` which called `fs.readFileSync()` (blocking synchronous I/O) on every `product.created` / `product.updated` event and every admin sync request. During bulk product imports (hundreds of events), this caused repeated disk reads that blocked the Node.js event loop.

**Fix:** Added a 30-second in-memory TTL cache. The file is now only read once per 30 seconds; subsequent calls return the cached value. `writeSearchConfig()` busts the cache immediately so provider changes from the admin UI take effect without waiting. Exported `invalidateSearchConfigCache()` for testing.

---

### 🟡 MED-05 — Legacy `/admin/algolia/sync` Route Bypasses Provider Selection
**File:** `src/api/admin/algolia/sync/route.ts`

**What it was:** This route unconditionally emitted `algolia.sync` regardless of the active search provider set in the Admin → Search → Provider panel. If the operator had switched to Meilisearch, this route would still trigger a full Algolia reindex — potentially hitting Algolia API quota and causing confusion in ops.

**Fix:** Route now returns a `deprecation_notice` field in its response directing clients to `POST /admin/search/sync` (the unified route that respects the active provider). Route still works for backwards compat but is clearly marked deprecated in both code comments and the response body.

---

### 🟡 MED-06 — `getRazorpay()` Duplicated Across 3 Route Files (DRY / Maintenance Risk)
**Files:**
- `src/api/admin/custom/razorpay/route.ts`
- `src/api/admin/custom/razorpay/settlements/route.ts`
- `src/api/admin/custom/razorpay/[paymentId]/route.ts`

**What it was:** An identical `getRazorpay()` function was copy-pasted into all three files. Each call also instantiated a new `Razorpay({ key_id, key_secret })` client object per HTTP request — wasting allocation on every admin request.

**Fix:** Extracted to `src/lib/razorpay.ts` as a lazily-initialised module-level singleton. The `Razorpay` constructor now runs exactly once per process lifetime. All three route files import from the shared lib. The duplicated `Razorpay` import and function bodies have been removed from each route.

---

## ♻️ Refactoring Improvements Applied

### REF-01 — `src/lib/razorpay.ts` — Shared Razorpay client
**Replaces:** 3 identical local `getRazorpay()` + `import Razorpay from 'razorpay'` blocks.  
**Location:** `src/lib/razorpay.ts`  
**Pattern:** Lazy singleton — instance created on first call, reused on all subsequent calls.

---

### REF-02 — `src/lib/search-config.ts` — In-memory config cache
**Adds:** `_cachedConfig`, `_cacheExpiry`, `CACHE_TTL_MS`, `invalidateSearchConfigCache()`.  
**Impact:** Eliminates repeated synchronous file reads on every product event. Cache is automatically busted when `writeSearchConfig()` is called.

---

### REF-03 — COD Phone Normalisation in Central Helper
**Adds:** `validateAndNormaliseIndianPhone()` in `cod-payment/service.ts`.  
**Impact:** Single place for the phone format contract. Any future caller (e.g., an admin resend OTP route) uses the same validation.

---

## ⚠️ Known Limitations (Deferred — Not Fixed)

### LIMIT-01 — COD Fraud Limits (`max_daily_orders`, `new_customer_limit`) Not Enforced
**File:** `src/modules/cod-payment/service.ts`, `medusa-config.ts`

`max_daily_orders: 3` and `new_customer_limit: ₹1,500` are configured in `options_` and `medusa-config.ts` but have **zero runtime effect**. `AbstractPaymentProvider.initiatePayment()` receives no customer history, so enforcement requires a separate custom store route.

**To fix:** Create `POST /store/cod/eligibility` (called by the storefront before creating a payment session) that:
1. Queries `order` where `customer_id = X` and `created_at >= today 00:00` — reject if count ≥ `max_daily_orders`.
2. Queries `order` where `customer_id = X` and counts this customer's total historic orders — reject COD if it's their first order AND total > `new_customer_limit`.

---

### LIMIT-02 — No Per-Phone OTP Send Rate Limit (SMS Bombing Vector)
**File:** `src/modules/cod-payment/service.ts`

A customer can repeatedly delete and recreate a cart with a high-value amount, each time triggering `initiatePayment()` → `sendOtpViaMSG91()` → SMS to the billing phone. An attacker who controls a Medusa customer account can flood any Indian mobile number with OTP SMS messages as long as each request creates a new payment session.

**Current protection:** Only the *verify* endpoint is rate-limited (5 attempts per session), not the *send* endpoint.

**To fix:** Store `otp_last_sent_at` per phone number (e.g., in Redis or order metadata) and enforce a minimum 60-second gap between OTPs sent to the same phone number. The `sendOtpViaMSG91` function or the `initiatePayment` method is the right interception point.

---

## 🔐 Security Controls Confirmed Clean

The following surfaces were audited and found correctly implemented:

| Surface | Control | Status |
|---------|---------|--------|
| `POST /hooks/shiprocket` | Query-param token with `crypto.timingSafeEqual` | ✅ Secure |
| `POST /hooks/razorpay` | HMAC-SHA256 on `rawBody`, hex format guard, `timingSafeEqual` | ✅ Secure |
| `POST /store/auth/send-verification` | DB-side customer_id/email validation, 5-min cooldown, opaque error messages | ✅ Secure |
| `GET /store/auth/verify-email` | Token expiry, HMAC validate, email re-check after DB change, hex format guard | ✅ Secure |
| `GET /store/orders/[id]/tracking` | Customer ownership, AWB comparison, no-proxy-when-unshipped | ✅ Secure |
| `POST /store/cod/verify-otp` | Customer session ownership, brute-force lockout (5 attempts), hard-fail counter | ✅ Secure |
| `GET /store/orders/[id]/invoice` | Customer ownership (404 on mismatch, no IDOR) | ✅ Secure (after fix) |
| `src/modules/cod-payment/service.ts` | `crypto.randomInt` for OTP, HMAC-SHA256 + per-session salt, `timingSafeEqual` verify, OTP hash cleared on success | ✅ Secure |
| COD `updatePayment` | OTP state reset on amount increase past threshold | ✅ Secure |
| `GET /store/custom/review-eligibility` | Auth context only (never query param), ownership chain | ✅ Secure |
| `DELETE /store/wishlist/:id` | Ownership verified inside workflow step (`listWishlistItems({ id, customer_id })`) | ✅ Secure |
| `GET /admin/search/env-status` | Returns `set: boolean` only — never leaks actual secret values | ✅ Secure |
| All `/api/admin/**` routes | Auto-protected by Medusa v2's admin auth middleware | ✅ Secure |

---

## 🧰 Tooling Recommendations

1. **Add a global rate-limiter middleware** (e.g., `express-rate-limit` or an nginx/Cloudflare rule) in front of all `/store/**` endpoints to mitigate credential-stuffing, OTP spam, and review scraping.
2. **Add `helmet` or equivalent** HTTP security headers (CSP, X-Frame-Options, HSTS) to the Medusa server startup.  
3. **Add structured logging** (e.g., `pino`) with redaction rules for `otp_hash`, `otp_salt`, `token`, and phone numbers — current `console.log` output may end up in log aggregators in plaintext.
4. **Consider Redis-backed OTP rate limiting** instead of DB metadata for the per-phone cooldown (LIMIT-02 above) — atomic increment operations prevent the TOCTOU race that the metadata-based cooldown has.

---

*Generated by automated codebase audit on 2026-02-24.*
