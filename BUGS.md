# Vridhira Backend — Bug & Vulnerability Tracker
> Living document — update after every audit cycle or code change  
> Format: each entry has STATUS, SEVERITY, DESCRIPTION, ROOT CAUSE, FIX, and TEST CASE

---

## Status Legend
| Status | Meaning |
|---|---|
| 🔴 OPEN | Not yet fixed |
| 🟡 IN_PROGRESS | Fix in development |
| 🟢 FIXED | Fix deployed and verified |
| ⚪ WONTFIX | Accepted risk, documented |
| 🔵 NEEDS_VERIFY | Fix deployed, awaiting pen-test confirmation |

---

## Active Bugs & Vulnerabilities

---

### BUG-001 — Meilisearch Master Key in Production
| Field | Value |
|---|---|
| **Status** | � NEEDS_VERIFY |
| **Severity** | Critical |
| **Type** | Security / Misconfiguration |
| **File** | `src/modules/meilisearch/service.ts`, `medusa-config.ts` |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
`MEILISEARCH_API_KEY` is configured with the master key. If this key leaks, an attacker gains full administrative control over Meilisearch including index deletion and API key creation.

**Root Cause:**  
Initial setup used master key for convenience. No scoped key was created.

**Fix Applied:**  
1. `src/modules/meilisearch/service.ts` — added startup guard: calls `getKeys()` on init; if it succeeds (master/admin key), throws `MedusaError` in production and `console.warn` in dev.
2. `src/scripts/create-meilisearch-scoped-key.ts` — one-time setup script that creates a scoped key via master key with `documents.add/get/delete`, `indexes.search/update` on the products index only.
3. `medusa-config.ts` — updated comment to document required permissions and setup steps.

**Remaining Action:**  
Run the setup script in each environment and update `MEILISEARCH_API_KEY` in `.env`:
```bash
# Add MEILISEARCH_MASTER_KEY to .env temporarily, then:
yarn medusa exec ./src/scripts/create-meilisearch-scoped-key.ts
# Copy printed key → MEILISEARCH_API_KEY in .env
# Remove MEILISEARCH_MASTER_KEY from .env
```

**Verification Test:**  
```bash
# Scoped key must be rejected for admin operations
curl -X DELETE "http://<HOST>/indexes/products" \
  -H "Authorization: Bearer <SCOPED_KEY>"
# Expected: {"message":"The provided API key is invalid.","code":"invalid_api_key"} HTTP 403

# Server startup log must NOT contain the ⚠️ master-key warning
```

**Resolution Date:** 2026-02-25  
**Fixed In Commit:** `78a633f`

---

### BUG-002 — Shiprocket Webhook Token Exposed in Server Logs
| Field | Value |
|---|---|
| **Status** | 🔴 OPEN |
| **Severity** | Critical |
| **Type** | Security / Information Disclosure |
| **File** | `src/api/hooks/shiprocket/route.ts` |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
The `SHIPROCKET_WEBHOOK_TOKEN` is passed as a query parameter (`?token=...`) which gets logged by Nginx, ALBs, CDNs, and Sentry. Anyone with log access can forge delivery webhooks.

**Root Cause:**  
Shiprocket's default webhook documentation uses a query token. The implementation followed the documentation without considering log exposure.

**Fix:**  
Switch to a custom header (`X-Webhook-Token`) if Shiprocket supports it. Add Nginx log filter to strip the token from access logs as interim mitigation.

**Nginx Interim Mitigation:**
```nginx
# In nginx.conf — strip token from logged URI
log_format webhook_safe '$remote_addr - [$time_local] "$request_no_token" $status';
map $request_uri $request_no_token {
  ~^(?P<path>/hooks/shiprocket)[?&]token=[^&]* "$path?token=[REDACTED]";
  default $request_uri;
}
```

**Resolution Date:** —  
**Fixed In Commit:** —

---

### BUG-003 — Cart Completion Double-Submit Race Condition
| Field | Value |
|---|---|
| **Status** | 🔴 OPEN |
| **Severity** | Critical |
| **Type** | Logic / Race Condition |
| **File** | `src/api/store/carts/[id]/complete/route.ts` |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
`POST /store/carts/:id/complete` has no distributed lock or idempotency mechanism. Rapid double-submission (user double-click, network retry) can create duplicate orders.

**Root Cause:**  
No idempotency layer at the cart completion endpoint. Medusa core does not handle this at the framework level for custom flows.

**Fix:**  
Add Redis `SET NX EX` lock on `cart:completing:<cartId>` before processing. Release after completion or on error.

**Verification Test:**
```typescript
// Send two simultaneous completion requests
const [r1, r2] = await Promise.all([
  fetch(`/store/carts/${cartId}/complete`, { method: 'POST', headers }),
  fetch(`/store/carts/${cartId}/complete`, { method: 'POST', headers }),
]);
// One should be 200, other should be 409
const statuses = [r1.status, r2.status].sort();
assert.deepEqual(statuses, [200, 409]);
```

**Resolution Date:** —  
**Fixed In Commit:** —

---

### BUG-004 — No Rate Limiting on Login/Password Reset Endpoints
| Field | Value |
|---|---|
| **Status** | 🔴 OPEN |
| **Severity** | High |
| **Type** | Security / Missing Control |
| **File** | `src/api/middlewares.ts` |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
`POST /auth/customer/emailpass` and `POST /auth/customer/emailpass/reset-password` have no rate limiting. Allows credential stuffing and password reset spam.

**Root Cause:**  
Rate limiting was implemented for COD OTP but not applied to auth endpoints.

**Fix:**  
Add `express-rate-limit` with Redis store on auth routes. Limit: 10 attempts per 15 minutes per IP.

**Resolution Date:** —  
**Fixed In Commit:** —

---

### BUG-005 — Refund Email Silent Failure (take:500 Cap)
| Field | Value |
|---|---|
| **Status** | 🔴 OPEN |
| **Severity** | High |
| **Type** | Logic / Data Truncation |
| **File** | `src/subscribers/webhooks-handler.ts` |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
The `handleRefundProcessed()` function queries only the first 500 Razorpay payments from the last 6 months. Stores processing >500 orders in 6 months will silently fail to send refund emails.

**Root Cause:**  
Static `take: 500` was used as a quick implementation shortcut. No pagination loop.

**Fix:**  
Implement cursor-based pagination to scan all payments until the matching `razorpay_payment_id` is found.

**Resolution Date:** —  
**Fixed In Commit:** —

---

### BUG-006 — COD OTP Rate Limiting Bypassed on Redis Outage
| Field | Value |
|---|---|
| **Status** | 🔴 OPEN |
| **Severity** | High |
| **Type** | Security / Fail-Open |
| **File** | `src/modules/cod-payment/index.ts` |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
If Redis is unavailable, the 60-second OTP rate limit is skipped entirely. Enables SMS bombing of any Indian phone number at Vridhira's expense.

**Root Cause:**  
Design decision to prioritize checkout availability over rate limit enforcement. No secondary fallback was implemented.

**Fix:**  
Add in-memory Map as fallback rate limiter for Redis-down scenarios.

**Resolution Date:** —  
**Fixed In Commit:** —

---

### BUG-007 — Google OAuth Missing CSRF State Parameter
| Field | Value |
|---|---|
| **Status** | 🟡 IN_PROGRESS — Needs Verification |
| **Severity** | High |
| **Type** | Security / CSRF |
| **File** | OAuth plugin configuration |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
No documented CSRF `state` parameter validation in the Google OAuth callback flow. Verify in Medusa Google OAuth plugin source code.

**Root Cause:**  
May be handled internally by the Medusa plugin — requires code inspection to confirm.

**Fix:**  
Inspect `medusa-plugin-google-auth` (or whichever package is used) to verify `state` is generated and validated. If not, wrap the callback with a custom state middleware.

**Verification Task:**  
```bash
grep -r "state" node_modules/<google-oauth-plugin>/src/
# Should find state parameter generation and validation
```

**Resolution Date:** —  
**Fixed In Commit:** —

---

### BUG-008 — Shiprocket Fulfillment Failure Not Alerted to Admin
| Field | Value |
|---|---|
| **Status** | 🔴 OPEN |
| **Severity** | High |
| **Type** | Logic / Missing Observability |
| **File** | `src/subscribers/order-placed.ts` |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
Shiprocket fulfillment errors are logged but no admin notification is sent. Orders can accumulate in a "placed but not fulfilled" limbo state.

**Root Cause:**  
Fire-and-forget design provides resilience but lacks observability layer.

**Fix:**  
Add admin alert email on Shiprocket fulfillment failure. Add a DB flag `fulfillment_failed: true` on the order metadata so admin panel can surface these orders.

**Resolution Date:** —  
**Fixed In Commit:** —

---

### BUG-009 — Multi-Instance Cache Invalidation Failure
| Field | Value |
|---|---|
| **Status** | 🔴 OPEN |
| **Severity** | High |
| **Type** | Architecture / Scalability |
| **File** | `src/services/shiprocket.ts`, `src/admin/lib/_lib.ts` |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
Shiprocket auth token and GA4 OAuth token are cached in-memory. In clustered deployments, each process refreshes independently, causing redundant API calls and token invalidation races.

**Root Cause:**  
Single-instance architecture assumption baked into the caching design.

**Fix:**  
Move both caches to Redis. Use `SET NX` with TTL to implement atomic token caching.

**Resolution Date:** —  
**Fixed In Commit:** —

---

### BUG-010 — COD Order Cancellation Not Propagated to Shiprocket
| Field | Value |
|---|---|
| **Status** | 🔴 OPEN |
| **Severity** | Medium |
| **Type** | Logic / Missing Integration |
| **File** | `src/subscribers/order-cancelled-email.ts` (or similar) |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
When an order is cancelled in Medusa, Shiprocket is not notified. The courier may still pick up and attempt delivery. Customer receives cancellation email but physical delivery may still occur.

**Root Cause:**  
Order cancellation subscriber only sends email. No Shiprocket cancellation API call.

**Fix:**  
Add Shiprocket order cancellation call to the `order.canceled` subscriber.

**Resolution Date:** —  
**Fixed In Commit:** —

---

### BUG-011 — Duplicate Product Reviews Allowed
| Field | Value |
|---|---|
| **Status** | 🔴 OPEN |
| **Severity** | Low |
| **Type** | Logic / Missing Constraint |
| **File** | `src/modules/product-review/` |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
A verified buyer can submit unlimited reviews for the same product. Each goes into "pending" and requires admin rejection.

**Root Cause:**  
No database unique constraint on `(customer_id, product_id)`.

**Fix:**  
Add unique constraint at DB migration level. Add duplicate check in the API before insert.

**Resolution Date:** —  
**Fixed In Commit:** —

---

### BUG-012 — No Request Body Size Limits
| Field | Value |
|---|---|
| **Status** | 🔴 OPEN |
| **Severity** | Medium |
| **Type** | Security / DoS |
| **File** | `medusa-config.ts` or custom middleware |
| **Discovered** | 2026-02-25 |
| **Assigned** | — |

**Description:**  
No body size limits configured. Allows memory exhaustion DoS attacks via large POST bodies.

**Root Cause:**  
Default Express.js configuration. Not explicitly set anywhere.

**Fix:**  
Add `express.json({ limit: '100kb' })` globally and `express.raw({ limit: '1mb' })` for webhook routes only.

**Resolution Date:** —  
**Fixed In Commit:** —

---

## Closed / Verified Good

| ID | Title | Status | Notes |
|---|---|---|---|
| — | COD OTP HMAC with timingSafeEqual | ✅ No Bug | Correctly implemented |
| — | Razorpay HMAC signature verification | ✅ No Bug | Raw body + timingSafeEqual correct |
| — | customer_id from auth_context (IDOR prevention) | ✅ No Bug | Never from request body |
| — | Startup guard for weak JWT/Cookie secrets | ✅ No Bug | Throws on boot with defaults |
| — | Shiprocket webhook fail-closed (no token = reject all) | ✅ No Bug | Correct |
| — | OTP plaintext never stored | ✅ No Bug | HMAC hash only |
| — | OTP hash + salt cleared after use | ✅ No Bug | Prevents replay |
| — | Review display_name from auth_context only | ✅ No Bug | Spoof prevention correct |
| — | requireVerifiedPurchase middleware | ✅ No Bug | Correct verification chain |
| — | Ownership checks on orders/invoices/tracking | ✅ No Bug | auth_context match |

---

## Metrics

| Metric | Count |
|---|---|
| Total Issues Found | 12 |
| Critical (P0) | 3 |
| High (P1) | 5 |
| Medium (P2) | 3 |
| Low (P3) | 1 |
| Fixed | 0 |
| Needs Verify | 1 |
| In Progress | 1 |
| Open | 10 |

*Last updated: 2026-02-25*
