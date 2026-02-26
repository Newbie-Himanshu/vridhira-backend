# Vridhira Marketplace — Complete System Flow

**Stack:** MedusaJS v2 · PostgreSQL · Redis · Razorpay · Shiprocket · MSG91 · Resend · Algolia / Meilisearch · GA4  
**Last updated:** February 25, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Customer Visits the Store](#2-customer-visits-the-store)
3. [Authentication](#3-authentication)
4. [Wishlist](#4-wishlist)
5. [Product Detail + Serviceability Check](#5-product-detail--serviceability-check)
6. [Cart](#6-cart)
7. [Checkout — Razorpay](#7-checkout--razorpay)
8. [Checkout — Cash on Delivery (COD)](#8-checkout--cash-on-delivery-cod)
9. [Order Placed Event](#9-order-placed-event)
10. [Shipment Lifecycle](#10-shipment-lifecycle)
11. [Post-Delivery Actions](#11-post-delivery-actions)
12. [Admin Panel](#12-admin-panel)
13. [Full Data Flow Diagram](#13-full-data-flow-diagram)
14. [Environment Variable Reference](#14-environment-variable-reference)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                      Customer Browser                          │
│              (Next.js storefront — separate repo)              │
└────────────────────────┬───────────────────────────────────────┘
                         │ HTTP / REST
┌────────────────────────▼───────────────────────────────────────┐
│              Vridhira Backend  (this repo)                     │
│              MedusaJS v2 · Node.js · TypeScript                │
│                                                                │
│  /store/*    — customer-facing APIs                            │
│  /admin/*    — admin panel APIs                                │
│  /hooks/*    — inbound webhooks (Razorpay, Shiprocket)         │
│  /auth/*     — authentication (email/password, Google OAuth)   │
└──────┬────────────────────────────────────────┬────────────────┘
       │                                        │
┌──────▼──────┐  ┌──────────┐  ┌───────────────▼───────────────┐
│ PostgreSQL  │  │  Redis   │  │       External Services        │
│ (primary DB)│  │(OTP rate │  │  Razorpay · Shiprocket · MSG91 │
│             │  │ limiting)│  │  Resend · Algolia · Meilisearch│
└─────────────┘  └──────────┘  │  Google OAuth · GA4            │
                                └───────────────────────────────┘
```

---

## 2. Customer Visits the Store

### 2.1 Product Browsing

The storefront calls Medusa's standard catalogue APIs:

```
GET /store/products                    → paginated product list
GET /store/products/:id                → single product detail
GET /store/product-categories          → category tree
GET /store/collections                 → collections
```

No authentication required for browsing.

### 2.2 Search

Search bypasses the backend entirely — the frontend queries Algolia or Meilisearch **directly** using a public read-only API key:

```
Algolia:      POST https://<APP_ID>-dsn.algolia.net/1/indexes/<INDEX>/query
Meilisearch:  POST http://<HOST>/indexes/<INDEX>/search
```

**How products stay indexed:**

| Trigger | Subscriber | Workflow |
|---|---|---|
| `product.created` | `product-sync.ts` | `sync-products.ts` or `sync-products-meilisearch.ts` |
| `product.updated` | `product-sync.ts` | same |
| `product.deleted` | `product-delete.ts` | `delete-products-from-algolia.ts` / `delete-products-from-meilisearch.ts` |
| Manual reindex | `POST /admin/algolia/sync` | Full paginated upsert |

Which engine is active is controlled by `SEARCH_ENGINE=algolia|meilisearch` in `.env`, read by `src/lib/search-config.ts` at runtime. Both modules can be registered in `medusa-config.ts` simultaneously.

### 2.3 GA4 Event Tracking

Every storefront action fires a GA4 Measurement Protocol event server-side via `@variablevic/google-analytics-medusa`:

| User action | GA4 event |
|---|---|
| View product | `view_item` |
| Scroll product list | `view_item_list` |
| Add to cart | `add_to_cart` |
| Remove from cart | `remove_from_cart` |
| Enter checkout | `begin_checkout` |
| Add shipping | `add_shipping_info` |
| Add payment | `add_payment_info` |
| Order complete | `purchase` |
| Refund issued | `refund` |

Required env vars: `GA_MEASUREMENT_ID`, `GA_API_SECRET`

---

## 3. Authentication

### 3.1 Email / Password

```
POST /auth/customer/emailpass/register
  body: { email, password, first_name, last_name }
  → creates customer account
  → issues email verification token
  → auth-password-reset.ts subscriber fires
  → Resend sends verification email

POST /auth/customer/emailpass
  body: { email, password }
  → returns { token: "eyJ..." }

All subsequent requests:
  Authorization: Bearer <token>
  or session cookie
```

Password reset:
```
POST /auth/customer/emailpass/reset-password   { email }     → sends reset email
POST /auth/customer/emailpass/update-password  { token, password }  → sets new password
```

### 3.2 Google OAuth

```
GET /auth/customer/google
  → 302 redirect to Google OAuth consent screen

GET /auth/customer/google/callback?code=...
  → exchanges code for Google profile
  → finds existing customer by email OR creates new one
  → returns JWT + sets session cookie
  → redirects to GOOGLE_CALLBACK_URL
```

Required env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`

### 3.3 Security Guards

- All custom store routes that need a customer identity have `authenticate("customer", ["session", "bearer"])` middleware defined in `src/api/middlewares.ts`
- `customer_id` is **always** read from `req.auth_context.actor_id` — never accepted as a query parameter or request body field (prevents IDOR)
- Production startup guard in `medusa-config.ts` rejects default `JWT_SECRET` / `COOKIE_SECRET` values and throws on server start

---

## 4. Wishlist

Requires login. `customer_id` comes exclusively from `auth_context`.

```
GET  /store/wishlist
  → lists all wishlist items for the authenticated customer

POST /store/wishlist
  body: { product_id, variant_id? }
  → runs addToWishlistWorkflow
  → creates WishlistItem linked to customer + product via module links

DELETE /store/wishlist/:id
  → removes the item (ownership verified)
```

Data model: custom `WishlistItem` Medusa module (`src/modules/wishlist/`), linked via `wishlist-customer.ts` and `wishlist-product.ts` module link definitions.

---

## 5. Product Detail + Serviceability Check

Before adding to cart, the storefront optionally checks if the customer's pincode is serviceable:

```
GET /store/shipping/serviceability?pincode=400001&weight=0.5&cod=true
  Authorization: Bearer <token>   ← required
```

**Why login-required?**  
Each call proxies an authenticated Shiprocket API request. An open public endpoint would expose courier contract rate cards and allow anonymous actors to exhaust the Shiprocket API quota, causing checkout failures for real customers.

**Response:**

```json
{
  "success": true,
  "serviceable": true,
  "pincode": "400001",
  "couriers": [
    {
      "name": "BlueDart",
      "rate": 85,
      "estimated_days": 2,
      "cod_available": true
    }
  ]
}
```

**Fail-closed behaviour:** If Shiprocket credentials are missing or use placeholder values, returns `{ serviceable: false }` rather than assuming delivery is possible — prevents orders from being placed for areas that cannot be fulfilled.

---

## 6. Cart

Standard Medusa cart lifecycle:

```
POST /store/carts
  → create empty cart (optionally with customer_id if logged in)

POST /store/carts/:id/line-items
  body: { variant_id, quantity }
  → adds item, fires add_to_cart GA4 event

PUT /store/carts/:id/line-items/:lineId
  body: { quantity }
  → updates quantity

DELETE /store/carts/:id/line-items/:lineId
  → removes item, fires remove_from_cart GA4 event

POST /store/carts/:id/shipping-methods
  body: { option_id }
  → selects a shipping option, fires add_shipping_info GA4 event

POST /store/carts/:id/payment-sessions
  body: { provider_id: "pp_razorpay_razorpay" | "pp_cod_cod" }
  → initialises payment provider session
  → fires add_payment_info GA4 event
```

---

## 7. Checkout — Razorpay

### 7.1 Session Initialisation

```
POST /store/carts/:id/payment-sessions  { provider_id: "pp_razorpay_razorpay" }
```

`medusa-plugin-razorpay-v2` creates a Razorpay Order internally and stores `razorpay_order_id` in the payment session data.

### 7.2 Payment

Frontend opens the Razorpay checkout modal (JS SDK). Customer pays via UPI / card / net banking / wallet.

### 7.3 Webhook — `POST /hooks/razorpay`

Razorpay calls this for every payment lifecycle event.

**Signature verification:**
1. Read `RAZORPAY_WEBHOOK_SECRET` — if absent, reject with `500` (no secret = no handler)
2. Read `req.rawBody` (raw Buffer before body-parser) — if absent, reject with `500` (re-serialized JSON is unsafe for HMAC)
3. Validate that `x-razorpay-signature` is exactly 64 lowercase hex characters
4. `timingSafeEqual(hmac(rawBody, secret), receivedSignature)` — constant-time comparison

**Events handled:**

| Event | Action |
|---|---|
| `payment.authorized` | Logged — plugin handles capture |
| `payment.captured` | Logged — fulfillment can begin |
| `payment.failed` | Logged — customer may retry |
| `refund.processed` | Look up Medusa order → send refund email |

**Refund flow:**
```
refund.processed
  → query.graph(payment, provider_id=pp_razorpay_razorpay, created_at>=6monthsAgo, take:500)
  → JS .find() on results matching razorpay_payment_id
  → payment_collection → order
  → find latest return record on that order (sorted by created_at desc)
  → sendOrderRefundedWorkflow → Resend email
```

### 7.4 Complete Cart

```
POST /store/carts/:id/complete
  → payment captured by plugin
  → Medusa fires order.placed
  → GA4 purchase event fired
```

---

## 8. Checkout — Cash on Delivery (COD)

The COD flow is more complex because cash is collected at delivery, not at checkout. OTP verification prevents fraud on large orders.

### 8.1 Session Initialisation — `initiatePayment()`

```
POST /store/carts/:id/payment-sessions  { provider_id: "pp_cod_cod" }
```

`CodPaymentService.initiatePayment()` runs the following in sequence:

```
1. Validate currency = INR (throws if not)

2. Validate amount:
   < min_order_amount (₹100)    → reject "COD not available below ₹100"
   > max_order_amount (₹50,000) → reject "COD not available above ₹50,000"

3. If amount < otp_threshold (₹2,500):
   → session: { otp_required: false }
   → checkout may complete immediately

4. If amount >= otp_threshold:
   → Resolve phone:
       customer.phone || billing_address.phone || shipping_address.phone
       (no phone → throw "phone required for COD above ₹2,500")
   
   → validateAndNormaliseIndianPhone(phone):
       accepts: +91XXXXXXXXXX | 91XXXXXXXXXX | XXXXXXXXXX (6–9 digit prefix)
       rejects: landlines, non-Indian numbers → clear MedusaError
       returns: 91XXXXXXXXXX (MSG91 format)
   
   → Redis rate limit:
       SET cod:otp:rl:91XXXXXXXXXX 1 NX EX 60
       if SET returns null → "OTP sent recently, wait 60s" (prevents SMS bombing)
       if Redis is down    → log warning, continue (fail open — Redis outage ≠ blocked checkout)
   
   → generateOtp(): crypto.randomInt(100_000, 999_999) → 6-digit string
   → salt = crypto.randomBytes(16).toString("hex")
   → otpHash = HMAC-SHA256(salt, otp)  (OTP never stored in plain text)
   → expiresAt = Date.now() + otp_expiry_minutes * 60 * 1000  (default 10 min)
   
   → sendOtpViaMSG91(phone, otp):
       POST https://control.msg91.com/api/v5/otp
       { template_id, mobile: "91XXXXXXXXXX", otp }
       authkey: MSG91_AUTH_KEY header
       If MSG91 fails → throw MedusaError (blocks checkout — silent bypass = fraud vector)
   
   → session: {
       otp_required: true,
       otp_verified: false,
       otp_hash,
       otp_salt,
       otp_expires_at,
       otp_phone_last4   ← last 4 digits only, for UI display ("sent to ••••6789")
     }
```

### 8.2 OTP Verification — `POST /store/cod/verify-otp`

Customer receives SMS and submits the code:

```
POST /store/cod/verify-otp
  Authorization: Bearer <token>
  body: { payment_session_id: "cod_abc...", otp: "482910" }
```

Validation chain:

```
1. payment_session_id: string, max 200 chars
2. otp: exactly /^\d{6}$/ — 6 digits only (OTP generation always produces 6 digits)

3. Fetch payment session from Medusa Payment Module

4. Confirm provider_id is "pp_cod_cod" or "cod"

5. Ownership check (prevents cross-customer OTP exhaustion attacks):
   auth_context.actor_id
     → payment_collection (via payment_session.payment_collection_id)
     → cart (via collection.cart_id)
     → verify cart.customer_id === auth_context.actor_id
     → 403 if mismatch

6. Brute-force lockout:
   otp_attempts >= MAX_OTP_ATTEMPTS (5) → 429 "session locked, restart checkout"

7. Delegate to CodPaymentService.verifyOtp():
   - Check otp_required (if false → verified: true, nothing to check)
   - Check otp_attempts again (defense-in-depth, uses same MAX_OTP_ATTEMPTS constant)
   - Check expiry: Date.now() > otp_expires_at → "OTP expired"
   - timingSafeEqual(HMAC-SHA256(salt, trimmed_otp), stored_hash)
     → buffers must be same length AND equal (prevents length-extension)
   - On match:
       otp_verified: true
       otp_verified_at: ISO timestamp
       otp_hash: null          ← hash cleared after use
       otp_salt: null          ← salt cleared after use

8. On failure:
   increment otp_attempts → persist to DB (always, even if DB write fails = 500)
   remaining = MAX_OTP_ATTEMPTS - new_attempts
   if locked → 429
   else → 400 "Invalid OTP. X attempts remaining."

9. On success:
   updatePaymentSession({ data: updatedData })
   → 200 { verified: true }
```

### 8.3 Cart Amount Change — `updatePayment()`

If customer edits the cart after OTP verification:

```
If newAmount > prevAmount AND newAmount >= otp_threshold:
  → otp_verified: false
  → otp_hash: null, otp_salt: null, otp_expires_at: null  (old OTP invalidated)
  → otp_attempts: 0
  → storefront must detect otp_required=true && otp_verified=false → re-prompt

If newAmount drops below otp_threshold:
  → otp_required: false (OTP no longer needed)
```

### 8.4 Authorization — `authorizePayment()`

```
if otp_required === true && otp_verified !== true:
  → throw "OTP verification required" (blocks order placement)

else:
  → status: "authorized"
```

### 8.5 Complete Cart

```
POST /store/carts/:id/complete
  → COD payment is authorized (cash not collected yet)
  → Medusa fires order.placed
  → Payment status: "authorized" (not captured)
  → Capture happens on delivery (see §10)
```

---

## 9. Order Placed Event

`order.placed` triggers three things simultaneously:

### 9.1 Order Confirmation Email

```
order.placed
  → order-placed-email.ts subscriber
  → sendOrderConfirmationWorkflow
  → Resend API
  → React Email template: order summary, line items, totals, shipping address
```

### 9.2 GA4 Purchase Event

```
order.placed
  → @variablevic/google-analytics-medusa plugin
  → GA4 Measurement Protocol POST
  → purchase event with: transaction_id, value, currency, items[]
```

### 9.3 Shiprocket Auto-Fulfillment

```
order.placed
  → order-placed.ts subscriber (fire-and-forget — errors logged, do NOT fail the order)
  → Guard: SHIPROCKET_EMAIL + SHIPROCKET_PASSWORD must be set
  → Guard: MEDUSA_STOCK_LOCATION_ID must be set
  → Fetch order items (with variant relations)
  → createOrderFulfillmentWorkflow (Medusa core-flows)
    → calls ShiprocketFulfillmentProvider.createFulfillment()
       → POST /v1/orders/create/adhoc
           payload built from order items, shipping address, product metadata:
           shiprocket_length, shiprocket_breadth, shiprocket_height, shiprocket_weight
           (fallback: 15×12×10 cm, 0.5 kg per item if metadata absent)
       → POST /v1/courier/assign/awb/{shipment_id}
           automatically assigns best available courier
       → POST /v1/courier/generate/pickup
           schedules pickup at SHIPROCKET_PICKUP_LOCATION
       → returns { awb, courier_name, courier_id } stored in fulfillment data
```

---

## 10. Shipment Lifecycle

Shiprocket calls `POST /hooks/shiprocket?token=<SHIPROCKET_WEBHOOK_TOKEN>` for each status change.

### 10.1 Token Verification

```
1. SHIPROCKET_WEBHOOK_TOKEN must be set — if absent, reject ALL requests with { received: false }
   (fail closed: unset token = fully open webhook = anyone can forge delivery events)

2. Extract token from query string:
   - ?token=x         → "x"
   - ?token=a&token=b → use first element (array-safe extraction)
   - missing          → ""

3. timingSafeEqual(Buffer.from(expected), Buffer.from(received))
   → lengths must match + equal byte-by-byte
   → 401 if mismatch
```

### 10.2 Status Events

All status comparisons: `current_status.toLowerCase().trim()` (Shiprocket casing is inconsistent)

**Shipped**
```
"shipped"
  → verify AWB is present
  → sendOrderShippedWorkflow (if RESEND_API_KEY set + email not already sent)
  → createOrderShipmentWorkflow:
       { order_id, fulfillment_id, items }
       → Medusa fulfillment status → "Shipped"
  → updateTrackingMetadata:
       shiprocket_status, shiprocket_awb, shiprocket_courier,
       shiprocket_tracking_url, shiprocket_email_shipped_at
```

**In Transit**
```
"in transit" | "in-transit"
  → sendOrderInTransitWorkflow with current_city (if email not already sent)
  → updateTrackingMetadata: shiprocket_current_city, shiprocket_email_in_transit_at
  (no native Medusa state change — stored in metadata only)
```

**Out for Delivery**
```
"out for delivery" | "out_for_delivery"
  → sendOrderOutForDeliveryWorkflow (if email not already sent)
  → updateTrackingMetadata: shiprocket_out_for_delivery_at
```

**Delivered**
```
"delivered"
  → sendOrderDeliveredWorkflow with review CTA (if email not already sent)
  → updateTrackingMetadata FIRST (before marking delivered):
       shiprocket_delivered_at, shiprocket_email_delivered_at
       (flag set BEFORE markOrderFulfillmentAsDeliveredWorkflow fires the event
        so the order-delivered-email.ts subscriber sees it and skips duplicate email)
  → markOrderFulfillmentAsDeliveredWorkflow:
       { orderId, fulfillmentId }
       → Medusa fulfillment status → "Delivered"
       → Order status → "Completed"
       → fires order.fulfillment_delivered event
  → Auto-capture COD payment (COD only):
       find payments where provider_id = "pp_cod_cod" AND captured_at = null
       → capturePaymentWorkflow({ payment_id })
       → payment status → "Captured" (records that cash was physically collected)
       (Razorpay payments are already captured by the plugin — this only applies to COD)
```

### 10.3 Idempotency

Every email event is guarded by a metadata timestamp:

```
shiprocket_email_shipped_at        → "shipped" email guard
shiprocket_email_in_transit_at     → "in transit" email guard
shiprocket_email_out_for_delivery_at → "out for delivery" email guard
shiprocket_email_delivered_at      → "delivered" email guard
```

If Shiprocket retries a webhook (network timeout, etc.), the metadata flag is already set → email is skipped → no duplicate.

### 10.4 Non-Handled Statuses

Any other `current_status` → `{ received: true }` with no action (logged and acknowledged so Shiprocket doesn't retry).

### 10.5 Order Tracking

Customer can check real-time status:

```
GET /store/orders/:id/tracking
  Authorization: Bearer <token>
  → ownership check: order.customer_id must match auth_context.actor_id
  → returns: { awb, courier_name, current_status, tracking_url, estimated_delivery }
```

---

## 11. Post-Delivery Actions

### 11.1 Product Review

```
POST /store/product-reviews
  Authorization: Bearer <token>
  body: { product_id, rating, content }
```

Middleware `requireVerifiedPurchase` runs before the handler:
```
1. customer_id from auth_context (not from body)
2. query.graph(order, customer_id=X, fulfillment_status=delivered|partially_delivered)
3. check order.items.some(item.product_id === requested product_id)
4. if no delivered order with this product → 403 "only verified buyers can review"
5. inject real customer name from auth_context into display_name (cannot be spoofed)
```

Default review status: `pending` — admin must approve before it becomes public (`defaultReviewStatus: "pending"` in `medusa-config.ts`).

### 11.2 Invoice Download

```
GET /store/orders/:id/invoice
  Authorization: Bearer <token>   ← auth + ownership check
  → streams PDF invoice via @rsc-labs/medusa-documents-v2
  → store address configured once in Admin › Documents › Settings
```

### 11.3 Order Cancellation + Refund

Admin-side:
```
Admin: cancel order
  → order.canceled event
  → order-cancelled-email.ts subscriber
  → sendOrderCancelledWorkflow → Resend email to customer

Admin: issue refund in Medusa Admin › Payments
  → Razorpay plugin forwards refund to Razorpay
  → Razorpay fires refund.processed webhook
  → POST /hooks/razorpay (HMAC verified)
  → handleRefundProcessed:
       look up Medusa payment by razorpay_payment_id (take: 500 on DB query)
       find latest return record on the order (sorted by created_at desc)
       sendOrderRefundedWorkflow → Resend email
```

---

## 12. Admin Panel

All routes under `/app/*` in the Medusa admin panel:

### `/app/ga4` — GA4 Overview

Backend: `GET /admin/custom/ga4?days=30`

Auth flow for GA4 (all 5 tabs share `_lib.ts`):
```
GA_SERVICE_ACCOUNT_KEY (JSON)
  → RS256-signed JWT (iat, exp, scope: analytics.readonly)
  → POST https://oauth2.googleapis.com/token
  → Bearer token (cached 55 min, deduplicates concurrent requests via in-flight promise)
  → POST https://analyticsdata.googleapis.com/v1beta/properties/:id:runReport
  → result cached 15 min per (endpoint, property, days) key
```

| Tab | Route | Data |
|---|---|---|
| Overview | `/app/ga4` | Sessions, users, bounce rate, revenue, orders, AOV, top pages, top events, daily trend |
| Performance | `/app/ga4/performance` | Revenue, orders, AOV, conversion rate, sessions, peak day, daily trend |
| Products | `/app/ga4/products` | Per-product: revenue, sold, views, cart adds, cart-to-detail %, refunds |
| Acquisition | `/app/ga4/acquisition` | Channels (revenue), sources (bounce rate), campaigns (UTM) |
| Funnel | `/app/ga4/funnel` | View → Cart → Checkout → Purchase; drop-off % per step; cart abandonment rate |

Keyboard shortcuts (G → A → key):

| Keys | Destination |
|---|---|
| G → A | GA4 Overview |
| G → A → P | Performance |
| G → A → R | Products |
| G → A → C | Acquisition |
| G → A → F | Funnel |

### `/app/razorpay` — Razorpay Dashboard

Live payments, settlements, disputes. Uses `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` via centralised `getRazorpay()` singleton.

### `/app/cod-remittance` — COD Remittance Tracker

Tracks COD orders where cash has been collected (captured) vs pending.

### `/app/search-engine` — Search Engine Manager

Switch between Algolia and Meilisearch at runtime. Trigger full reindex via `POST /admin/algolia/sync`.

### Admin Widgets with GA4 Hotlinks

Every admin widget has a direct link to the relevant GA4 tab:

| Widget | GA4 link |
|---|---|
| Order detail (Razorpay) | → Performance |
| Customer detail (Razorpay) | → Acquisition |
| Dashboard summary (Razorpay) | → Overview |
| COD Remittance | → Funnel |
| COD OTP Status | → Funnel |

---

## 13. Full Data Flow Diagram

```
CUSTOMER BROWSER
│
├─ BROWSE ─────────────────────────────────────────────────────────────────────
│   GET /store/products/*           Standard Medusa catalogue API
│   GET /store/product-categories   (no auth required)
│   Algolia / Meilisearch (direct)  Public search, bypasses backend
│   GA4 view_item events            Via Measurement Protocol (server-side)
│
├─ LOGIN ──────────────────────────────────────────────────────────────────────
│   POST /auth/customer/emailpass   → JWT
│   GET  /auth/customer/google      → Google OAuth → JWT
│
├─ WISHLIST ───────────────────────────────────────────────────────────────────
│   GET/POST/DELETE /store/wishlist
│   customer_id from auth_context only
│
├─ SERVICEABILITY CHECK ───────────────────────────────────────────────────────
│   GET /store/shipping/serviceability?pincode=400001
│   ↳ ShiprocketService.checkServiceability()
│   ↳ Shiprocket REST API → couriers, rates, ETD
│   ↳ Fail-closed if unconfigured
│
├─ CART ───────────────────────────────────────────────────────────────────────
│   POST /store/carts/*             Standard Medusa cart API
│   GA4: add_to_cart, begin_checkout, add_shipping_info, add_payment_info
│
├─ CHECKOUT: RAZORPAY ──────────────────────────────────────────────────────────
│   POST /store/carts/:id/payment-sessions  { provider_id: pp_razorpay_razorpay }
│   ↳ Razorpay modal (JS SDK) — customer pays
│   POST /hooks/razorpay  x-razorpay-signature  (HMAC-SHA256 verified)
│     payment.authorized  → log
│     payment.captured    → log
│     payment.failed      → log
│     refund.processed    → find order → sendOrderRefundedWorkflow → Resend
│   POST /store/carts/:id/complete
│
├─ CHECKOUT: COD ──────────────────────────────────────────────────────────────
│   POST /store/carts/:id/payment-sessions  { provider_id: pp_cod_cod }
│     ↳ validate INR, min/max amount
│     ↳ if amount >= ₹2,500:
│         validate Indian phone
│         Redis rate-limit (1 OTP / phone / 60s)
│         crypto.randomInt → 6-digit OTP
│         HMAC-SHA256(salt, otp) → stored hash
│         MSG91 OTP API → SMS to customer
│   POST /store/cod/verify-otp  { payment_session_id, otp }
│     ↳ ownership check (cart.customer_id === auth_context.actor_id)
│     ↳ brute-force lockout (5 attempts max, persisted to DB)
│     ↳ expiry check
│     ↳ timingSafeEqual(HMAC(salt, otp), stored_hash)
│     ↳ otp_verified: true, hash cleared
│   POST /store/carts/:id/complete
│
└─ ORDER PLACED ───────────────────────────────────────────────────────────────
    order.placed event fires 3 things simultaneously:
    │
    ├─ order-placed-email.ts subscriber
    │   sendOrderConfirmationWorkflow → Resend
    │
    ├─ GA4 plugin
    │   purchase event → Measurement Protocol → GA4
    │
    └─ order-placed.ts subscriber (fire-and-forget)
        createOrderFulfillmentWorkflow
          ↳ ShiprocketFulfillmentProvider.createFulfillment()
              POST /v1/orders/create/adhoc      → Shiprocket order created
              POST /v1/courier/assign/awb/...   → AWB assigned
              POST /v1/courier/generate/pickup  → pickup scheduled

SHIPROCKET WEBHOOK  POST /hooks/shiprocket?token=<secret>
│   token verified: timingSafeEqual, array-safe query extraction
│
├─ Shipped
│   createOrderShipmentWorkflow → fulfillment = Shipped
│   sendOrderShippedWorkflow    → Resend (idempotent: email_shipped_at guard)
│
├─ In Transit
│   metadata: shiprocket_current_city
│   sendOrderInTransitWorkflow  → Resend (idempotent: email_in_transit_at guard)
│
├─ Out for Delivery
│   metadata updated
│   sendOrderOutForDeliveryWorkflow → Resend (idempotent)
│
└─ Delivered
    updateTrackingMetadata (sets email_delivered_at FIRST for idempotency)
    markOrderFulfillmentAsDeliveredWorkflow → order Completed
    sendOrderDeliveredWorkflow → Resend (idempotent)
    if COD: capturePaymentWorkflow → payment Captured (cash collected)

POST-DELIVERY
│
├─ Review: POST /store/product-reviews
│   requireVerifiedPurchase middleware:
│     delivered order with product_id? → 403 if not
│   display_name injected from auth_context (cannot be spoofed)
│   default status: pending (admin approval required)
│
├─ Invoice: GET /store/orders/:id/invoice
│   auth + ownership → PDF stream via @rsc-labs/medusa-documents-v2
│
└─ Tracking: GET /store/orders/:id/tracking
    auth + ownership → { awb, courier, status, tracking_url }

ADMIN PANEL  /app/*
│
├─ /ga4          Overview (sessions, revenue, orders, AOV)
├─ /ga4/performance   Revenue trend, conversion rate
├─ /ga4/products      Per-product revenue and cart rates
├─ /ga4/acquisition   Channels, sources, campaigns
├─ /ga4/funnel        View→Cart→Checkout→Purchase funnel
│   All GA4 data: service-account JWT → OAuth token (55-min cache)
│                 → GA4 Data API REST → 15-min report cache
│
├─ /razorpay          Live payments, settlements
├─ /cod-remittance    COD cash collected tracker
└─ /search-engine     Algolia / Meilisearch runtime switch + reindex
```

---

## 14. Environment Variable Reference

| Group | Variable | Required | Purpose |
|---|---|---|---|
| Database | `DATABASE_URL` | ✅ | PostgreSQL connection string |
| Redis | `REDIS_URL` | ✅ | COD OTP rate limiting, Medusa queues |
| Auth | `JWT_SECRET` | ✅ | Must be strong random value in production |
| Auth | `COOKIE_SECRET` | ✅ | Must be strong random value in production |
| CORS | `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` | ✅ | Allowed origins |
| Razorpay | `RAZORPAY_KEY_ID` | ✅ | Razorpay API key |
| Razorpay | `RAZORPAY_KEY_SECRET` | ✅ | Razorpay secret |
| Razorpay | `RAZORPAY_WEBHOOK_SECRET` | ✅ | HMAC verification for `/hooks/razorpay` |
| Shiprocket | `SHIPROCKET_EMAIL` | ✅ | Shiprocket login |
| Shiprocket | `SHIPROCKET_PASSWORD` | ✅ | Shiprocket login |
| Shiprocket | `SHIPROCKET_WEBHOOK_TOKEN` | ✅ | Token for `/hooks/shiprocket` — **must be set or webhook is fully rejected** |
| Shiprocket | `SHIPROCKET_PICKUP_POSTCODE` | ✅ | Origin pincode for serviceability checks |
| Shiprocket | `SHIPROCKET_PICKUP_LOCATION` | ✅ | Pickup location name from Shiprocket dashboard |
| Resend | `RESEND_API_KEY` | ⚠️ | Transactional emails — optional, emails skipped if absent |
| Resend | `RESEND_FROM_EMAIL` | ⚠️ | Sender address |
| MSG91 (COD OTP) | `MSG91_AUTH_KEY` | ✅* | Required if `otp_threshold` is set |
| MSG91 (COD OTP) | `MSG91_OTP_TEMPLATE_ID` | ✅* | DLT-approved OTP template |
| MSG91 (COD OTP) | `MSG91_SENDER_ID` | optional | 6-char DLT sender ID |
| Stock | `MEDUSA_STOCK_LOCATION_ID` | ✅ | From Admin › Settings › Locations |
| Algolia | `ALGOLIA_APP_ID` | ⚠️ | Required if `SEARCH_ENGINE=algolia` |
| Algolia | `ALGOLIA_API_KEY` | ⚠️ | Admin API key for indexing |
| Algolia | `ALGOLIA_PRODUCT_INDEX_NAME` | ⚠️ | Index name |
| Meilisearch | `MEILISEARCH_HOST` | ⚠️ | Required if `SEARCH_ENGINE=meilisearch` |
| Meilisearch | `MEILISEARCH_API_KEY` | ⚠️ | Master key |
| Meilisearch | `MEILISEARCH_PRODUCT_INDEX_NAME` | ⚠️ | Index name |
| Google OAuth | `GOOGLE_CLIENT_ID` | ⚠️ | Required for Google login |
| Google OAuth | `GOOGLE_CLIENT_SECRET` | ⚠️ | Required for Google login |
| Google OAuth | `GOOGLE_CALLBACK_URL` | ⚠️ | e.g. `https://store.vridhira.in/api/auth/callback/google` |
| GA4 tracking | `GA_MEASUREMENT_ID` | ⚠️ | Server-side event tracking via Measurement Protocol |
| GA4 tracking | `GA_API_SECRET` | ⚠️ | Measurement Protocol secret |
| GA4 admin | `GA_PROPERTY_ID` | ⚠️ | Numeric property ID for admin dashboard |
| GA4 admin | `GA_SERVICE_ACCOUNT_KEY` | ⚠️ | Full service account JSON (single-line string) |

✅ = required for core functionality  
⚠️ = required for that specific feature, optional otherwise  
✅* = required when COD OTP threshold is active

---

*Generated from codebase audit — February 25, 2026*
