# Vridhira Marketplace — Event & Handler Reference

**Every system event, what triggers it, and exactly how it is handled.**  
Stack: MedusaJS v2 · PostgreSQL · Redis · Razorpay · Shiprocket · MSG91 · Resend · Algolia / Meilisearch · GA4  
Last updated: February 25, 2026

---

## Table of Contents

1. [Auth Events](#1-auth-events)
2. [Product / Catalogue Events](#2-product--catalogue-events)
3. [Cart Events](#3-cart-events)
4. [Checkout Events — Razorpay](#4-checkout-events--razorpay)
5. [Checkout Events — COD](#5-checkout-events--cod)
6. [Order Events](#6-order-events)
7. [Shipment Events (Shiprocket Webhooks)](#7-shipment-events-shiprocket-webhooks)
8. [Post-Delivery Events](#8-post-delivery-events)
9. [Payment Events — Razorpay Webhooks](#9-payment-events--razorpay-webhooks)
10. [GA4 Analytics Events](#10-ga4-analytics-events)
11. [Admin / Background Events](#11-admin--background-events)
12. [Error & Edge-Case Events](#12-error--edge-case-events)

---

## 1. Auth Events

### `customer.registered`
| | |
|---|---|
| **Trigger** | `POST /auth/customer/emailpass/register` |
| **Handler** | `auth-password-reset.ts` subscriber |
| **What happens** | Medusa creates the customer record. The subscriber fires and Resend sends an email verification link. |
| **File** | `src/subscribers/auth-password-reset.ts` |

### `customer.login` (email/password)
| | |
|---|---|
| **Trigger** | `POST /auth/customer/emailpass` |
| **Handler** | Medusa core auth module |
| **What happens** | Credentials validated against hashed password in DB. Returns a signed JWT (`JWT_SECRET`). Session cookie also set if configured. |
| **Security** | `JWT_SECRET` and `COOKIE_SECRET` must not be default placeholder values — startup guard in `medusa-config.ts` throws on boot if they are. |

### `customer.login` (Google OAuth)
| | |
|---|---|
| **Trigger** | `GET /auth/customer/google` → user completes Google consent → `GET /auth/customer/google/callback?code=...` |
| **Handler** | Medusa Google OAuth plugin |
| **What happens** | Authorization code exchanged for Google profile. Existing customer matched by email or new customer created. JWT issued, session cookie set. Redirects to `GOOGLE_CALLBACK_URL`. |
| **Env vars** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |

### `customer.password_reset_requested`
| | |
|---|---|
| **Trigger** | `POST /auth/customer/emailpass/reset-password` with `{ email }` |
| **Handler** | `auth-password-reset.ts` subscriber |
| **What happens** | Medusa generates a signed reset token. Subscriber fires, Resend sends the password reset email with the token embedded in the link. |

### `customer.password_updated`
| | |
|---|---|
| **Trigger** | `POST /auth/customer/emailpass/update-password` with `{ token, password }` |
| **Handler** | Medusa core auth module |
| **What happens** | Token verified, new password hashed and stored. Previous sessions may be invalidated depending on Medusa JWT configuration. |

---

## 2. Product / Catalogue Events

### `product.created`
| | |
|---|---|
| **Trigger** | Admin creates a product via Medusa Admin or API |
| **Handler** | `src/subscribers/product-sync.ts` |
| **What happens** | Subscriber fires `sync-products.ts` workflow (Algolia) or `sync-products-meilisearch.ts` workflow (Meilisearch) depending on `SEARCH_ENGINE` env var. The product is indexed so it appears in storefront search. |
| **Files** | `src/subscribers/product-sync.ts`, `src/workflows/sync-products.ts`, `src/workflows/sync-products-meilisearch.ts` |

### `product.updated`
| | |
|---|---|
| **Trigger** | Admin edits any field on an existing product |
| **Handler** | `src/subscribers/product-sync.ts` |
| **What happens** | Same sync workflow as `product.created` — the search index record is upserted with the new data. |

### `product.deleted`
| | |
|---|---|
| **Trigger** | Admin deletes a product |
| **Handler** | `src/subscribers/product-delete.ts` |
| **What happens** | Fires `delete-products-from-algolia.ts` or `delete-products-from-meilisearch.ts` workflow. The product is removed from the search index so it no longer appears in storefront search results. |
| **Files** | `src/subscribers/product-delete.ts`, `src/workflows/delete-products-from-algolia.ts`, `src/workflows/delete-products-from-meilisearch.ts` |

### `product.manual_reindex` (admin action)
| | |
|---|---|
| **Trigger** | Admin calls `POST /admin/algolia/sync` from the Search Engine Manager widget |
| **Handler** | Admin API route handler |
| **What happens** | Full paginated upsert of all products into the active search engine. Used to recover from index drift or after bulk catalogue imports. |

---

## 3. Cart Events

### `cart.created`
| | |
|---|---|
| **Trigger** | `POST /store/carts` (customer clicks "add to cart" for the first time) |
| **Handler** | Medusa core |
| **What happens** | Empty cart created in DB. If customer is authenticated, `customer_id` is associated. Returns `cart.id` for all subsequent calls. |

### `cart.item_added`
| | |
|---|---|
| **Trigger** | `POST /store/carts/:id/line-items` with `{ variant_id, quantity }` |
| **Handler** | Medusa core + GA4 plugin |
| **What happens** | Line item added to cart. Inventory is NOT reserved yet (reservation happens at order placement). GA4 fires `add_to_cart` event via Measurement Protocol. |

### `cart.item_updated`
| | |
|---|---|
| **Trigger** | `PUT /store/carts/:id/line-items/:lineId` with `{ quantity }` |
| **Handler** | Medusa core |
| **What happens** | Line item quantity updated. Cart totals recalculated. If the cart has an active COD payment session and the new total crosses the OTP threshold in either direction, `updatePayment()` is triggered on the COD provider. |

### `cart.item_removed`
| | |
|---|---|
| **Trigger** | `DELETE /store/carts/:id/line-items/:lineId` |
| **Handler** | Medusa core + GA4 plugin |
| **What happens** | Item removed from cart. GA4 fires `remove_from_cart`. Cart totals recalculated. |

### `cart.shipping_method_selected`
| | |
|---|---|
| **Trigger** | `POST /store/carts/:id/shipping-methods` with `{ option_id }` |
| **Handler** | Medusa core + GA4 plugin |
| **What happens** | Shipping option attached to cart and shipping cost added to totals. GA4 fires `add_shipping_info`. |

### `cart.payment_session_initiated`
| | |
|---|---|
| **Trigger** | `POST /store/carts/:id/payment-sessions` with `{ provider_id }` |
| **Handler** | Medusa core routes to the chosen payment provider |
| **What happens** | See §4 (Razorpay) or §5 (COD) for full details. GA4 fires `add_payment_info`. |

---

## 4. Checkout Events — Razorpay

### `razorpay.session_initiated`
| | |
|---|---|
| **Trigger** | `POST /store/carts/:id/payment-sessions` with `provider_id: "pp_razorpay_razorpay"` |
| **Handler** | `medusa-plugin-razorpay-v2` — `initiatePayment()` |
| **What happens** | Plugin calls Razorpay API to create an Order. `razorpay_order_id` stored in payment session data. Frontend opens the Razorpay JS SDK modal. |

### `razorpay.payment_succeeded` (frontend)
| | |
|---|---|
| **Trigger** | Customer completes payment in the Razorpay modal (UPI / card / net banking / wallet) |
| **Handler** | Razorpay JS SDK returns success → frontend calls `POST /store/carts/:id/complete` |
| **What happens** | Medusa completes the cart, fires `order.placed`. See §6. |

### `razorpay.payment_failed` (frontend)
| | |
|---|---|
| **Trigger** | Customer's payment fails in the Razorpay modal |
| **Handler** | Frontend |
| **What happens** | Error shown to customer. They may retry the same session or choose a different payment method. No backend state change — the cart and payment session remain open. |

---

## 5. Checkout Events — COD

### `cod.session_initiated`
| | |
|---|---|
| **Trigger** | `POST /store/carts/:id/payment-sessions` with `provider_id: "pp_cod_cod"` |
| **Handler** | `CodPaymentService.initiatePayment()` — `src/modules/cod-payment/` |
| **What happens** | Full validation chain: <br>1. Currency must be INR — hard failure otherwise. <br>2. Amount checked: below ₹100 → rejected; above ₹50,000 → rejected. <br>3. If amount < `otp_threshold` (₹2,500): session set to `{ otp_required: false }`, proceed immediately. <br>4. If amount ≥ `otp_threshold`: phone resolved from customer or address → validated as Indian mobile number → Redis rate-limit checked (1 OTP per phone per 60 seconds) → 6-digit OTP generated via `crypto.randomInt` → HMAC-SHA256(salt, otp) stored (plaintext never persisted) → SMS sent via MSG91. |
| **Fail-closed rules** | MSG91 API failure → checkout blocked (silent bypass = fraud vector). Redis down → warning logged, flow continues (Redis outage doesn't block checkout). Missing phone → hard error. |

### `cod.otp_submitted`
| | |
|---|---|
| **Trigger** | Customer submits OTP: `POST /store/cod/verify-otp` with `{ payment_session_id, otp }` |
| **Handler** | `src/api/store/cod/verify-otp/route.ts` → `CodPaymentService.verifyOtp()` |
| **What happens** | Validation chain: <br>1. Input validated: `payment_session_id` max 200 chars, `otp` exactly `/^\d{6}$/`. <br>2. Payment session fetched, `provider_id` confirmed as COD. <br>3. Ownership check: `cart.customer_id` must equal `auth_context.actor_id` — prevents cross-customer OTP exhaustion. <br>4. Attempt count checked: ≥ 5 attempts → 429 locked. <br>5. Expiry checked: `Date.now() > otp_expires_at` → 400 expired. <br>6. `timingSafeEqual(HMAC(salt, trimmedOtp), storedHash)` — constant-time, length-safe comparison. <br>7. On success: `otp_verified: true`, hash and salt cleared from session data. <br>8. On failure: `otp_attempts` incremented, persisted to DB, remaining attempts shown. |

### `cod.otp_expired`
| | |
|---|---|
| **Trigger** | Customer submits OTP after the 10-minute window |
| **Handler** | `CodPaymentService.verifyOtp()` |
| **What happens** | Returns 400 "OTP expired". Customer must restart checkout (which creates a new session and sends a new OTP). |

### `cod.session_locked`
| | |
|---|---|
| **Trigger** | 5 consecutive wrong OTP attempts |
| **Handler** | `CodPaymentService.verifyOtp()` |
| **What happens** | Returns 429 "session locked, restart checkout". Customer must start a new payment session to receive a fresh OTP. This prevents brute-force attacks on the 6-digit space (10⁶ possibilities). |

### `cod.cart_amount_changed_after_otp`
| | |
|---|---|
| **Trigger** | Customer edits cart (add/remove/update items) after OTP was verified, crossing the threshold |
| **Handler** | `CodPaymentService.updatePayment()` |
| **What happens** | If new amount ≥ threshold: `otp_verified` reset to `false`, hash/salt cleared, attempt counter reset — frontend must re-prompt for OTP. <br>If new amount drops below threshold: `otp_required` set to `false` — OTP no longer needed. |

### `cod.payment_authorized`
| | |
|---|---|
| **Trigger** | `POST /store/carts/:id/complete` after OTP verified (or not required) |
| **Handler** | `CodPaymentService.authorizePayment()` |
| **What happens** | If `otp_required && !otp_verified` → throws error, blocks order. Otherwise sets payment status to `"authorized"`. Cash is NOT collected yet — capture happens on delivery. |

---

## 6. Order Events

### `order.placed`
| | |
|---|---|
| **Trigger** | `POST /store/carts/:id/complete` — cart successfully converted to order |
| **Handler** | Three things fire in parallel: |
| **1. Confirmation email** | `src/subscribers/order-placed-email.ts` → `sendOrderConfirmationWorkflow` → Resend API → React Email template with order summary, line items, totals, and shipping address. |
| **2. GA4 purchase event** | `@variablevic/google-analytics-medusa` plugin → `purchase` event via Measurement Protocol with `transaction_id`, `value`, `currency`, `items[]`. |
| **3. Shiprocket fulfillment** | `src/subscribers/order-placed.ts` (fire-and-forget — errors logged, do NOT fail the order) → `createOrderFulfillmentWorkflow` → `ShiprocketFulfillmentProvider.createFulfillment()` → three sequential Shiprocket API calls: create adhoc order, assign AWB, generate pickup. |
| **Files** | `src/subscribers/order-placed-email.ts`, `src/subscribers/order-placed.ts`, `src/workflows/send-order-confirmation.ts` |

### `order.canceled`
| | |
|---|---|
| **Trigger** | Admin cancels order via Medusa Admin |
| **Handler** | `src/subscribers/order-cancelled-email.ts` |
| **What happens** | Subscriber fires `sendOrderCancelledWorkflow` → Resend sends cancellation email to customer. |
| **File** | `src/subscribers/order-cancelled-email.ts`, `src/workflows/send-order-cancelled.ts` |

### `order.fulfillment_delivered`
| | |
|---|---|
| **Trigger** | `markOrderFulfillmentAsDeliveredWorkflow` inside the Shiprocket "delivered" webhook handler |
| **Handler** | Medusa core fires the event; `order-delivered-email.ts` subscriber listens |
| **What happens** | Subscriber checks `shiprocket_email_delivered_at` metadata — if already set (by the webhook handler before firing this event), email is skipped to prevent duplicates. If not set, `sendOrderDeliveredWorkflow` → Resend sends delivered email with review CTA. |
| **Note** | Metadata timestamp is written **before** `markOrderFulfillmentAsDeliveredWorkflow` fires, so the idempotency guard is always in place when the event arrives. |

---

## 7. Shipment Events (Shiprocket Webhooks)

All events arrive at `POST /hooks/shiprocket?token=<SHIPROCKET_WEBHOOK_TOKEN>`.

### Token Verification (all events)
| | |
|---|---|
| **Handler** | `src/api/hooks/shiprocket/route.ts` |
| **Mechanism** | `SHIPROCKET_WEBHOOK_TOKEN` must be set — if absent, ALL requests are rejected with `{ received: false }` (fail-closed: unset token = fully open webhook). Token extracted safely from query string (array-safe first-element extraction). `timingSafeEqual` comparison — lengths checked first, then byte-by-byte. 401 on mismatch. |

### `shiprocket.shipped`
| | |
|---|---|
| **Trigger** | Shiprocket dispatches order, status becomes `"shipped"` |
| **Handler** | `src/subscribers/webhooks-handler.ts` |
| **What happens** | 1. AWB presence verified. <br>2. `sendOrderShippedWorkflow` → Resend email (guarded by `shiprocket_email_shipped_at` metadata). <br>3. `createOrderShipmentWorkflow` — Medusa fulfillment status set to `"Shipped"`. <br>4. Metadata updated: `shiprocket_status`, `shiprocket_awb`, `shiprocket_courier`, `shiprocket_tracking_url`, `shiprocket_email_shipped_at`. |
| **File** | `src/workflows/send-order-shipped.ts` |

### `shiprocket.in_transit`
| | |
|---|---|
| **Trigger** | Status becomes `"in transit"` or `"in-transit"` (Shiprocket casing is inconsistent — all comparisons are `.toLowerCase().trim()`) |
| **Handler** | `src/subscribers/webhooks-handler.ts` |
| **What happens** | `sendOrderInTransitWorkflow` with `current_city` → Resend email (guarded by `shiprocket_email_in_transit_at`). Metadata updated. No native Medusa state change for this status. |
| **File** | `src/workflows/send-order-in-transit.ts` |

### `shiprocket.out_for_delivery`
| | |
|---|---|
| **Trigger** | Status becomes `"out for delivery"` or `"out_for_delivery"` |
| **Handler** | `src/subscribers/webhooks-handler.ts` |
| **What happens** | `sendOrderOutForDeliveryWorkflow` → Resend email (guarded by `shiprocket_out_for_delivery_at`). Metadata updated. |
| **File** | `src/workflows/send-order-out-for-delivery.ts` |

### `shiprocket.delivered`
| | |
|---|---|
| **Trigger** | Status becomes `"delivered"` |
| **Handler** | `src/subscribers/webhooks-handler.ts` |
| **What happens** | Sequence is order-critical: <br>1. `updateTrackingMetadata` — writes `shiprocket_delivered_at` + `shiprocket_email_delivered_at` **first**. <br>2. `sendOrderDeliveredWorkflow` → Resend delivered email with review CTA. <br>3. `markOrderFulfillmentAsDeliveredWorkflow` — Medusa order → `Completed`, fulfillment → `Delivered`. <br>4. COD only: `capturePaymentWorkflow` on any uncaptured COD payment → status `"Captured"` (records cash collected). |
| **File** | `src/workflows/send-order-delivered.ts` |

### `shiprocket.other_status`
| | |
|---|---|
| **Trigger** | Any other `current_status` value not in the handled set |
| **Handler** | `src/subscribers/webhooks-handler.ts` |
| **What happens** | Logged and acknowledged with `{ received: true }`. No action taken. Acknowledgment prevents Shiprocket from retrying. |

### Webhook Idempotency (all email-sending events)
Each email event is guarded by a metadata timestamp written on first successful send:

| Email | Metadata key |
|---|---|
| Shipped | `shiprocket_email_shipped_at` |
| In Transit | `shiprocket_email_in_transit_at` |
| Out for Delivery | `shiprocket_email_out_for_delivery_at` |
| Delivered | `shiprocket_email_delivered_at` |

If Shiprocket retries a webhook (network timeout, delivery failure), the flag is already set → email skipped → no duplicate sent.

---

## 8. Post-Delivery Events

### `review.submitted`
| | |
|---|---|
| **Trigger** | `POST /store/product-reviews` with `{ product_id, rating, content }` — auth required |
| **Handler** | `requireVerifiedPurchase` middleware → review handler |
| **What happens** | Middleware verifies: `customer_id` from `auth_context` (never from request body) → queries all orders with `fulfillment_status: delivered` for this customer → checks `order.items` contains the `product_id`. 403 if no qualifying order found. On pass: `display_name` injected from `auth_context` (cannot be spoofed by request body). Review created with status `"pending"`. |
| **Note** | Admin must approve before review becomes public (`defaultReviewStatus: "pending"` in `medusa-config.ts`). |

### `review.approved` (admin action)
| | |
|---|---|
| **Trigger** | Admin approves review in Medusa Admin |
| **Handler** | Medusa review module |
| **What happens** | Review status set to `"published"` — becomes visible on the product page. |

### `invoice.requested`
| | |
|---|---|
| **Trigger** | `GET /store/orders/:id/invoice` — auth required |
| **Handler** | `@rsc-labs/medusa-documents-v2` plugin |
| **What happens** | Auth check + ownership check (`order.customer_id === auth_context.actor_id`). PDF generated and streamed to the client. Store address configured once in Admin › Documents › Settings. |

### `tracking.requested`
| | |
|---|---|
| **Trigger** | `GET /store/orders/:id/tracking` — auth required |
| **Handler** | Store API route with ownership check |
| **What happens** | `order.customer_id === auth_context.actor_id` validated. Returns `{ awb, courier_name, current_status, tracking_url, estimated_delivery }` from order fulfillment metadata. |

---

## 9. Payment Events — Razorpay Webhooks

All arrive at `POST /hooks/razorpay`.

### Signature Verification (all events)
| | |
|---|---|
| **Handler** | `src/api/hooks/razorpay/route.ts` |
| **Mechanism** | 1. `RAZORPAY_WEBHOOK_SECRET` must be set — absent → 500, no handler. <br>2. `req.rawBody` (raw Buffer before body-parser) must be present — absent → 500 (re-serialised JSON is unsafe for HMAC). <br>3. `x-razorpay-signature` validated as exactly 64 lowercase hex characters. <br>4. `timingSafeEqual(HMAC-SHA256(rawBody, secret), receivedSignature)` — constant-time comparison. |

### `payment.authorized`
| | |
|---|---|
| **Trigger** | Razorpay authorises the payment (before capture) |
| **Handler** | `src/subscribers/webhooks-handler.ts` (Razorpay section) |
| **What happens** | Logged. Plugin handles capture automatically. |

### `payment.captured`
| | |
|---|---|
| **Trigger** | Razorpay confirms the payment has been captured (funds moved) |
| **Handler** | `src/subscribers/webhooks-handler.ts` (Razorpay section) |
| **What happens** | Logged. Cart completion / order placement can proceed if not already done. |

### `payment.failed`
| | |
|---|---|
| **Trigger** | Customer's payment attempt fails |
| **Handler** | `src/subscribers/webhooks-handler.ts` (Razorpay section) |
| **What happens** | Logged. Cart and payment session remain open — customer may retry via the storefront. |

### `refund.processed`
| | |
|---|---|
| **Trigger** | Admin issues a refund in Medusa Admin → Razorpay plugin forwards to Razorpay → Razorpay fires this event |
| **Handler** | `src/subscribers/webhooks-handler.ts` → `handleRefundProcessed()` |
| **What happens** | 1. `query.graph` fetches payments where `provider_id = "pp_razorpay_razorpay"` and `created_at >= 6 months ago` (`take: 500`). <br>2. JS `.find()` matches by `razorpay_payment_id` from the webhook payload. <br>3. `payment_collection → order` resolved. <br>4. Latest `return` record on the order found (sorted by `created_at desc`). <br>5. `sendOrderRefundedWorkflow` → Resend sends refund confirmation email. GA4 fires `refund` event. |
| **File** | `src/subscribers/webhooks-handler.ts`, `src/workflows/send-order-refunded.ts` |

---

## 10. GA4 Analytics Events

All events sent server-side via GA4 Measurement Protocol. Required env vars: `GA_MEASUREMENT_ID`, `GA_API_SECRET`.

| GA4 Event | Trigger | Notes |
|---|---|---|
| `view_item` | Customer views a product detail page | Fires from storefront |
| `view_item_list` | Customer scrolls through a product list | Fires from storefront |
| `add_to_cart` | Line item added to cart | `POST /store/carts/:id/line-items` |
| `remove_from_cart` | Line item removed | `DELETE /store/carts/:id/line-items/:lineId` |
| `begin_checkout` | Customer enters checkout | Cart `begin_checkout` trigger |
| `add_shipping_info` | Shipping method selected | `POST /store/carts/:id/shipping-methods` |
| `add_payment_info` | Payment session created | `POST /store/carts/:id/payment-sessions` |
| `purchase` | Order placed | `order.placed` event — `transaction_id`, `value`, `currency`, `items[]` |
| `refund` | Refund issued | `refund.processed` webhook → `sendOrderRefundedWorkflow` |

---

## 11. Admin / Background Events

### `algolia.sync` (manual)
| | |
|---|---|
| **Trigger** | Admin calls `POST /admin/algolia/sync` via Search Engine Manager widget |
| **Handler** | Admin route → `sync-products.ts` workflow |
| **What happens** | Full paginated product upsert into Algolia (or Meilisearch, same endpoint resolves based on `SEARCH_ENGINE`). |

### `ga4.report_requested`
| | |
|---|---|
| **Trigger** | Admin loads any GA4 dashboard tab |
| **Handler** | `GET /admin/custom/ga4` (and sub-routes) → `src/admin/lib/_lib.ts` |
| **What happens** | Service account JSON (`GA_SERVICE_ACCOUNT_KEY`) → RS256-signed JWT → `POST https://oauth2.googleapis.com/token` → Bearer token (cached 55 min, deduplicates concurrent requests via in-flight promise) → `POST https://analyticsdata.googleapis.com/v1beta/properties/:id:runReport` → result cached 15 min per (endpoint, property, days) combination. |

### `shiprocket.token_refresh` (background)
| | |
|---|---|
| **Trigger** | Any call to `ShiprocketService` when the cached token has expired |
| **Handler** | `src/services/shiprocket.ts` |
| **What happens** | `POST https://apiv2.shiprocket.in/v1/external/auth/login` with `SHIPROCKET_EMAIL` + `SHIPROCKET_PASSWORD`. New token cached in-memory. All Shiprocket API calls use this service singleton. |

---

## 12. Error & Edge-Case Events

### `cod.no_phone`
| | |
|---|---|
| **Trigger** | COD session initiated for amount ≥ ₹2,500 but customer has no phone on record |
| **Handler** | `CodPaymentService.initiatePayment()` |
| **What happens** | Hard error thrown: "phone number required for COD above ₹2,500". Checkout blocked until customer adds a phone to their profile or address. |

### `cod.invalid_phone`
| | |
|---|---|
| **Trigger** | Phone on record is a landline or non-Indian number |
| **Handler** | `validateAndNormaliseIndianPhone()` inside `CodPaymentService` |
| **What happens** | Clear error returned. Normalisation accepts `+91XXXXXXXXXX`, `91XXXXXXXXXX`, `XXXXXXXXXX` (10-digit, prefix 6–9). Rejects landlines (prefix 1–5). Output format: `91XXXXXXXXXX` (MSG91 format). |

### `cod.otp_rate_limited`
| | |
|---|---|
| **Trigger** | Customer requests a new OTP within 60 seconds of the last one |
| **Handler** | Redis `SET cod:otp:rl:91XXXXXXXXXX 1 NX EX 60` |
| **What happens** | `SET` returns `null` (key already exists) → "OTP sent recently, please wait 60 seconds". Prevents SMS bombing and carrier abuse. |

### `shiprocket.webhook_no_token`
| | |
|---|---|
| **Trigger** | `SHIPROCKET_WEBHOOK_TOKEN` not set in environment |
| **Handler** | `src/api/hooks/shiprocket/route.ts` |
| **What happens** | All webhook requests rejected with `{ received: false }`. Fail-closed design: an unset token means anyone could forge delivery confirmations. |

### `razorpay.webhook_no_secret`
| | |
|---|---|
| **Trigger** | `RAZORPAY_WEBHOOK_SECRET` not set in environment |
| **Handler** | `src/api/hooks/razorpay/route.ts` |
| **What happens** | All webhook requests rejected with 500. Fail-closed: no secret = no handler, prevents processing unsigned payloads. |

### `razorpay.webhook_missing_raw_body`
| | |
|---|---|
| **Trigger** | Webhook arrives but `req.rawBody` is absent (middleware misconfiguration) |
| **Handler** | `src/api/hooks/razorpay/route.ts` |
| **What happens** | 500 returned. Re-serialised JSON is unsafe for HMAC verification because key ordering and whitespace may differ. Raw buffer required. |

### `serviceability.shiprocket_unconfigured`
| | |
|---|---|
| **Trigger** | `GET /store/shipping/serviceability` called but Shiprocket credentials are placeholder values or missing |
| **Handler** | `src/api/store/shipping/serviceability/route.ts` |
| **What happens** | Returns `{ serviceable: false }` rather than assuming delivery is possible. Fail-closed: prevents orders from being placed for areas that cannot be fulfilled. |

### `startup.insecure_secrets`
| | |
|---|---|
| **Trigger** | Server boot with `JWT_SECRET` or `COOKIE_SECRET` still set to known default/placeholder values |
| **Handler** | `medusa-config.ts` startup guard |
| **What happens** | Server throws and refuses to start. Prevents accidental production deployment with predictable secrets. |

---

## Summary: Event → Handler Map

| Event | Subscriber / Handler | Workflow / Service | Output |
|---|---|---|---|
| `order.placed` | `order-placed-email.ts` | `send-order-confirmation.ts` | Resend email |
| `order.placed` | GA4 plugin | — | GA4 `purchase` |
| `order.placed` | `order-placed.ts` | `createOrderFulfillmentWorkflow` | Shiprocket order + AWB |
| `order.canceled` | `order-cancelled-email.ts` | `send-order-cancelled.ts` | Resend email |
| `order.fulfillment_delivered` | `order-delivered-email.ts` | `send-order-delivered.ts` | Resend email (idempotent) |
| `product.created/updated` | `product-sync.ts` | `sync-products.ts` / `sync-products-meilisearch.ts` | Search index upsert |
| `product.deleted` | `product-delete.ts` | `delete-products-from-algolia.ts` / `delete-products-from-meilisearch.ts` | Search index removal |
| `shiprocket: shipped` | `webhooks-handler.ts` | `send-order-shipped.ts` | Medusa fulfillment + Resend email |
| `shiprocket: in transit` | `webhooks-handler.ts` | `send-order-in-transit.ts` | Resend email + metadata |
| `shiprocket: out for delivery` | `webhooks-handler.ts` | `send-order-out-for-delivery.ts` | Resend email + metadata |
| `shiprocket: delivered` | `webhooks-handler.ts` | `send-order-delivered.ts` + `markOrderFulfillmentAsDeliveredWorkflow` | Order completed + COD captured |
| `razorpay: payment.authorized` | `webhooks-handler.ts` | — | Log |
| `razorpay: payment.captured` | `webhooks-handler.ts` | — | Log |
| `razorpay: payment.failed` | `webhooks-handler.ts` | — | Log |
| `razorpay: refund.processed` | `webhooks-handler.ts` | `send-order-refunded.ts` | Resend email + GA4 `refund` |
| `auth: register` | `auth-password-reset.ts` | — | Resend verification email |
| `auth: password reset` | `auth-password-reset.ts` | — | Resend reset email |

---

*Generated from codebase audit — February 25, 2026*
