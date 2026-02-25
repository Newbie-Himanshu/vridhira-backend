import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getAccessToken, runReport, resolveGAConfig, getCachedReport } from "../_lib"

// ── GET /admin/custom/ga4/products?days=30 ─────────────────────────────────
// Product Performance: Top sellers, views, add-to-cart, purchases, refunds

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hasMeasId = !!process.env.GA_MEASUREMENT_ID?.trim()
  const cfg = resolveGAConfig(hasMeasId)
  if (!cfg.ok) return res.json(cfg.missingResponse)
  const { key, propertyId } = cfg

  const { days = "30" } = req.query as Record<string, string>
  const daysNum = Math.max(1, Math.min(90, Number(days) || 30))
  const range   = { startDate: `${daysNum}daysAgo`, endDate: "today" }
  const cacheKey = `products:${propertyId}:${daysNum}`

  try {
    const token = await getAccessToken(key)

    const result = await getCachedReport(cacheKey, async () => {
      const [productsData, summaryData] = await Promise.all([
        // 1. Per-item breakdown
        runReport(token, propertyId, {
          dateRanges: [range],
          dimensions: [{ name: "itemName" }, { name: "itemId" }],
          metrics: [
            { name: "itemRevenue" },
            { name: "itemsPurchased" },
            { name: "itemsViewed" },
            { name: "itemsAddedToCart" },
            { name: "itemRefundAmount" },
          ],
          orderBys: [{ metric: { metricName: "itemRevenue" }, desc: true }],
          limit: 25,
        }),
        // 2. Overall product summary totals
        runReport(token, propertyId, {
          dateRanges: [range],
          metrics: [
            { name: "itemRevenue" },
            { name: "itemsPurchased" },
            { name: "itemsViewed" },
            { name: "itemsAddedToCart" },
            { name: "itemRefundAmount" },
          ],
        }),
      ])

      const products = (productsData.rows ?? []).map((row: any) => {
        const name    = row.dimensionValues?.[0]?.value ?? "(unknown)"
        const id      = row.dimensionValues?.[1]?.value ?? ""
        const revenue = parseFloat(Number(row.metricValues?.[0]?.value ?? 0).toFixed(2))
        const purchased      = Number(row.metricValues?.[1]?.value ?? 0)
        const viewed         = Number(row.metricValues?.[2]?.value ?? 0)
        const added_to_cart  = Number(row.metricValues?.[3]?.value ?? 0)
        const refund_amount  = parseFloat(Number(row.metricValues?.[4]?.value ?? 0).toFixed(2))
        const cart_to_detail = viewed > 0 ? parseFloat((added_to_cart / viewed * 100).toFixed(1)) : 0
        const buy_to_detail  = viewed > 0 ? parseFloat((purchased     / viewed * 100).toFixed(1)) : 0
        return { name, id, revenue, purchased, viewed, added_to_cart, refund_amount, cart_to_detail, buy_to_detail }
      })

      const sRow = summaryData.rows?.[0]
      const sv   = (i: number) => Number(sRow?.metricValues?.[i]?.value ?? 0)
      const totals = {
        revenue:       parseFloat(sv(0).toFixed(2)),
        purchased:     sv(1),
        viewed:        sv(2),
        added_to_cart: sv(3),
        refund_amount: parseFloat(sv(4).toFixed(2)),
      }

      return {
        configured:  true,
        days:        daysNum,
        property_id: propertyId,
        products,
        totals,
      }
    })

    return res.json(result)
  } catch (err: any) {
    const activationUrl: string | undefined = err?.activationUrl
    return res.json({
      configured:     true,
      property_id:    propertyId,
      error:          err?.message ?? "Failed to fetch GA4 product data",
      activation_url: activationUrl,
      hint: activationUrl
        ? "Enable the Google Analytics Data API in your Google Cloud project."
        : "Ensure the service account has Viewer access on the GA4 property.",
    })
  }
}
