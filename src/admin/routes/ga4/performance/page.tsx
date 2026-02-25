import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar, ArrowUpRightOnBox } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import {
  useGA4Hotkeys,
  GA4PageHeader,
  MetricCard,
  LoadingState,
  ErrorState,
  APIErrorState,
  inr,
  fmt,
  fmtPct,
  sdk,
} from "../../../lib/ga4-shared"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TrendRow = {
  date: string
  revenue: number
  transactions: number
  sessions: number
}

type PerformanceData = {
  configured: true
  days: number
  property_id: string
  revenue: number
  orders: number
  aov: number
  conversion_rate: number
  sessions: number
  trend: TrendRow[]
  error?: string
  hint?: string
  activation_url?: string
}

type NotConfigured = {
  configured: false
  measurement_tracking: boolean
  missing: string[]
}

type Response = PerformanceData | NotConfigured

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const PerformancePage = () => {
  useGA4Hotkeys()
  const [days, setDays] = useState(30)

  const { data, isLoading, isError, refetch } = useQuery<Response>({
    queryKey: ["ga4-performance", days],
    queryFn: () => sdk.client.fetch<Response>(`/admin/custom/ga4/performance?days=${days}`),
    staleTime: 15 * 60 * 1000,
    retry: false,
  })

  if (isLoading) return <LoadingState />
  if (isError || !data) return <ErrorState onRetry={refetch} />
  if (!data.configured) {
    return (
      <Container className="flex flex-col gap-3">
        <Text className="text-ui-fg-error">
          Missing env vars: {(data as NotConfigured).missing.join(", ")}
        </Text>
      </Container>
    )
  }

  const d = data as PerformanceData
  if (d.error) return <APIErrorState error={d.error} hint={d.hint} activationUrl={d.activation_url} propertyId={d.property_id} />

  // Revenue trend — last 14 rows reversed (newest first)
  const trendRows = [...d.trend].reverse().slice(0, 14)

  // Peak revenue day
  const peakDay = d.trend.reduce(
    (best, row) => (row.revenue > (best?.revenue ?? 0) ? row : best),
    d.trend[0] ?? null,
  )

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <GA4PageHeader title="Core Performance" propertyId={d.property_id} days={days} onDaysChange={setDays} />

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Revenue"
          value={inr(d.revenue)}
          sub={`Last ${d.days} days`}
          highlight={d.revenue > 0 ? "green" : undefined}
        />
        <MetricCard
          label="Orders"
          value={String(d.orders)}
          sub="Completed purchases"
        />
        <MetricCard
          label="Avg. Order Value"
          value={inr(d.aov)}
          sub="Revenue ÷ orders"
        />
        <MetricCard
          label="Conversion Rate"
          value={fmtPct(d.conversion_rate)}
          sub="Sessions → purchase"
          highlight={d.conversion_rate >= 2 ? "green" : d.conversion_rate > 0 ? undefined : "red"}
        />
      </div>

      {/* ── Secondary KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Total Sessions"
          value={fmt(d.sessions)}
          sub="Within date range"
        />
        {peakDay && (
          <MetricCard
            label="Peak Revenue Day"
            value={inr(peakDay.revenue)}
            sub={`${peakDay.date.slice(0,4)}-${peakDay.date.slice(4,6)}-${peakDay.date.slice(6,8)}`}
            highlight="green"
          />
        )}
      </div>

      {/* ── Revenue Trend Table ─────────────────────────────────────────── */}
      {trendRows.length > 0 && (
        <Container className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Heading level="h2">Daily Revenue Trend</Heading>
            <Badge color="grey" size="xsmall">{d.days} days</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ui-border-base text-ui-fg-muted">
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2 text-right font-medium pr-4">Revenue</th>
                  <th className="pb-2 text-right font-medium pr-4">Orders</th>
                  <th className="pb-2 text-right font-medium">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-base">
                {trendRows.map((row) => {
                  const label = `${row.date.slice(0,4)}-${row.date.slice(4,6)}-${row.date.slice(6,8)}`
                  return (
                    <tr key={row.date} className="text-ui-fg-base hover:bg-ui-bg-subtle transition-colors">
                      <td className="py-2 font-mono text-ui-fg-subtle">{label}</td>
                      <td className="py-2 text-right pr-4 tabular-nums font-medium">
                        {row.revenue > 0 ? inr(row.revenue) : <span className="text-ui-fg-muted">—</span>}
                      </td>
                      <td className="py-2 text-right pr-4 tabular-nums">
                        {row.transactions > 0 ? row.transactions : <span className="text-ui-fg-muted">—</span>}
                      </td>
                      <td className="py-2 text-right tabular-nums text-ui-fg-subtle">
                        {fmt(row.sessions)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Container>
      )}

      {/* ── Open GA4 CTA ──────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="small"
          onClick={() => window.open(
            `https://analytics.google.com/analytics/web/#/a366168585p${d.property_id}/reports/monetization-overview`,
            "_blank"
          )}
        >
          Full Monetization Report in GA4
          <ArrowUpRightOnBox />
        </Button>
      </div>
    </div>
  )
}

export default PerformancePage

export const config = defineRouteConfig({
  label: "Performance",
  icon:  CurrencyDollar,
})
