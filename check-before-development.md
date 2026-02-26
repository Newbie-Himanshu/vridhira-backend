# ✅ Check Before Development — Vridhira Marketplace

> **READ THIS BEFORE RUNNING THE PROJECT.**
> This document covers every environment variable, API key, webhook, and configuration
> setting required to run the Vridhira Marketplace backend correctly.
> All placeholder values in `.env` **must be replaced** before the server will work.

---

## 🚨 Critical Warning — Replace ALL API Keys

> The `.env` file currently contains **placeholder/test values**. Do NOT go live with these.
> Some are sample Razorpay test keys used during initial setup — they will not work for
> your account. Generate fresh keys for every service listed below.

---

## 📁 Files You Will Need to Edit

| File | Purpose |
|------|---------|
| `.env` | All secrets and runtime configuration |
| `medusa-config.ts` | COD limits, Razorpay options (hardcoded values) |
| `src/modules/cod-payment/service.ts` | COD fraud limits (if you want to adjust) |

---

## 🔑 Section 1 — Core Medusa Secrets

These are your application security keys. They **must** be changed before production.

```env
JWT_SECRET=supersecret        ← REPLACE THIS
COOKIE_SECRET=supersecret     ← REPLACE THIS
```

**How to generate secure values:**

Open any terminal and run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Run it twice — once for `JWT_SECRET`, once for `COOKIE_SECRET`. Each should be a unique
random 64-character hex string.

**Why this matters:** If left as `supersecret`, anyone can forge authentication tokens
and take over any customer or admin account on your store.

---

## 🗄️ Section 2 — Database & Redis

```env
DATABASE_URL=postgres://postgres:superuser@localhost/vridhira
REDIS_URL=redis://localhost:6379
```

**Development:** These defaults work if PostgreSQL and Redis are running locally.

**Production checklist:**
- [ ] Replace `postgres:superuser` with your actual DB user and password
- [ ] Replace `localhost` with your DB server's IP or hostname
- [ ] Replace `vridhira` with your production database name
- [ ] Use a managed Redis service (e.g. Upstash, Redis Cloud) and replace the URL
- [ ] Ensure the DB user has full privileges on the database

**Create the database locally (if not done):**
```bash
psql -U postgres -c "CREATE DATABASE vridhira;"
```

---

## 💳 Section 3 — Razorpay

Razorpay handles all online payments: UPI, cards, net banking, wallets.

**Where to get keys:** [dashboard.razorpay.com](https://dashboard.razorpay.com) → Settings → API Keys

```env
RAZORPAY_KEY_ID=rzp_test_SERk6WU6HSiLWR        ← REPLACE with your own
RAZORPAY_KEY_SECRET=VFx85zBBaHguYont5CCl8P6r   ← REPLACE with your own
RAZORPAY_WEBHOOK_SECRET=wb_sec_...              ← REPLACE with your own
RAZORPAY_ACCOUNT=R6iKqYq78SysVj                ← REPLACE with your own
```

**Also update in `.env`:**
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...        ← Must match RAZORPAY_KEY_ID above
```

### Step-by-step setup:

1. **Create a Razorpay account** at [razorpay.com](https://razorpay.com)
2. Go to **Settings → API Keys**
3. Click **Generate Test Key** (for development) or **Generate Live Key** (for production)
4. Copy `Key ID` → `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`
5. Copy `Key Secret` → `RAZORPAY_KEY_SECRET`
6. Go to **Settings → Webhooks → + Add New Webhook**
7. Set a strong webhook secret → copy it to `RAZORPAY_WEBHOOK_SECRET`
8. `RAZORPAY_ACCOUNT` is your Razorpay Account ID — found in Settings → Profile

### Webhook registration:

| Environment | Webhook URL |
|-------------|-------------|
| Development | `https://<ngrok-url>/hooks/razorpay` |
| Production  | `https://api.vridhira.in/hooks/razorpay` |

**Events to enable in Razorpay dashboard:**
- `payment.authorized`
- `payment.captured`
- `payment.failed`
- `refund.processed`

### Test vs Live keys:

| Mode | Key prefix | Use case |
|------|-----------|---------|
| Test | `rzp_test_` | Local development — no real money |
| Live | `rzp_live_` | Production — requires KYC approval |

---

## 📦 Section 4 — Shiprocket (Logistics)

Shiprocket handles order fulfillment, AWB generation, and delivery tracking for all couriers
(BlueDart, Delhivery, DTDC, Ekart, etc.).

```env
SHIPROCKET_EMAIL=your@email.com     ← REPLACE with your Shiprocket login email
SHIPROCKET_PASSWORD=yourpassword    ← REPLACE with your Shiprocket login password
SHIPROCKET_PICKUP_LOCATION=Primary  ← REPLACE with your pickup location name
```

### Step-by-step setup:

1. **Create a Shiprocket account** at [app.shiprocket.in](https://app.shiprocket.in)
2. `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD` are the **login credentials for your Shiprocket account** — Shiprocket uses these for API authentication (Basic Auth)
3. Go to **Settings → Manage Pickup Addresses**
4. Create your warehouse/pickup address
5. Note the **Pickup Location Name** exactly (e.g. `"Primary"`, `"Warehouse Mumbai"`) and set it as `SHIPROCKET_PICKUP_LOCATION`

### Webhook registration:

| Environment | Webhook URL |
|-------------|-------------|
| Development | `https://<ngrok-url>/hooks/shiprocket?token=<SHIPROCKET_WEBHOOK_TOKEN>` |
| Production  | `https://admin.vridhira.in/hooks/shiprocket?token=<SHIPROCKET_WEBHOOK_TOKEN>` |

**To register:** Shiprocket Dashboard → **Settings → Webhooks** → Add webhook URL.
No secret is required — Shiprocket posts JSON with `current_status`.

**What the webhook triggers:**
- Status `"Shipped"` / `"In Transit"` → sends shipping email to customer with AWB
- Status `"Delivered"` → sends delivery confirmation email to customer

### Important — Pickup location name is case-sensitive:
The value in `SHIPROCKET_PICKUP_LOCATION` must match **exactly** what's shown in the
Shiprocket dashboard, including spaces and capitalisation.

---

## 📧 Section 5 — Resend (Transactional Emails)

Resend sends all customer-facing transactional emails: order confirmation, shipping
notification, delivery confirmation, cancellation, and refund emails.

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx                   ← REPLACE
RESEND_FROM_EMAIL=Vridhira Marketplace <onboarding@resend.dev>  ← REPLACE for production
```

### Step-by-step setup:

1. **Create a Resend account** at [resend.com](https://resend.com) (free — 3,000 emails/month)
2. Go to **API Keys → Create API Key**
3. Copy the key (starts with `re_`) → paste as `RESEND_API_KEY`

### From address — two stages:

**Stage 1 — Development (works immediately, no setup needed):**
```env
RESEND_FROM_EMAIL=Vridhira Marketplace <onboarding@resend.dev>
```
Emails will send from Resend's shared domain. Suitable for local testing only.

**Stage 2 — Production (required before going live):**
1. In Resend dashboard → **Domains → Add Domain**
2. Enter `vridhira.in` and follow the DNS instructions (add 3 TXT/MX records)
3. Once verified, change to:
```env
RESEND_FROM_EMAIL=Vridhira Marketplace <noreply@vridhira.in>
```

### Preview emails locally:
```bash
yarn dev:email
# Opens http://localhost:3000 with live preview of all 5 email templates
```

### Email triggers (for reference):

| Event | Template ID | Subject |
|-------|-------------|---------|
| Order placed | `order-placed` | ✅ Order Confirmed – Vridhira Marketplace |
| AWB generated / Shiprocket shipped | `order-shipped` | 🚚 Your Order Has Shipped |
| Shiprocket status `"In Transit"` | `order-in-transit` | 🛤️ Your Order Is In Transit |
| Shiprocket status `"Out for Delivery"` | `order-out-for-delivery` | 🛵 Out for Delivery Today! |
| Admin marks delivered / Shiprocket `"Delivered"` | `order-delivered` | 📦 Order Delivered! |
| Order cancelled | `order-cancelled` | Order Cancelled |
| Return / refund created | `order-refunded` | 💰 Refund Initiated |
| Customer signs up | `email-verification` | ✉️ Verify your email – Vridhira Marketplace |
| Forgot password request | `password-reset` | 🔐 Reset your Vridhira Marketplace password |

All 9 templates are React Email components in `src/modules/resend/emails/`
and are previewed locally with `yarn dev:email` (opens on `http://localhost:3000`).

---

## 🌐 Section 6 — CORS & URLs

### Development (current default):
```env
STORE_CORS=http://localhost:8000,https://docs.medusajs.com
ADMIN_CORS=http://localhost:5173,http://localhost:9000,https://docs.medusajs.com
AUTH_CORS=http://localhost:5173,http://localhost:9000,http://localhost:8000,https://docs.medusajs.com
STORE_URL=http://localhost:8000
```

### Production — swap to these values:
```env
STORE_CORS=https://vridhira.in
ADMIN_CORS=https://admin.vridhira.in,https://api.vridhira.in
AUTH_CORS=https://vridhira.in,https://admin.vridhira.in,https://api.vridhira.in
STORE_URL=https://vridhira.in
```

---

## 🌍 Section 7 — DNS Setup (Production)

The storefront and backend run on separate subdomains:

| Subdomain | Points to | Purpose |
|-----------|-----------|---------|
| `vridhira.in` | Vercel / Netlify / frontend server | Next.js storefront |
| `api.vridhira.in` | Your backend server IP | Medusa backend (port 9000) |
| `admin.vridhira.in` | Same as `api.vridhira.in` | Medusa admin panel |

> Webhooks from Razorpay and Shiprocket go to `api.vridhira.in` — **not** `vridhira.in`.

---

## 🛠️ Section 8 — Development Tunnel (ngrok)

Razorpay and Shiprocket cannot send webhooks to `localhost`. Use ngrok during development.

**Install:**
```bash
npm install -g ngrok
```

**Run (every time you start development):**
```bash
# In a separate terminal — Medusa runs on port 9000
ngrok http 9000
```

ngrok will show a URL like `https://a1b2-103-xx.ngrok-free.app`.
Register this URL as the webhook on both Razorpay and Shiprocket dashboards.

**Tip — get a free static ngrok domain (doesn't change on restart):**
1. Sign up at [dashboard.ngrok.com](https://dashboard.ngrok.com)
2. Go to **Domains → New Domain** (one free static domain available)
3. Use: `ngrok http 9000 --domain your-chosen-name.ngrok-free.app`
4. Register `https://your-chosen-name.ngrok-free.app/hooks/razorpay` and `.../hooks/shiprocket` permanently

---

## 📋 Section 9 — Cash on Delivery Settings

COD limits are hardcoded in `medusa-config.ts`. Review and adjust before launch:

```typescript
options: {
  min_order_amount: 10000,    // ₹100  — minimum order value for COD
  max_order_amount: 5000000,  // ₹50,000 — maximum order value for COD
  max_daily_orders: 3,        // max COD orders per customer per day
  new_customer_limit: 150000, // ₹1,500 — COD limit for first-time customers
  otp_threshold: 300000,      // ₹3,000 — orders above this require OTP verification
}
```

> All amounts are in **paise** (multiply ₹ by 100). Adjust these based on your business risk tolerance.

---

## 🚀 Section 10 — Pre-flight Checklist

### Before starting local development:
- [ ] PostgreSQL is running locally
- [ ] Redis is running locally
- [ ] Run `yarn install` in `vridhira-marketplace/`
- [ ] Run `yarn install` in `vridhira-marketplace-storefront/`
- [ ] Replace `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_ACCOUNT` with your own Razorpay test keys
- [ ] Replace `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD` with your Shiprocket credentials
- [ ] Replace `SHIPROCKET_PICKUP_LOCATION` with your exact pickup location name
- [ ] Replace `RESEND_API_KEY` with your Resend API key
- [ ] Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE` (optional for local — COD OTP is silently skipped if unset; see Section 21)
- [ ] Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (optional for local — Google button shows but login will fail without this; see Section 22)
- [ ] Run database migrations: `yarn medusa db:migrate`
- [ ] (Optional) Seed demo data: `yarn medusa exec ./src/scripts/seed-india.ts`
- [ ] Start ngrok: `ngrok http 9000`
- [ ] Register ngrok URLs on Razorpay and Shiprocket webhook dashboards

### Before going live (production):
- [ ] Generate new `JWT_SECRET` and `COOKIE_SECRET` (random 64-char hex strings)
- [ ] Switch Razorpay to **Live mode** keys (`rzp_live_...`) — requires KYC
- [ ] Verify `vridhira.in` domain in Resend dashboard and update `RESEND_FROM_EMAIL`
- [ ] Switch all env vars from localhost to production URLs (see Section 6)
- [ ] Set up `api.vridhira.in` subdomain pointing to your backend server
- [ ] Register production webhook URLs on Razorpay and Shiprocket
- [ ] Set `NODE_ENV=production` on the server
- [ ] Enable HTTPS (SSL certificate via Let's Encrypt / Nginx / Caddy)
- [ ] Fill in `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE` and complete DLT registration for India (see Section 21)
- [ ] Fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; update `GOOGLE_CALLBACK_URL` to `https://vridhira.in/auth/google/callback`; publish the OAuth app (see Section 22)
- [ ] Test a full order flow end-to-end: place → ship → deliver → cancel → refund
- [ ] Test Google Sign-In flow (new customer + returning customer)
- [ ] Place a COD order above ₹3,000 and verify the OTP SMS arrives
- [ ] Sign up with a new email → verify the verification email arrives and the link works
- [ ] Use Forgot Password → verify the reset email arrives and password can be changed

---

## 🗂️ Section 11 — Quick Command Reference

```bash
# Install dependencies
yarn install

# Run database migrations
yarn medusa db:migrate

# Seed India-specific demo data (products, regions, shipping zones, tax rates)
yarn medusa exec ./src/scripts/seed-india.ts

# Start the backend (http://localhost:9000)
yarn dev

# Start the storefront (http://localhost:8000) — run from storefront folder
cd ../vridhira-marketplace-storefront && yarn dev

# Preview all email templates in browser
yarn dev:email

# TypeScript type-check (should always return 0 errors)
npx tsc --noEmit

# Start ngrok tunnel for webhooks
ngrok http 9000
```

---

## 📞 Support & Dashboards

| Service | Dashboard | Documentation |
|---------|-----------|---------------|
| Razorpay | [dashboard.razorpay.com](https://dashboard.razorpay.com) | [razorpay.com/docs](https://razorpay.com/docs) |
| Shiprocket | [app.shiprocket.in](https://app.shiprocket.in) | [developer.shiprocket.in](https://developer.shiprocket.in) |
| Resend | [resend.com/overview](https://resend.com/overview) | [resend.com/docs](https://resend.com/docs) |
| Medusa | [docs.medusajs.com](https://docs.medusajs.com) | — |
| ngrok | [dashboard.ngrok.com](https://dashboard.ngrok.com) | [ngrok.com/docs](https://ngrok.com/docs) |

---

## 🏗️ Section 12 — Architecture Overview (Your Final Setup)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Customer Browser                                                   │
│       │                                                             │
│       ▼                                                             │
│  vridhira.in          ──────►  Hostinger (Node.js Business Plan)   │
│  (Next.js Storefront)          Serves the customer-facing website   │
│       │                                                             │
│       │  API calls (HTTPS)                                          │
│       ▼                                                             │
│  admin.vridhira.in    ──────►  Your Backend Server (Railway/VPS)   │
│  (Medusa Backend)              - REST API  (/store/*, /admin/*)     │
│                                - Admin Panel (/app)                 │
│                                - Webhooks (/hooks/*)                │
│                                - PostgreSQL (managed cloud)         │
│                                - Redis     (managed cloud)          │
└─────────────────────────────────────────────────────────────────────┘
```

**What runs where:**

| Domain | Hosted on | What it serves |
|--------|-----------|----------------|
| `vridhira.in` | Hostinger Business Plan | Next.js storefront (customer shop) |
| `admin.vridhira.in` | Backend server (Railway recommended) | Medusa API + Admin panel at `/app` |

> `admin.vridhira.in` serves **both** the Medusa admin panel (`/app`) and the store API
> (`/store/*`). Your storefront at `vridhira.in` calls `admin.vridhira.in` for all data.

---

## 🐳 Section 13 — Current Local Docker Setup (Development)

Your PostgreSQL and Redis databases currently run in Docker containers on your local machine.
This is the correct approach for development. Here is how to manage them.

### Starting your Docker databases

Every time you start development, run these two commands:

```bash
# Start PostgreSQL (if not already running)
docker run -d \
  --name vridhira-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=superuser \
  -e POSTGRES_DB=vridhira \
  -p 5432:5432 \
  postgres:15

# Start Redis (if not already running)
docker run -d \
  --name vridhira-redis \
  -p 6379:6379 \
  redis:7
```

> If you already have containers from a previous session, they are stopped, not deleted.
> Restart them with:
> ```bash
> docker start vridhira-postgres
> docker start vridhira-redis
> ```

### Check if they are running

```bash
docker ps
# Should show both vridhira-postgres and vridhira-redis with status "Up"
```

### Useful Docker commands

```bash
# View PostgreSQL logs
docker logs vridhira-postgres

# Connect to PostgreSQL directly
docker exec -it vridhira-postgres psql -U postgres -d vridhira

# Stop everything at end of day (data is preserved)
docker stop vridhira-postgres vridhira-redis

# Delete containers completely (WARNING: deletes all data)
docker rm -f vridhira-postgres vridhira-redis
```

### Use Docker Compose instead (recommended — one command for everything)

Create a file called `docker-compose.dev.yml` in the `vridhira-marketplace` folder:

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:15
    container_name: vridhira-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: superuser
      POSTGRES_DB: vridhira
    ports:
      - "5432:5432"
    volumes:
      - vridhira_pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: vridhira-redis
    ports:
      - "6379:6379"

volumes:
  vridhira_pgdata:
```

Then use:
```bash
# Start both (background)
docker compose -f docker-compose.dev.yml up -d

# Stop both (data preserved)
docker compose -f docker-compose.dev.yml down

# Stop and DELETE all data (full reset)
docker compose -f docker-compose.dev.yml down -v
```

---

## ☁️ Section 14 — Production Database Strategy

Do NOT use Docker on your local machine for production. Use managed cloud services.
They handle backups, scaling, failover, and uptime automatically.

### Recommended: Neon (PostgreSQL) + Upstash (Redis)

Both have **free tiers** that are sufficient for early-stage traffic, and both scale with you.

---

### PostgreSQL → Neon (neon.tech)

**Why Neon:** Serverless PostgreSQL, scales to zero when idle (no idle costs), free tier
includes 0.5 GB storage and unlimited API calls. Auto-backups. Spins up in seconds.

**Setup steps:**
1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Click **New Project** → name it `vridhira`
3. Select region: **Asia Pacific (Singapore)** — closest to your Indian users
4. Once created, go to **Dashboard → Connection Details**
5. Select the `main` branch, role `neondb_owner`
6. Copy the **Connection String** — it looks like:
   ```
   postgresql://neondb_owner:xxxx@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
7. In your production `.env`, set:
   ```env
   DATABASE_URL=postgresql://neondb_owner:xxxx@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

> **Important:** Neon requires `?sslmode=require` at the end of the connection string.
> Your local Docker URL does not need this. Keep separate `.env` files for dev and prod.

---

### Redis → Upstash (upstash.com)

**Why Upstash:** Serverless Redis, free tier includes 10,000 commands/day, pay per request
above that. Global replication available. No monthly fixed cost until you scale.

**Setup steps:**
1. Go to [upstash.com](https://upstash.com) and sign up (free)
2. Click **Create Database** → name it `vridhira-redis`
3. Select type: **Regional** → Region: **ap-southeast-1 (Singapore)**
4. Once created, go to the database → **Details tab**
5. Copy the **Redis URL** — it looks like:
   ```
   rediss://default:xxxx@willing-falcon-12345.upstash.io:6379
   ```
6. In your production `.env`, set:
   ```env
   REDIS_URL=rediss://default:xxxx@willing-falcon-12345.upstash.io:6379
   ```

> Note: `rediss://` (with double `s`) means TLS-encrypted Redis. This is correct for Upstash.

---

## 🖥️ Section 15 — Backend Hosting (admin.vridhira.in)

You need a platform that can run your Node.js Medusa backend continuously, handle webhook
traffic, and connect to Neon + Upstash.

> **You have the GitHub Student Developer Pack.** The single most valuable perk for this
> project is **DigitalOcean — $200 in free credits**. That alone pays for your backend for
> **~16 months at zero cost**. Use Option A first. When credits run out and the site is
> earning, move to Option C (Hetzner) for the cheapest long-term bill.

---

### ✅ Option A — DigitalOcean + Coolify (USE THIS FIRST · Free with Student Pack)

**Why:** Your GitHub Student Pack gives you **$200 in DigitalOcean credits** (valid 1 year).
A 2 GB Droplet costs $12/month → $200 credit = **~16 months completely free**. You install
Coolify on it, which gives you a Heroku-like dashboard to deploy from GitHub with one click,
add env vars, manage SSL, and restart crashed services — no DevOps knowledge needed.

#### Step 1 — Claim your $200 DigitalOcean credit

1. Go to [education.github.com/pack](https://education.github.com/pack)
2. Sign in with your GitHub Student account
3. Search for **DigitalOcean** in the offers list
4. Click **Get access** → you will be redirected to DigitalOcean
5. Create a DigitalOcean account (or sign in) — the $200 credit is applied automatically
6. Verify your account with a credit/debit card (required by DigitalOcean, but you will NOT
   be charged while credits remain)

> **Note:** Credits expire after 1 year from the date you claim them, regardless of usage.
> Claim them when you are ready to deploy, not before.

#### Step 2 — Create a Droplet (Virtual Server)

1. In DigitalOcean dashboard, click **Create → Droplets**
2. Settings:
   - **Region:** Bangalore (`BLR1`) — best latency for India
   - **OS:** Ubuntu 24.04 LTS (x64)
   - **Droplet type:** Basic
   - **Size:** 2 GB RAM / 2 vCPU / 60 GB SSD — **$18/month** ($200 ÷ $18 ≈ **11 months free**)
     > If budget is very tight, 2 GB / 1 vCPU / 50 GB SSD at **$12/month** also works
     > ($200 ÷ $12 ≈ **16 months free**), but builds may be slower.
   - **Authentication:** SSH Key (recommended) or Password
3. Click **Create Droplet** — ready in ~30 seconds
4. Copy the **Public IP address** shown in your Droplet dashboard

#### Step 3 — Install Coolify on the Droplet

```bash
# SSH into your new server
ssh root@<your-droplet-ip>

# Install Coolify (one command, takes ~3 minutes)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

5. After installation completes, access the Coolify UI at `http://<your-droplet-ip>:8000`
6. Create your admin account on the first launch screen

#### Step 4 — Deploy Medusa from GitHub

1. Make sure your `vridhira-marketplace` code is in a **private GitHub repository**
2. In Coolify: **New Resource → Application → GitHub App** → authorize GitHub
3. Select your repo and the `main` branch
4. Configure the service:
   - **Build Command:** `yarn install && yarn build`
   - **Start Command:** `yarn medusa db:migrate && yarn start`
   - **Port:** `9000`
5. Under **Environment Variables**, paste all your production `.env` values
6. Under **Domains**, enter `admin.vridhira.in`
   - Coolify automatically provisions a free Let's Encrypt SSL certificate for this domain
7. Click **Deploy** — Coolify pulls your repo, builds it, and starts it

#### Step 5 — Point admin.vridhira.in to your Droplet

In Hostinger hPanel → DNS Zone, add:
```
Type:  A
Name:  admin
Value: <your-droplet-ip>
TTL:   3600
```

#### Step 6 — Verify

```bash
# From your local machine, after DNS propagates (10–60 min)
curl https://admin.vridhira.in/health
# Expected response: OK
```

---

### Option B — Railway (Easy alternative if DigitalOcean feels complex · ~$5–12/month)

**Why Railway:** Zero server management — deploy directly from GitHub with no SSH or server
config. Good for the first few weeks if you want to test production before committing to a
Droplet. **Not free with Student Pack**, but Railway's Starter plan starts at ~$5/month.

**Step-by-step deployment on Railway:**

1. Push your `vridhira-marketplace` folder to a **private GitHub repository**
2. Go to [railway.app](https://railway.app) and sign up with GitHub
3. Click **New Project → Deploy from GitHub repo** → select your repo
4. In **Settings → Variables**, paste all your production `.env` values
5. Set the **Start Command:**
   ```bash
   yarn medusa db:migrate && yarn start
   ```
6. Set **Port** to `9000`
7. Go to **Settings → Networking → Generate Domain** → Railway gives you a
   `xxx.up.railway.app` URL
8. Under **Settings → Networking → Custom Domain**, add `admin.vridhira.in`
9. In Hostinger DNS Zone, add a CNAME record:
   ```
   Type:  CNAME
   Name:  admin
   Value: <your-app>.up.railway.app
   TTL:   3600
   ```

---

### Option C — Hetzner VPS + Coolify (Best long-term cost after you start earning · ~₹460/month)

**Why Hetzner + Coolify:** Once your Student Pack credits run out, Hetzner is the cheapest
quality VPS globally — €5/month (~₹460) for 4 GB RAM. Same Coolify setup as Option A,
just a different server provider. Migrate here when DigitalOcean credits are exhausted.

**Step-by-step:**

1. Go to [hetzner.com/cloud](https://hetzner.com/cloud) and create an account
2. Click **New Server** with these settings:
   - **Location:** Singapore — closest to India
   - **OS:** Ubuntu 24.04 LTS
   - **Type:** CX22 (2 vCPU, 4 GB RAM) — ~€5/month
   - **Networking:** Enable Public IPv4
3. Note the **Public IP address**
4. SSH in and install Coolify (same command as Option A Step 3)
5. Deploy Medusa from GitHub exactly as in Option A Step 4
6. Update the DNS A record in Hostinger to point `admin` → new Hetzner IP

> When migrating from DigitalOcean to Hetzner: export your DB from Neon (already managed,
> nothing to move), update DNS, redeploy on new server. Downtime is under 5 minutes.

---

## 🌐 Section 16 — Hostinger Setup (Frontend + DNS)

Your Hostinger Business Plan will host the Next.js storefront AND manage DNS for your
entire domain `vridhira.in`, including the subdomain that points to your backend.

---

### Part A — Deploy the Storefront to Hostinger

**Step 1 — Prepare the storefront for production**

In `vridhira-marketplace-storefront/.env.local` (create this file if it doesn't exist):
```env
MEDUSA_BACKEND_URL=https://admin.vridhira.in
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<your-publishable-key>
NEXT_PUBLIC_BASE_URL=https://vridhira.in
NEXT_PUBLIC_DEFAULT_REGION=in
REVALIDATE_SECRET=<random-string>
```

> **Where to get the publishable key:**
> After your backend is running at `admin.vridhira.in`, log into the Medusa admin panel
> at `https://admin.vridhira.in/app` → Settings → Publishable API Keys → Copy the key.

**Step 2 — Build the storefront**
```bash
cd vridhira-marketplace-storefront
yarn build
```

**Step 3 — Deploy to Hostinger**

Hostinger Business Plan supports Node.js apps via their hPanel.

1. Log in to [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Go to **Hosting → Manage → Node.js**
3. Set:
   - **Node.js version:** 20.x (LTS)
   - **Application root:** `/public_html` (or your chosen folder)
   - **Application URL:** `vridhira.in`
   - **Application startup file:** `server.js` (Next.js production server)
4. Connect your domain `vridhira.in` to this hosting

Alternatively, deploy the storefront to **Vercel** (free, zero config for Next.js) and just
use Hostinger for DNS management only:
1. Push storefront to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add environment variables in Vercel dashboard
4. After deployment, add custom domain `vridhira.in` in Vercel settings
5. Vercel tells you which DNS records to add — add them in Hostinger

> **Recommendation:** If Hostinger Node.js hosting causes issues with Next.js (some shared
> hosting environments are restrictive), use Vercel for the storefront — it is specifically
> built for Next.js and is free for small traffic. You will still manage DNS on Hostinger.

---

### Part B — Configure DNS on Hostinger (Most Important Step)

All DNS for `vridhira.in` is managed in Hostinger's hPanel. You need two records:

**Log in to Hostinger → Hosting → Manage → DNS Zone**

#### Record 1 — Point vridhira.in to Vercel/Hostinger frontend

If using **Vercel** for the storefront, Vercel will give you a CNAME value. Add this:
```
Type:   CNAME
Name:   @    (or www)
Value:  cname.vercel-dns.com   ← Vercel gives you this exact value
TTL:    3600
```
If using **Hostinger** directly for the storefront, this record is already configured.

#### Record 2 — Point admin.vridhira.in to your backend server

If your backend is on **Railway:**
```
Type:   CNAME
Name:   admin
Value:  <your-app>.up.railway.app   ← copy from Railway → Settings → Networking
TTL:    3600
```

If your backend is on **Hetzner VPS:**
```
Type:   A
Name:   admin
Value:  <your-hetzner-server-ip>   ← the IPv4 address from Hetzner Cloud console
TTL:    3600
```

> DNS changes take **10–60 minutes** to propagate worldwide. Use
> [dnschecker.org](https://dnschecker.org) to verify your records are live.

#### Final DNS Zone (what it should look like):

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A / CNAME | `@` | Hostinger/Vercel IP | Main storefront |
| CNAME | `www` | Hostinger/Vercel IP | www redirect |
| A / CNAME | `admin` | Backend server IP/hostname | Medusa backend |
| TXT | `@` | (Resend verification) | Email domain verification |
| TXT/MX | varies | (Resend DNS records) | Email deliverability |

---

### Part C — SSL Certificates

| Domain | SSL method |
|--------|-----------|
| `vridhira.in` | Auto-provided by Vercel or Hostinger (free Let's Encrypt) |
| `admin.vridhira.in` | Auto-provided by Railway or Coolify (free Let's Encrypt) |

You do **not** need to buy an SSL certificate. All recommended platforms handle this automatically.

---

## ⚙️ Section 17 — Production .env Configuration

Once backend and databases are set up, your production `.env` should look like this.
**Keep this file only on your server — never commit it to Git.**

```env
# ── Core ──────────────────────────────────────────────────────────────
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:xxxx@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
REDIS_URL=rediss://default:xxxx@willing-falcon-xxxxx.upstash.io:6379
JWT_SECRET=<random 64-char hex>
COOKIE_SECRET=<random 64-char hex>

# ── CORS ──────────────────────────────────────────────────────────────
STORE_CORS=https://vridhira.in
ADMIN_CORS=https://admin.vridhira.in
AUTH_CORS=https://vridhira.in,https://admin.vridhira.in

# ── Razorpay (Live Keys) ───────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=<your-webhook-secret>
RAZORPAY_ACCOUNT=<your-account-id>

# ── Shiprocket ────────────────────────────────────────────────────────
SHIPROCKET_EMAIL=your@email.com
SHIPROCKET_PASSWORD=yourpassword
SHIPROCKET_PICKUP_LOCATION=Primary
SHIPROCKET_WEBHOOK_TOKEN=<random-string>   # appended as ?token= in your webhook URL

# ── Resend ────────────────────────────────────────────────────────────
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Vridhira Marketplace <noreply@vridhira.in>

# ── Twilio (COD OTP) ─────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_PHONE=+918888888888   # E.164 format, your Twilio/DLT-registered number

# ── Google OAuth ──────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=https://vridhira.in/auth/google/callback

# ── Store ─────────────────────────────────────────────────────────────
STORE_URL=https://vridhira.in
NEXT_PUBLIC_COMPANY_NAME=Vridhira
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
STORE_CURRENCY=INR
MEDUSA_ADMIN_ONBOARDING_TYPE=nextjs
MEDUSA_ADMIN_ONBOARDING_NEXTJS_DIRECTORY=vridhira-marketplace-storefront
```

---

## 📊 Section 18 — Cost Breakdown

### 🎓 GitHub Student Pack Option (USE THIS NOW · ~₹0/month for ~11–16 months)

This is your current situation. Every service below costs nothing during the student period.

| Service | Provider | Cost | Student Perk |
|---------|----------|------|-------------|
| Storefront hosting | Vercel Hobby | Free | Free (no perk needed) |
| Backend hosting | DigitalOcean Droplet | **$0** | **$200 credit via Student Pack** |
| PostgreSQL | Neon free tier | Free | Free (no perk needed) |
| Redis | Upstash free tier | Free | Free (no perk needed) |
| Domain | Hostinger | Already owned | Already owned |
| **Total/month** | | **₹0/month** | for ~11–16 months |

> **How long credits last:**
> - 2 GB / 1 vCPU Droplet ($12/month): $200 ÷ $12 = **~16 months free**
> - 2 GB / 2 vCPU Droplet ($18/month): $200 ÷ $18 = **~11 months free**
>
> Credits are valid for **1 year from the date you claim them**, so claim only when ready
> to deploy. If you have not started earning by month 11–16, move to Hetzner (Option C
> in Section 15) which costs only ~₹460/month.

---

### 💸 After Student Credits End (site is earning · ~₹460–700/month)

| Service | Provider | Cost |
|---------|----------|------|
| Storefront hosting | Vercel Hobby | Free |
| Backend VPS | Hetzner CX22 (4 GB) | ~€5/month (~₹460) |
| PostgreSQL | Neon free tier (or Launch at $19 if > 0.5 GB) | Free → $19/month |
| Redis | Upstash pay-as-you-go | ~$1–2/month (~₹85–170) |
| **Total** | | **~₹550–2,300/month** |

### 🚀 Growth Option (50–500 orders/day)

| Service | Provider | Cost |
|---------|----------|------|
| Storefront hosting | Vercel Pro | $20/month (~₹1,700) |
| Backend VPS | Hetzner CX32 (8 GB) | ~€8/month (~₹740) |
| PostgreSQL | Neon Launch plan | $19/month (~₹1,600) |
| Redis | Upstash Pay-as-you-go | ~$2/month (~₹170) |
| **Total** | | **~₹4,200/month** |

> **Upgrade path:** Student Pack → After credits expire, Hetzner + free tiers (~₹460/month)
> → When revenue allows, upgrade Neon + Vercel Pro (~₹4,200/month for serious scale).

---

## 🔁 Section 19 — Complete Deployment Checklist

Follow these steps in order when you are ready to go live.

### Phase 1 — Set up databases
- [ ] Create account on [neon.tech](https://neon.tech)
- [ ] Create a new PostgreSQL project, region: Singapore
- [ ] Copy the connection string → save as `DATABASE_URL` in production env
- [ ] Create account on [upstash.com](https://upstash.com)
- [ ] Create a Redis database, region: Singapore
- [ ] Copy the Redis URL → save as `REDIS_URL` in production env

### Phase 2 — Set up backend server
- [ ] Claim $200 DigitalOcean credit at [education.github.com/pack](https://education.github.com/pack)
- [ ] Create a DigitalOcean Droplet (2 GB, Bangalore region) — see Section 15 Option A
- [ ] SSH into Droplet and install Coolify
- [ ] Push `vridhira-marketplace` to a private GitHub repo
- [ ] Deploy backend from GitHub repo via Coolify
- [ ] Set all production environment variables in Coolify's env UI
- [ ] Add `admin.vridhira.in` as custom domain in Coolify (SSL auto-provisioned)
- [ ] Add A record in Hostinger DNS: `admin` → Droplet IP
- [ ] Verify backend is live: `curl https://admin.vridhira.in/health` → should return `OK`
- [ ] Log in to Medusa admin at `https://admin.vridhira.in/app`
- [ ] Copy Publishable API Key from admin panel → Settings → API Keys

### Phase 3 — Configure DNS on Hostinger
- [ ] Log in to Hostinger hPanel → DNS Zone
- [ ] Add `admin` A or CNAME record pointing to your backend server
- [ ] Verify DNS propagation at [dnschecker.org](https://dnschecker.org/#A/admin.vridhira.in)

### Phase 4 — Set up storefront
- [ ] Add production env vars to `vridhira-marketplace-storefront/.env.local`
- [ ] Set `MEDUSA_BACKEND_URL=https://admin.vridhira.in`
- [ ] Set `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<key from Phase 2>`
- [ ] Deploy storefront to Vercel or Hostinger
- [ ] Verify storefront loads at `https://vridhira.in`

### Phase 5 — Configure all webhooks
- [ ] Razorpay: register `https://admin.vridhira.in/hooks/razorpay`
- [ ] Shiprocket: register `https://admin.vridhira.in/hooks/shiprocket?token=<SHIPROCKET_WEBHOOK_TOKEN>`
- [ ] Verify Razorpay webhook gives a test ping (200 OK)

### Phase 6 — Generate production secrets
- [ ] Generate and set `JWT_SECRET` (random 64-char hex)
- [ ] Generate and set `COOKIE_SECRET` (random 64-char hex)
- [ ] Switch Razorpay to Live mode keys
- [ ] Verify `RESEND_FROM_EMAIL` uses `@vridhira.in` (domain verified in Resend)

### Phase 7 — Set up Twilio for COD OTP (see Section 21)
- [ ] Create a Twilio account and purchase an SMS-capable number
- [ ] Set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` from the Twilio console
- [ ] Set `TWILIO_FROM_PHONE` in E.164 format (e.g. `+918888888888`)
- [ ] Register entity + OTP template on Vodafone DLT portal (required for Indian SMS delivery)
- [ ] Register your DLT sender ID in Twilio Console → Messaging → Sender IDs → India

### Phase 8 — Set up Google OAuth (see Section 22)
- [ ] Create OAuth 2.0 credentials in Google Cloud Console
- [ ] Add `https://vridhira.in/auth/google/callback` as Authorised Redirect URI
- [ ] Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend `.env`
- [ ] Publish the OAuth app (OAuth consent screen → Publish App) so all Google accounts can sign in
- [ ] Set `NEXT_PUBLIC_MEDUSA_BACKEND_URL` in storefront `.env.local` (needed by callback page)

### Phase 9 — End-to-end test
- [ ] Place a test order on `https://vridhira.in`
- [ ] Confirm order confirmation email arrives
- [ ] Confirm order appears in Medusa admin panel
- [ ] Simulate fulfillment in admin → confirm shipping email arrives
- [ ] Test Razorpay payment flow
- [ ] Test COD order flow; place one above ₹3,000 and confirm OTP SMS arrives
- [ ] Test Google Sign-In (new customer + returning customer)
- [ ] Sign up with a new email → confirm verification email arrives and link works
- [ ] Use Forgot Password → confirm reset email arrives and password change works

---

## 🔄 Section 20 — Email Automation: Subscribers & Workflows

The email system is built on MedusaJS v2 event architecture — every customer-facing
transactional email is fired by a **subscriber** that listens to a Medusa or Shiprocket
webhook event, then calls a **workflow** which queries the order and sends via Resend.

### Subscribers (`src/subscribers/`)

| File | Listens to | What it does |
|------|------------|--------------|
| `order-placed.ts` | `order.placed` | Auto-creates Shiprocket shipment + triggers shipment email on AWB |
| `order-placed-email.ts` | `order.placed` | Sends order confirmation email via `send-order-confirmation` workflow |
| `order-shipped-email.ts` | `order.fulfillment_created` | Sends shipping email after AWB generation |
| `order-delivered-email.ts` | `order.fulfillment_delivered` | Sends delivery confirmation email |
| `order-cancelled-email.ts` | `order.canceled` | Sends cancellation notice |
| `order-refunded-email.ts` | `return.created` | Sends refund initiated notice |

### Workflows (`src/workflows/`)

| File | Template used |
|------|--------------|
| `send-order-confirmation.ts` | `order-placed` |
| `send-order-shipped.ts` | `order-shipped` |
| `send-order-in-transit.ts` | `order-in-transit` |
| `send-order-out-for-delivery.ts` | `order-out-for-delivery` |
| `send-order-delivered.ts` | `order-delivered` |
| `send-order-cancelled.ts` | `order-cancelled` |
| `send-order-refunded.ts` | `order-refunded` |

Each workflow uses `useQueryGraphStep` to fetch the full order with
addresses, items, payments, and shipping methods — then passes the data
to `sendNotificationStep` which calls the Resend module.

### Auto-Shipment Flow (order-placed.ts)

When an order is placed the `order-placed` subscriber:
1. Checks `SHIPROCKET_EMAIL` is set (skips if placeholder/unconfigured)
2. Retrieves full order with items, addresses, and payments
3. Detects COD vs Prepaid from the payment provider ID
4. Builds a Shiprocket order payload
5. Creates the Shiprocket order → assigns cheapest available courier → generates AWB → schedules pickup
6. **Fire-and-forget** — shipment errors are logged but do NOT fail or roll back the order

> **Important:** This subscriber runs on every order placed. If Shiprocket is not yet
> configured, the check at step 1 short-circuits silently — no error is thrown to the customer.

---

## 📱 Section 21 — Twilio (COD OTP Verification)

Twilio sends a 6-digit OTP via SMS to customers who place COD orders above ₹3,000.
If Twilio credentials are missing or the SMS fails, the OTP step is **silently skipped** —
checkout is never blocked.

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_PHONE=+918888888888   # E.164 format
```

### Development — get credentials and test without real SMS

1. Go to [twilio.com](https://twilio.com) and create a **free trial account**
2. After signup, your dashboard shows **Account SID** and **Auth Token** at the top — copy both
3. In the left sidebar go to **Phone Numbers → Manage → Buy a Number**
   - Enable **SMS** capability (an Indian `+91…` number if available, otherwise any number)
   - Trial accounts get one free number
4. Copy the number in E.164 format → set as `TWILIO_FROM_PHONE`
5. Paste all three values into `.env`

**Trial account limitation:** Trial accounts can only send SMS to **verified phone numbers**.\
To verify a number: Twilio Console → **Verified Caller IDs → Add New Number** → verify via call or SMS.

**Testing without SMS:** Leave `TWILIO_ACCOUNT_SID` empty. The OTP step is skipped and logged
as `otp_skipped_reason: "twilio_unconfigured"`. All other checkout functionality works normally.

### Production — DLT registration required for India

Sending transactional SMS in India requires **DLT (Distributed Ledger Technology) registration**
mandated by TRAI. Without it SMS to Indian numbers is blocked by carriers.

**Step-by-step:**

1. **Upgrade Twilio to a paid account** (add billing) — trial accounts cannot reach unverified numbers
2. **Register on a DLT platform** — use Vodafone Idea's portal: [vilpowershop.vodafone.in](https://vilpowershop.vodafone.in)
   - **Entity registration** (your business): 1–2 business days, needs GST/CIN + business details
   - **Template registration**: submit the exact OTP message text, e.g.:
     `Your Vridhira Marketplace COD verification OTP is {#var#}. Valid for 10 minutes.`
3. **Get a 6-character Sender ID** (e.g. `VRDHIR`) linked to your brand
4. In Twilio Console → **Messaging → Sender IDs → India** — register your sender ID and DLT details
5. Once approved, Twilio delivers SMS to Indian numbers using your sender ID

**Alternative — MSG91 (Indian SMS gateway, built-in DLT support):**
Replace the `sendOtpViaTwilio()` function in `src/modules/cod-payment/service.ts` with MSG91's
REST API. The OTP logic (generate / hash / verify) stays identical — only the HTTP call changes.

| Mode | Provider | Cost |
|------|----------|------|
| Development | Twilio Trial | Free (verified numbers only) |
| Production (small volume) | Twilio Pay-as-you-go | ~$0.0075/SMS (~₹0.62) |
| Production (high volume / India) | MSG91 | ~₹0.20–₹0.30/SMS |

> **Bottom line for launch:** Leave Twilio unconfigured during development (OTP is skipped).
> Before enabling COD for orders > ₹3,000 in production, complete DLT registration or switch to MSG91.

---

## 🔐 Section 22 — Google Sign-In (OAuth 2.0)

Google OAuth lets customers sign up and log in with their Google account alongside the standard
email/password flow. The backend uses `@medusajs/medusa/auth-google`.

```env
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:8000/auth/google/callback   # dev
# GOOGLE_CALLBACK_URL=https://vridhira.in/auth/google/callback  # prod
```

### Development — create credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in
2. **Select a project → New Project** → name it `Vridhira Marketplace` → Create
3. Left sidebar → **APIs & Services → OAuth consent screen**
   - User Type: **External**
   - Fill in **App name**, **User support email**, **Developer contact email**
   - Scopes: add `email`, `profile`, `openid`
   - **Test users**: add your own Google email address (required while app is in Testing mode)
   - Save and Continue through all steps
4. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Vridhira Storefront`
   - **Authorised JavaScript origins:** `http://localhost:8000`
   - **Authorised redirect URIs:** `http://localhost:8000/auth/google/callback`
   - Click **Create**
5. Copy **Client ID** → `GOOGLE_CLIENT_ID`
6. Copy **Client secret** → `GOOGLE_CLIENT_SECRET`
7. Set `GOOGLE_CALLBACK_URL=http://localhost:8000/auth/google/callback` in `.env`

**During development**, only emails you added as Test Users can sign in with Google.\
Once you are satisfied, publish the app (next section).

### Production — update to live domain

1. In Google Cloud Console → **Credentials → your OAuth client → Edit (pencil icon)**
2. **Authorised JavaScript origins** — add `https://vridhira.in`
3. **Authorised redirect URIs** — add `https://vridhira.in/auth/google/callback`
   (keep the localhost entries — they don't affect production)
4. Update production `.env`:
   ```env
   GOOGLE_CALLBACK_URL=https://vridhira.in/auth/google/callback
   ```
5. **OAuth consent screen → Publish App** — allows all Google accounts to sign in
   (not just Test Users). Google reviews basic-scope apps instantly in most cases.

### Key rules

| Variable | Where | Rule |
|----------|-------|------|
| `GOOGLE_CLIENT_ID` | backend `.env` | Public identifier — safe to expose |
| `GOOGLE_CLIENT_SECRET` | backend `.env` | **Secret — never in `NEXT_PUBLIC_` env vars** |
| `GOOGLE_CALLBACK_URL` | backend `.env` | Must **exactly match** the URI registered in Google Console |

> The callback URL must match character-for-character (including trailing slashes).
> Even one difference causes a `redirect_uri_mismatch` OAuth error.

---

## 🔒 Section 23 — Email Verification & Password Reset

These features reuse your existing `JWT_SECRET` and `STORE_URL` — **no new env vars required**.

### Email verification

| Step | What happens |
|------|-------------|
| Customer signs up | Storefront fires `POST /store/auth/send-verification` (fire-and-forget) |
| Backend | Generates HMAC-SHA256 token (signed with `JWT_SECRET`, 24h expiry, nothing stored server-side) |
| Email | Verification link: `{STORE_URL}/auth/verify-email?token=xxx` |
| Customer clicks link | `GET /store/auth/verify-email` validates token → sets `customer.metadata.email_verified = true` |
| Expired link | Returns descriptive error; customer can request a new link by logging in |

Token format (base64url-encoded): `customerId:email:expiresAt:hmac`

> **If you rotate `JWT_SECRET`**, all outstanding verification tokens become invalid.
> Password reset tokens are managed by Medusa internally and are unaffected.

### Password reset

| Step | What happens |
|------|-------------|
| Customer clicks "Forgot password?" | Enters email; storefront calls Medusa's emailpass reset endpoint |
| Medusa | Fires `auth.password_reset` event with a signed reset token (Medusa manages expiry — 15 min) |
| Subscriber | `auth-password-reset.ts` catches event → sends `password-reset` email via Resend |
| Reset link | `{STORE_URL}/{countryCode}/account/reset-password?token=xxx&email=xxx` |
| Customer sets new password | Storefront calls `sdk.auth.updateProvider` with the token |

Always returns `{ success: true }` from `requestPasswordReset` regardless of whether the
email exists — **no account enumeration**.

### Env vars that affect auth features

| Variable | Effect |
|----------|--------|
| `JWT_SECRET` | HMAC key for email verification tokens — must be the same on every server instance |
| `STORE_URL` | Base URL for verification + reset links in emails |
| `RESEND_API_KEY` | Delivers both emails |

### Disposable email blocking

Sign-ups from ~60 known temp-mail domains are blocked **client-side** before the request is sent.

**File:** `src/lib/util/disposable-email.ts` (storefront)

Blocked providers include: Mailinator, Guerrilla Mail, Yopmail, 10MinuteMail, TempMail,
Trashmail, FakeInbox, Dispostable, Throwam, Nada, Spam4, and more.

To add extra domains: edit the `DISPOSABLE_DOMAINS` array in that file.

---

*Last updated: **February 24, 2026** · Vridhira Marketplace v2 · Built on MedusaJS v2.13.1*

---

## 🔍 Section 24 — Algolia Search

Algolia is an optional hosted search provider. The module loads safely even if credentials
are missing — it simply warns on startup and skips indexing.

### Required env vars (backend)

```dotenv
# ── Algolia Search ──────────────────────────────────────────────────────────
# Get from: https://dashboard.algolia.com/account/api-keys
# Use the "Admin API Key" (not the Search-Only key) — it has write access.

ALGOLIA_APP_ID=your-algolia-app-id
ALGOLIA_API_KEY=your-algolia-admin-api-key
ALGOLIA_PRODUCT_INDEX_NAME=products
```

### Activate Algolia

1. Create an Algolia account at <https://www.algolia.com/>
2. Create an Application + Index named `products` (or your chosen name)
3. Copy the **Application ID** and **Admin API Key** from Dashboard → API Keys
4. Set the three env vars above and restart the backend
5. In the admin panel: **Search Engine → Provider** → select **Algolia** → "Set as Active"
6. Click **Sync Now** to do a full initial index

### How it works

- `product.created` / `product.updated` → upserts product in Algolia automatically
- `product.deleted` → removes from index automatically
- Unpublished products are removed from the index during any sync
- Full reindex: POST `/admin/algolia/sync` or use Admin → Search Engine → Sync Now

---

## 🔍 Section 25 — Meilisearch + Search Engine Admin UI

Meilisearch is an open-source, self-hosted (or cloud) search engine alternative to Algolia.
Both Algolia and Meilisearch modules are registered simultaneously — only the active
provider is called.

### Required env vars (backend)

```dotenv
# ── Meilisearch ─────────────────────────────────────────────────────────────
# Self-hosted: https://www.meilisearch.com/docs/learn/getting_started/installation
# Cloud: https://cloud.meilisearch.com
# Use the Master Key (full access) for MEILISEARCH_API_KEY (backend only).

MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-meilisearch-master-key
MEILISEARCH_PRODUCT_INDEX_NAME=products
```

### Run Meilisearch locally (Docker)

```bash
docker run -it --rm -p 7700:7700 \
  -e MEILI_MASTER_KEY=your-meilisearch-master-key \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:latest
```

Dashboard available at `http://localhost:7700`.

### Activate Meilisearch

1. Start a Meilisearch instance (Docker locally or <https://cloud.meilisearch.com> in prod)
2. Copy the host URL and master key
3. Set the three env vars above and restart the backend
4. Admin → **Search Engine → Provider** → select **Meilisearch** → "Set as Active"
5. Click **Sync Now** — all products are reindexed automatically in the background

### Search Engine Admin UI

Available at: **Admin → Search Engine** (sidebar icon: magnifying glass)

| Tab | What it does |
|-----|-------------|
| **Provider** | Select between Algolia / Meilisearch / Default; changing saves and triggers reindex |
| **Env Keys** | Shows which env vars are set or missing for the selected provider |
| **Features** | Toggle typo tolerance, faceting, highlighting; edit searchable / filterable / sortable attributes; Meilisearch settings are applied live to the index on save |

### Provider config file

The active provider selection and feature settings are stored in `.search-config.json`
at the backend project root. This file is created automatically on first use and should
**not be committed to git**.

```json
{
  "activeProvider": "meilisearch",
  "algoliaFeatures": { "typoTolerance": true, "highlights": true, "analytics": false, "searchableAttributes": ["title", "description", "handle"] },
  "meilisearchFeatures": { "typoTolerance": true, "faceting": true, "highlighting": true, "searchableAttributes": ["title", "description", "handle"], "filterableAttributes": ["categories.name", "tags.value", "status"], "sortableAttributes": ["title"] }
}
```

### Default (Medusa) fallback

Selecting **Default** in the admin UI routes no events to either Algolia or Meilisearch.
Medusa's built-in database search remains active. Use this if both external providers
are unavailable or during initial setup.

### Production checklist — Search

- [ ] Decide on provider: Algolia (hosted, zero-ops) vs Meilisearch (self-hosted, cheaper)
- [ ] Set the three provider env vars in the production `.env`
- [ ] Restart the backend after setting env vars
- [ ] Select + activate the provider from Admin → Search Engine → Provider tab
- [ ] Click Sync Now to build the initial index
- [ ] Wire the storefront search box to the provider SDK (follow-up work)

