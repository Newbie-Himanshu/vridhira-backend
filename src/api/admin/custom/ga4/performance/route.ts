import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getAccessToken, runReport, resolveGAConfig, getCachedReport } from "../_lib"

// ── GET /admin/custom/ga4/performance?days=30 ──────────────────────────────
// Core Performance: Revenue, Orders, AOV, Conversion Rate, Daily Trend

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hasMeasId = !!process.env.GA_MEASUREMENT_ID?.trim()
  const cfg = resolveGAConfig(hasMeasId)
  if (!cfg.ok) return res.json(cfg.missingResponse)
  const { key, propertyId } = cfg

  const { days = "30" } = req.query as Record<string, string>
  const daysNum = Math.max(1, Math.min(90, Number(days) || 30))
  const range   = { startDate: `${daysNum}daysAgo`, endDate: "today" }
  const cacheKey = `performance:${propertyId}:${daysNum}`

  try {
    const token = await getAccessToken(key)

    const result = await getCachedReport(cacheKey, async () => {
      const [kpiData, trendData] = await Promise.all([
        // 1. KPI summary
        runReport(token, propertyId, {
          dateRanges: [range],
          metrics: [
            { name: "purchaseRevenue" },
            { name: "transactions" },
            { name: "averagePurchaseRevenue" },
            { name: "sessionConversionRate" },
            { name: "sessions" },
          ],
        }),
        // 2. Daily revenue trend
        runReport(token, propertyId, {
          dateRanges: [range],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "purchaseRevenue" },
            { name: "transactions" },
            { name: "sessions" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
        }),
      ])

      const kRow = kpiData.rows?.[0]
      const kv   = (i: number) => Number(kRow?.metricValues?.[i]?.value ?? 0)

      const revenue         = parseFloat(kv(0).toFixed(2))
      const orders          = kv(1)
      const aov             = parseFloat(kv(2).toFixed(2))
      const conversion_rate = parseFloat((kv(3) * 100).toFixed(2))
      const sessions        = kv(4)

      const trend = (trendData.rows ?? []).map((row: any) => ({
        date:         row.dimensionValues?.[0]?.value ?? "",
        revenue:      parseFloat(Number(row.metricValues?.[0]?.value ?? 0).toFixed(2)),
        transactions: Number(row.metricValues?.[1]?.value ?? 0),
        sessions:     Number(row.metricValues?.[2]?.value ?? 0),
      }))

      return {
        configured:  true,
        days:        daysNum,
        property_id: propertyId,
        revenue,
        orders,
        aov,
        conversion_rate,
        sessions,
        trend,
      }
    })

    return res.json(result)
  } catch (err: any) {
    const activationUrl: string | undefined = err?.activationUrl
    return res.json({
      configured:     true,
      property_id:    propertyId,
      error:          err?.message ?? "Failed to fetch GA4 performance data",
      activation_url: activationUrl,
      hint: activationUrl
        ? "Enable the Google Analytics Data API in your Google Cloud project."
        : "Ensure the service account has Viewer access on the GA4 property.",
    })
  }
}
