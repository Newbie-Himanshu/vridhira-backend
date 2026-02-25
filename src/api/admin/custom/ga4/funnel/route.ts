import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getAccessToken, runReport, resolveGAConfig, getCachedReport } from "../_lib"

// ── GET /admin/custom/ga4/funnel?days=30 ───────────────────────────────────
// Shopping Behavior Funnel: view_item → add_to_cart → begin_checkout → purchase
// Calculates step-to-step drop-off and overall abandonment rate.

const FUNNEL_EVENTS = ["view_item", "add_to_cart", "begin_checkout", "purchase"]

const FUNNEL_LABELS: Record<string, string> = {
  view_item:       "View Item",
  add_to_cart:     "Add to Cart",
  begin_checkout:  "Begin Checkout",
  purchase:        "Purchase",
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hasMeasId = !!process.env.GA_MEASUREMENT_ID?.trim()
  const cfg = resolveGAConfig(hasMeasId)
  if (!cfg.ok) return res.json(cfg.missingResponse)
  const { key, propertyId } = cfg

  const { days = "30" } = req.query as Record<string, string>
  const daysNum = Math.max(1, Math.min(90, Number(days) || 30))
  const range   = { startDate: `${daysNum}daysAgo`, endDate: "today" }
  const cacheKey = `funnel:${propertyId}:${daysNum}`

  try {
    const token = await getAccessToken(key)

    const result = await getCachedReport(cacheKey, async () => {
      const [funnelData, dailyData] = await Promise.all([
        // 1. Total funnel event counts
        runReport(token, propertyId, {
          dateRanges: [range],
          dimensions: [{ name: "eventName" }],
          metrics:    [{ name: "eventCount" }],
          dimensionFilter: {
            filter: {
              fieldName: "eventName",
              inListFilter: { values: FUNNEL_EVENTS },
            },
          },
        }),
        // 2. Daily funnel breakdown for sparklines
        runReport(token, propertyId, {
          dateRanges: [range],
          dimensions: [{ name: "date" }, { name: "eventName" }],
          metrics:    [{ name: "eventCount" }],
          dimensionFilter: {
            filter: {
              fieldName: "eventName",
              inListFilter: { values: FUNNEL_EVENTS },
            },
          },
          orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
        }),
      ])

      // Build event count map
      const countMap: Record<string, number> = {}
      for (const row of (funnelData.rows ?? [])) {
        const name  = row.dimensionValues?.[0]?.value ?? ""
        const count = Number(row.metricValues?.[0]?.value ?? 0)
        countMap[name] = count
      }

      // Build ordered funnel steps with drop-off
      const steps = FUNNEL_EVENTS.map((event, i) => {
        const count    = countMap[event] ?? 0
        const prev     = i > 0 ? (countMap[FUNNEL_EVENTS[i - 1]] ?? 0) : count
        const drop_off = prev > 0 ? parseFloat(((prev - count) / prev * 100).toFixed(1)) : 0
        const retained = prev > 0 ? parseFloat((count / prev * 100).toFixed(1)) : 100
        return {
          event,
          label:     FUNNEL_LABELS[event],
          count,
          drop_off,  // % lost from previous step
          retained,  // % kept from previous step
        }
      })

      // Abandonment rate = (add_to_cart - purchase) / add_to_cart
      const atc      = countMap["add_to_cart"]  ?? 0
      const purchase = countMap["purchase"]      ?? 0
      const abandonment_rate = atc > 0
        ? parseFloat(((atc - purchase) / atc * 100).toFixed(1))
        : 0

      // Daily funnel map: { date → { event → count } }
      const dailyMap: Record<string, Record<string, number>> = {}
      for (const row of (dailyData.rows ?? [])) {
        const date  = row.dimensionValues?.[0]?.value ?? ""
        const event = row.dimensionValues?.[1]?.value ?? ""
        const count = Number(row.metricValues?.[0]?.value ?? 0)
        if (!dailyMap[date]) dailyMap[date] = {}
        dailyMap[date][event] = count
      }
      const daily_funnel = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, events]) => ({
          date,
          view_item:      events["view_item"]      ?? 0,
          add_to_cart:    events["add_to_cart"]    ?? 0,
          begin_checkout: events["begin_checkout"] ?? 0,
          purchase:       events["purchase"]       ?? 0,
        }))

      return {
        configured:       true,
        days:             daysNum,
        property_id:      propertyId,
        steps,
        abandonment_rate,
        daily_funnel,
      }
    })

    return res.json(result)
  } catch (err: any) {
    const activationUrl: string | undefined = err?.activationUrl
    return res.json({
      configured:     true,
      property_id:    propertyId,
      error:          err?.message ?? "Failed to fetch GA4 funnel data",
      activation_url: activationUrl,
      hint: activationUrl
        ? "Enable the Google Analytics Data API in your Google Cloud project."
        : "Ensure the service account has Viewer access on the GA4 property.",
    })
  }
}
