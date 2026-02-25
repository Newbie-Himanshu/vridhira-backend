import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartBar, ArrowUpRightOnBox } from "@medusajs/icons"
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
  fmtPct,
  fmt,
  sdk,
} from "../../../lib/ga4-shared"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type FunnelStep = {
  event: string
  label: string
  count: number
  drop_off: number   // % lost vs previous step
  retained: number   // % retained vs previous step
}

type DailyFunnelRow = {
  date: string
  view_item: number
  add_to_cart: number
  begin_checkout: number
  purchase: number
}

type FunnelData = {
  configured: true
  days: number
  property_id: string
  steps: FunnelStep[]
  abandonment_rate: number
  daily_funnel: DailyFunnelRow[]
  error?: string
  hint?: string
  activation_url?: string
}

type NotConfigured = {
  configured: false
  measurement_tracking: boolean
  missing: string[]
}

type Response = FunnelData | NotConfigured

// ─────────────────────────────────────────────────────────────────────────────
// Visual funnel bar component
// ─────────────────────────────────────────────────────────────────────────────

const STEP_COLORS = [
  "bg-ui-tag-blue-bg   border-ui-tag-blue-border",
  "bg-ui-tag-green-bg  border-ui-tag-green-border",
  "bg-ui-tag-orange-bg border-ui-tag-orange-border",
  "bg-ui-tag-red-bg    border-ui-tag-red-border",
]

const FunnelBar = ({ steps }: { steps: FunnelStep[] }) => {
  const maxCount = steps[0]?.count ?? 1
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, i) => {
        const widthPct = maxCount > 0 ? Math.max(4, (step.count / maxCount) * 100) : 4
        return (
          <div key={step.event} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-ui-fg-muted w-4">{i + 1}</span>
                <Text size="small" className="font-medium">{step.label}</Text>
              </div>
              <div className="flex items-center gap-3">
                <Text size="small" className="tabular-nums font-mono text-ui-fg-base">
                  {fmt(step.count)}
                </Text>
                {i > 0 && step.drop_off > 0 && (
                  <Badge
                    color={step.drop_off > 60 ? "red" : step.drop_off > 30 ? "orange" : "green"}
                    size="xsmall"
                  >
                    -{fmtPct(step.drop_off)} dropped
                  </Badge>
                )}
              </div>
            </div>
            <div className="h-8 rounded-md bg-ui-bg-subtle border border-ui-border-base overflow-hidden">
              <div
                className={`h-full rounded-md border ${STEP_COLORS[i] ?? STEP_COLORS[0]} transition-all duration-500`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const FunnelPage = () => {
  useGA4Hotkeys()
  const [days, setDays] = useState(30)

  const { data, isLoading, isError, refetch } = useQuery<Response>({
    queryKey: ["ga4-funnel", days],
    queryFn: () => sdk.client.fetch<Response>(`/admin/custom/ga4/funnel?days=${days}`),
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

  const d = data as FunnelData
  if (d.error) return <APIErrorState error={d.error} hint={d.hint} activationUrl={d.activation_url} propertyId={d.property_id} />

  // Find the step data
  const stepMap = Object.fromEntries(d.steps.map((s) => [s.event, s]))
  const viewCount    = stepMap["view_item"]?.count      ?? 0
  const cartCount    = stepMap["add_to_cart"]?.count    ?? 0
  const checkoutCount = stepMap["begin_checkout"]?.count ?? 0
  const purchaseCount = stepMap["purchase"]?.count       ?? 0

  // Recent 7 days of daily funnel
  const recentDays = [...d.daily_funnel].reverse().slice(0, 7)

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <GA4PageHeader title="Shopping Behavior Funnel" propertyId={d.property_id} days={days} onDaysChange={setDays} />

      {/* ── Summary KPIs ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Views"         value={fmt(viewCount)}     sub="view_item events" />
        <MetricCard label="Add to Cart"   value={fmt(cartCount)}     sub="add_to_cart events" />
        <MetricCard label="Checkout"      value={fmt(checkoutCount)} sub="begin_checkout events" />
        <MetricCard
          label="Purchases"
          value={fmt(purchaseCount)}
          sub="purchase events"
          highlight={purchaseCount > 0 ? "green" : undefined}
        />
      </div>

      {/* ── Abandonment rate ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricCard
          label="Cart Abandonment Rate"
          value={fmtPct(d.abandonment_rate)}
          sub="(add_to_cart − purchase) ÷ add_to_cart"
          highlight={d.abandonment_rate > 80 ? "red" : d.abandonment_rate > 60 ? "orange" : "green"}
        />
        <MetricCard
          label="Overall Conversion"
          value={viewCount > 0 ? fmtPct(purchaseCount / viewCount * 100) : "—"}
          sub="View → purchase rate"
          highlight={
            viewCount > 0 && (purchaseCount / viewCount) >= 0.02 ? "green" : "orange"
          }
        />
      </div>

      {/* ── Visual funnel ──────────────────────────────────────────────── */}
      <Container className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Heading level="h2">Funnel Visualization</Heading>
          {d.abandonment_rate > 0 && (
            <Badge
              color={d.abandonment_rate > 80 ? "red" : d.abandonment_rate > 60 ? "orange" : "green"}
              size="xsmall"
            >
              {fmtPct(d.abandonment_rate)} abandonment
            </Badge>
          )}
        </div>

        {d.steps.length === 0 ? (
          <Text className="text-ui-fg-muted text-sm">
            No funnel data yet. Ensure your storefront fires view_item, add_to_cart, begin_checkout and purchase events.
          </Text>
        ) : (
          <FunnelBar steps={d.steps} />
        )}

        {/* Step-by-step breakdown table */}
        {d.steps.length > 0 && (
          <div className="border-t border-ui-border-base pt-4 mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ui-border-base text-ui-fg-muted">
                  <th className="pb-2 text-left font-medium">Step</th>
                  <th className="pb-2 text-right font-medium pr-4">Events</th>
                  <th className="pb-2 text-right font-medium pr-4">Retained</th>
                  <th className="pb-2 text-right font-medium">Dropped</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-base">
                {d.steps.map((step, i) => (
                  <tr key={step.event} className="hover:bg-ui-bg-subtle transition-colors">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ui-fg-muted w-4">{i + 1}</span>
                        <Text size="small" className="font-medium">{step.label}</Text>
                        <Text size="xsmall" className="text-ui-fg-muted font-mono">{step.event}</Text>
                      </div>
                    </td>
                    <td className="py-2 text-right pr-4 tabular-nums font-medium">{fmt(step.count)}</td>
                    <td className="py-2 text-right pr-4 tabular-nums">
                      {i === 0 ? "—" : (
                        <Badge
                          color={step.retained >= 70 ? "green" : step.retained >= 40 ? "orange" : "red"}
                          size="xsmall"
                        >
                          {fmtPct(step.retained)}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {i === 0 ? "—" : (
                        step.drop_off > 0
                          ? <span className="text-ui-fg-error">-{fmtPct(step.drop_off)}</span>
                          : <span className="text-ui-fg-muted">0%</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>

      {/* ── Daily funnel breakdown ──────────────────────────────────────── */}
      {recentDays.length > 0 && (
        <Container className="flex flex-col gap-4">
          <Heading level="h2">Daily Funnel — Last 7 Days</Heading>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ui-border-base text-ui-fg-muted">
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2 text-right font-medium pr-3">View Item</th>
                  <th className="pb-2 text-right font-medium pr-3">Add to Cart</th>
                  <th className="pb-2 text-right font-medium pr-3">Checkout</th>
                  <th className="pb-2 text-right font-medium">Purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-base">
                {recentDays.map((row) => {
                  const label = `${row.date.slice(0,4)}-${row.date.slice(4,6)}-${row.date.slice(6,8)}`
                  return (
                    <tr key={row.date} className="hover:bg-ui-bg-subtle transition-colors">
                      <td className="py-2 font-mono text-ui-fg-subtle">{label}</td>
                      <td className="py-2 text-right pr-3 tabular-nums text-ui-fg-subtle">{row.view_item || "—"}</td>
                      <td className="py-2 text-right pr-3 tabular-nums">{row.add_to_cart || "—"}</td>
                      <td className="py-2 text-right pr-3 tabular-nums">{row.begin_checkout || "—"}</td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {row.purchase > 0
                          ? <span className="text-ui-fg-interactive">{row.purchase}</span>
                          : "—"
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Container>
      )}

      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="small"
          onClick={() => window.open(
            `https://analytics.google.com/analytics/web/#/a366168585p${d.property_id}/reports/lifecycle-acquire-overview`,
            "_blank"
          )}
        >
          Open in GA4
          <ArrowUpRightOnBox />
        </Button>
      </div>
    </div>
  )
}

export default FunnelPage

export const config = defineRouteConfig({
  label: "Funnel",
  icon:  ChartBar,
})
