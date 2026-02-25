/**
 * Shared utilities for all GA4 admin backend routes.
 * Medusa ignores files prefixed with `_` so this is never registered as a route.
 *
 * Exports:
 *   ServiceAccountKey   — type for parsed service-account JSON
 *   getAccessToken()    — JWT → OAuth2 exchange, cached until 60 s before expiry
 *   runReport()         — POST to GA4 Data API v1beta REST endpoint
 *   getCachedReport()   — 15-minute in-memory cache wrapper around runReport
 */

import { createSign } from "crypto"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ServiceAccountKey = { client_email: string; private_key: string }

type TokenCache  = { token: string; expiresAt: number }
type ReportCache = { data: unknown; expiresAt: number }

// ── In-memory singletons (module-level — shared across all route files) ───────

let _tokenCache: TokenCache | null                = null
const _reportCache = new Map<string, ReportCache>()
const CACHE_TTL_MS = 15 * 60 * 1000  // 15 minutes

// ── Service-account JWT → OAuth2 access token ─────────────────────────────────

export async function getAccessToken(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (_tokenCache && _tokenCache.expiresAt > now + 60) return _tokenCache.token

  const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(JSON.stringify({
    iss:   key.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  })).toString("base64url")

  const sign = createSign("RSA-SHA256")
  sign.update(`${header}.${payload}`)
  const sig = sign.sign(key.private_key, "base64url")
  const jwt = `${header}.${payload}.${sig}`

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Token exchange failed (${resp.status}): ${text}`)
  }
  const data: any = await resp.json()
  _tokenCache = { token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) }
  return _tokenCache.token
}

// ── GA4 Data API REST helper ───────────────────────────────────────────────────

export async function runReport(
  token:      string,
  propertyId: string,
  body:       object,
): Promise<any> {
  const url  = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`
  const resp = await fetch(url, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text()
    let message = `GA4 API error (${resp.status})`
    let activationUrl: string | undefined
    try {
      const errJson = JSON.parse(text)
      const errObj  = errJson?.error
      if (errObj?.message) message = errObj.message
      for (const detail of errObj?.details ?? []) {
        if (detail?.metadata?.activationUrl) {
          activationUrl = detail.metadata.activationUrl
          break
        }
        for (const link of detail?.links ?? []) {
          if ((link?.url as string)?.includes("analyticsdata")) {
            activationUrl = link.url
            break
          }
        }
        if (activationUrl) break
      }
    } catch { /* not JSON */ }
    const err = new Error(message) as any
    if (activationUrl) err.activationUrl = activationUrl
    throw err
  }
  return resp.json()
}

// ── 15-minute in-memory cache wrapper ─────────────────────────────────────────

export async function getCachedReport(
  cacheKey: string,
  fetcher:  () => Promise<unknown>,
): Promise<unknown> {
  const now    = Date.now()
  const cached = _reportCache.get(cacheKey)
  if (cached && cached.expiresAt > now) return cached.data
  const data = await fetcher()
  _reportCache.set(cacheKey, { data, expiresAt: now + CACHE_TTL_MS })
  return data
}

// ── Env-var guard helper ───────────────────────────────────────────────────────
// Returns { ok: true, key, propertyId } or { ok: false, missingResponse }

export function resolveGAConfig(hasMeasId: boolean):
  | { ok: true;  key: ServiceAccountKey; propertyId: string }
  | { ok: false; missingResponse: object }
{
  const propertyId = process.env.GA_PROPERTY_ID?.trim()
  const rawKey     = process.env.GA_SERVICE_ACCOUNT_KEY?.trim()

  if (!propertyId || !rawKey) {
    return {
      ok: false,
      missingResponse: {
        configured:           false,
        measurement_tracking: hasMeasId,
        missing: [
          ...(!propertyId ? ["GA_PROPERTY_ID"]         : []),
          ...(!rawKey     ? ["GA_SERVICE_ACCOUNT_KEY"]  : []),
        ],
      },
    }
  }

  try {
    const key: ServiceAccountKey = JSON.parse(rawKey)
    return { ok: true, key, propertyId }
  } catch {
    return {
      ok: false,
      missingResponse: {
        configured:           false,
        measurement_tracking: hasMeasId,
        missing:              ["GA_SERVICE_ACCOUNT_KEY (invalid JSON)"],
      },
    }
  }
}
