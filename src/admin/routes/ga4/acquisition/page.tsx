import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Users, ArrowUpRightOnBox } from "@medusajs/icons"
import { Badge, Button, Container, Text } from "@medusajs/ui"
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
  fmtDuration,
  sdk,
} from "../../../lib/ga4-shared"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SourceRow = {
  source: string
  sessions: number
  users: number
  bounce_rate: number
  avg_duration: number
}

type ChannelRow = {
  channel: string
  sessions: number
  revenue: number
  transactions: number
  conversion_rate: number
}

type CampaignRow = {
  campaign: string
  sessions: number
  revenue: number
  transactions: number
  users: number
}

type AcquisitionData = {
  configured: true
  days: number
  property_id: string
  sources: SourceRow[]
  channels: ChannelRow[]
  campaigns: CampaignRow[]
  error?: string
  hint?: string
  activation_url?: string
}

type NotConfigured = {
  configured: false
  measurement_tracking: boolean
  missing: string[]
}

type Response = AcquisitionData | NotConfigured

type ActiveTab = "sources" | "channels" | "campaigns"

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const AcquisitionPage = () => {
  useGA4Hotkeys()
  const [days,      setDays]      = useState(30)
  const [activeTab, setActiveTab] = useState<ActiveTab>("channels")

  const { data, isLoading, isError, refetch } = useQuery<Response>({
    queryKey: ["ga4-acquisition", days],
    queryFn: () => sdk.client.fetch<Response>(`/admin/custom/ga4/acquisition?days=${days}`),
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

  const d = data as AcquisitionData
  if (d.error) return <APIErrorState error={d.error} hint={d.hint} activationUrl={d.activation_url} propertyId={d.property_id} />

  // Summary KPIs from channels
  const totalRevenue      = d.channels.reduce((s, c) => s + c.revenue, 0)
  const totalTransactions = d.channels.reduce((s, c) => s + c.transactions, 0)
  const totalSessions     = d.sources.reduce((s, r) => s + r.sessions, 0)
  const topChannel        = d.channels[0]?.channel ?? "—"

  const TabBtn = ({ tab, label, count }: { tab: ActiveTab; label: string; count: number }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={[
        "px-3 py-1.5 text-sm rounded-t-md border-b-2 transition-colors flex items-center gap-1.5",
        activeTab === tab
          ? "border-ui-fg-interactive text-ui-fg-base font-medium"
          : "border-transparent text-ui-fg-subtle hover:text-ui-fg-base",
      ].join(" ")}
    >
      {label}
      <Badge color="grey" size="xsmall">{count}</Badge>
    </button>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <GA4PageHeader title="Customer Acquisition" propertyId={d.property_id} days={days} onDaysChange={setDays} />

      {/* ── KPI Summary ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Acquisition Revenue"
          value={inr(totalRevenue)}
          highlight={totalRevenue > 0 ? "green" : undefined}
        />
        <MetricCard label="Orders via Acq."  value={String(totalTransactions)} />
        <MetricCard label="Total Sessions"   value={fmt(totalSessions)} />
        <MetricCard label="Top Channel"      value={topChannel} sub="By revenue" />
      </div>

      {/* ── Tabbed tables ──────────────────────────────────────────────── */}
      <Container className="flex flex-col gap-0">
        <div className="flex border-b border-ui-border-base px-4 gap-1">
          <TabBtn tab="channels"  label="Channels"  count={d.channels.length} />
          <TabBtn tab="sources"   label="Sources"   count={d.sources.length} />
          <TabBtn tab="campaigns" label="Campaigns" count={d.campaigns.length} />
        </div>

        <div className="p-4">
          {/* ── Channels tab ── */}
          {activeTab === "channels" && (
            d.channels.length === 0 ? (
              <Text className="text-ui-fg-muted text-sm">No channel data available.</Text>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ui-border-base text-ui-fg-muted">
                      <th className="pb-2 text-left font-medium">Channel</th>
                      <th className="pb-2 text-right font-medium pr-3">Sessions</th>
                      <th className="pb-2 text-right font-medium pr-3">Revenue</th>
                      <th className="pb-2 text-right font-medium pr-3">Orders</th>
                      <th className="pb-2 text-right font-medium">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ui-border-base">
                    {d.channels.map((ch) => (
                      <tr key={ch.channel} className="hover:bg-ui-bg-subtle transition-colors">
                        <td className="py-2 font-medium">{ch.channel}</td>
                        <td className="py-2 text-right pr-3 tabular-nums text-ui-fg-subtle">{fmt(ch.sessions)}</td>
                        <td className="py-2 text-right pr-3 tabular-nums">
                          {ch.revenue > 0 ? inr(ch.revenue) : <span className="text-ui-fg-muted">—</span>}
                        </td>
                        <td className="py-2 text-right pr-3 tabular-nums">{ch.transactions || "—"}</td>
                        <td className="py-2 text-right tabular-nums">
                          {ch.conversion_rate > 0 ? (
                            <Badge
                              color={ch.conversion_rate >= 2 ? "green" : ch.conversion_rate >= 0.5 ? "orange" : "grey"}
                              size="xsmall"
                            >
                              {fmtPct(ch.conversion_rate)}
                            </Badge>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Sources tab ── */}
          {activeTab === "sources" && (
            d.sources.length === 0 ? (
              <Text className="text-ui-fg-muted text-sm">No source data available.</Text>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ui-border-base text-ui-fg-muted">
                      <th className="pb-2 text-left font-medium">Source / Medium</th>
                      <th className="pb-2 text-right font-medium pr-3">Sessions</th>
                      <th className="pb-2 text-right font-medium pr-3">Users</th>
                      <th className="pb-2 text-right font-medium pr-3">Bounce %</th>
                      <th className="pb-2 text-right font-medium">Avg. Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ui-border-base">
                    {d.sources.map((s) => (
                      <tr key={s.source} className="hover:bg-ui-bg-subtle transition-colors">
                        <td className="py-2 font-mono text-sm max-w-[220px] truncate" title={s.source}>
                          {s.source}
                        </td>
                        <td className="py-2 text-right pr-3 tabular-nums">{fmt(s.sessions)}</td>
                        <td className="py-2 text-right pr-3 tabular-nums text-ui-fg-subtle">{fmt(s.users)}</td>
                        <td className="py-2 text-right pr-3 tabular-nums">
                          <Badge
                            color={s.bounce_rate > 70 ? "red" : s.bounce_rate > 50 ? "orange" : "green"}
                            size="xsmall"
                          >
                            {fmtPct(s.bounce_rate)}
                          </Badge>
                        </td>
                        <td className="py-2 text-right tabular-nums text-ui-fg-subtle">
                          {fmtDuration(s.avg_duration)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Campaigns tab ── */}
          {activeTab === "campaigns" && (
            d.campaigns.length === 0 ? (
              <Text className="text-ui-fg-muted text-sm">
                No campaign data yet. Set up UTM parameters on your marketing links.
              </Text>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ui-border-base text-ui-fg-muted">
                      <th className="pb-2 text-left font-medium">Campaign</th>
                      <th className="pb-2 text-right font-medium pr-3">Sessions</th>
                      <th className="pb-2 text-right font-medium pr-3">Users</th>
                      <th className="pb-2 text-right font-medium pr-3">Revenue</th>
                      <th className="pb-2 text-right font-medium">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ui-border-base">
                    {d.campaigns.map((c) => (
                      <tr key={c.campaign} className="hover:bg-ui-bg-subtle transition-colors">
                        <td className="py-2 font-medium max-w-[200px] truncate" title={c.campaign}>
                          {c.campaign}
                        </td>
                        <td className="py-2 text-right pr-3 tabular-nums text-ui-fg-subtle">{fmt(c.sessions)}</td>
                        <td className="py-2 text-right pr-3 tabular-nums text-ui-fg-subtle">{fmt(c.users)}</td>
                        <td className="py-2 text-right pr-3 tabular-nums">
                          {c.revenue > 0 ? inr(c.revenue) : <span className="text-ui-fg-muted">—</span>}
                        </td>
                        <td className="py-2 text-right tabular-nums">{c.transactions || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </Container>

      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="small"
          onClick={() => window.open(
            `https://analytics.google.com/analytics/web/#/a366168585p${d.property_id}/reports/acquisition-overview`,
            "_blank"
          )}
        >
          Full Acquisition Report
          <ArrowUpRightOnBox />
        </Button>
      </div>
    </div>
  )
}

export default AcquisitionPage

export const config = defineRouteConfig({
  label: "Acquisition",
  icon:  Users,
})
