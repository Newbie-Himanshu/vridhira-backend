import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getAccessToken, runReport, resolveGAConfig, getCachedReport } from "../_lib"

// ── GET /admin/custom/ga4/acquisition?days=30 ──────────────────────────────
// Customer Acquisition: Traffic sources, channel revenue, campaign ROI

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hasMeasId = !!process.env.GA_MEASUREMENT_ID?.trim()
  const cfg = resolveGAConfig(hasMeasId)
  if (!cfg.ok) return res.json(cfg.missingResponse)
  const { key, propertyId } = cfg

  const { days = "30" } = req.query as Record<string, string>
  const daysNum = Math.max(1, Math.min(90, Number(days) || 30))
  const range   = { startDate: `${daysNum}daysAgo`, endDate: "today" }
  const cacheKey = `acquisition:${propertyId}:${daysNum}`

  try {
    const token = await getAccessToken(key)

    const result = await getCachedReport(cacheKey, async () => {
      const [sourcesData, channelsData, campaignsData] = await Promise.all([
        // 1. Traffic sources (source/medium)
        runReport(token, propertyId, {
          dateRanges: [range],
          dimensions: [{ name: "sessionSourceMedium" }],
          metrics: [
            { name: "sessions" },
            { name: "activeUsers" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 20,
        }),
        // 2. Channel revenue
        runReport(token, propertyId, {
          dateRanges: [range],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [
            { name: "sessions" },
            { name: "purchaseRevenue" },
            { name: "transactions" },
            { name: "sessionConversionRate" },
          ],
          orderBys: [{ metric: { metricName: "purchaseRevenue" }, desc: true }],
        }),
        // 3. Campaign ROI
        runReport(token, propertyId, {
          dateRanges: [range],
          dimensions: [{ name: "sessionCampaignName" }],
          metrics: [
            { name: "sessions" },
            { name: "purchaseRevenue" },
            { name: "transactions" },
            { name: "activeUsers" },
          ],
          orderBys: [{ metric: { metricName: "purchaseRevenue" }, desc: true }],
          limit: 15,
          dimensionFilter: {
            notExpression: {
              filter: {
                fieldName: "sessionCampaignName",
                stringFilter: { matchType: "EXACT", value: "(not set)" },
              },
            },
          },
        }),
      ])

      const sources = (sourcesData.rows ?? []).map((row: any) => ({
        source:        row.dimensionValues?.[0]?.value ?? "(unknown)",
        sessions:      Number(row.metricValues?.[0]?.value ?? 0),
        users:         Number(row.metricValues?.[1]?.value ?? 0),
        bounce_rate:   parseFloat((Number(row.metricValues?.[2]?.value ?? 0) * 100).toFixed(1)),
        avg_duration:  Math.round(Number(row.metricValues?.[3]?.value ?? 0)),
      }))

      const channels = (channelsData.rows ?? []).map((row: any) => ({
        channel:         row.dimensionValues?.[0]?.value ?? "(unknown)",
        sessions:        Number(row.metricValues?.[0]?.value ?? 0),
        revenue:         parseFloat(Number(row.metricValues?.[1]?.value ?? 0).toFixed(2)),
        transactions:    Number(row.metricValues?.[2]?.value ?? 0),
        conversion_rate: parseFloat((Number(row.metricValues?.[3]?.value ?? 0) * 100).toFixed(2)),
      }))

      const campaigns = (campaignsData.rows ?? []).map((row: any) => ({
        campaign:     row.dimensionValues?.[0]?.value ?? "(unknown)",
        sessions:     Number(row.metricValues?.[0]?.value ?? 0),
        revenue:      parseFloat(Number(row.metricValues?.[1]?.value ?? 0).toFixed(2)),
        transactions: Number(row.metricValues?.[2]?.value ?? 0),
        users:        Number(row.metricValues?.[3]?.value ?? 0),
      }))

      return {
        configured:  true,
        days:        daysNum,
        property_id: propertyId,
        sources,
        channels,
        campaigns,
      }
    })

    return res.json(result)
  } catch (err: any) {
    const activationUrl: string | undefined = err?.activationUrl
    return res.json({
      configured:     true,
      property_id:    propertyId,
      error:          err?.message ?? "Failed to fetch GA4 acquisition data",
      activation_url: activationUrl,
      hint: activationUrl
        ? "Enable the Google Analytics Data API in your Google Cloud project."
        : "Ensure the service account has Viewer access on the GA4 property.",
    })
  }
}
