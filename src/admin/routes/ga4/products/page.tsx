import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShoppingCart, ArrowUpRightOnBox } from "@medusajs/icons"
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

type ProductRow = {
  name: string
  id: string
  revenue: number
  purchased: number
  viewed: number
  added_to_cart: number
  refund_amount: number
  cart_to_detail: number   // (add_to_cart / viewed) * 100
  buy_to_detail: number    // (purchased / viewed) * 100
}

type Totals = {
  revenue: number
  purchased: number
  viewed: number
  added_to_cart: number
  refund_amount: number
}

type ProductsData = {
  configured: true
  days: number
  property_id: string
  products: ProductRow[]
  totals: Totals
  error?: string
  hint?: string
  activation_url?: string
}

type NotConfigured = {
  configured: false
  measurement_tracking: boolean
  missing: string[]
}

type Response = ProductsData | NotConfigured

type SortKey = "revenue" | "purchased" | "viewed" | "added_to_cart" | "cart_to_detail" | "refund_amount"

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const ProductsPage = () => {
  useGA4Hotkeys()
  const [days,    setDays]    = useState(30)
  const [sortKey, setSortKey] = useState<SortKey>("revenue")

  const { data, isLoading, isError, refetch } = useQuery<Response>({
    queryKey: ["ga4-products", days],
    queryFn: () => sdk.client.fetch<Response>(`/admin/custom/ga4/products?days=${days}`),
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

  const d = data as ProductsData
  if (d.error) return <APIErrorState error={d.error} hint={d.hint} activationUrl={d.activation_url} propertyId={d.property_id} />

  const sorted = [...d.products].sort((a, b) => b[sortKey] - a[sortKey])

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => setSortKey(k)}
      className={[
        "px-2 py-1 text-xs rounded transition-colors border",
        sortKey === k
          ? "bg-ui-bg-base-pressed border-ui-border-strong text-ui-fg-base font-medium"
          : "bg-ui-bg-base border-ui-border-base text-ui-fg-subtle hover:bg-ui-bg-base-hover",
      ].join(" ")}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <GA4PageHeader title="Product Performance" propertyId={d.property_id} days={days} onDaysChange={setDays} />

      {/* ── Totals row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          label="Product Revenue"
          value={inr(d.totals.revenue)}
          highlight={d.totals.revenue > 0 ? "green" : undefined}
        />
        <MetricCard label="Items Sold"       value={fmt(d.totals.purchased)} />
        <MetricCard label="Item Views"       value={fmt(d.totals.viewed)} />
        <MetricCard label="Added to Cart"    value={fmt(d.totals.added_to_cart)} />
        <MetricCard
          label="Total Refunds"
          value={inr(d.totals.refund_amount)}
          highlight={d.totals.refund_amount > 0 ? "orange" : undefined}
        />
      </div>

      {/* ── Product table ──────────────────────────────────────────────── */}
      <Container className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Heading level="h2">Top Products</Heading>
          <div className="flex items-center gap-1 flex-wrap">
            <Text size="xsmall" className="text-ui-fg-muted mr-1">Sort:</Text>
            <SortBtn k="revenue"       label="Revenue" />
            <SortBtn k="purchased"     label="Purchases" />
            <SortBtn k="viewed"        label="Views" />
            <SortBtn k="added_to_cart" label="Add to Cart" />
            <SortBtn k="cart_to_detail" label="Cart Rate" />
            <SortBtn k="refund_amount" label="Refunds" />
          </div>
        </div>

        {sorted.length === 0 ? (
          <Text className="text-ui-fg-muted text-sm">
            No product data yet. Ensure enhanced ecommerce is sending item data.
          </Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ui-border-base text-ui-fg-muted">
                  <th className="pb-2 text-left font-medium">Product</th>
                  <th className="pb-2 text-right font-medium pr-3">Revenue</th>
                  <th className="pb-2 text-right font-medium pr-3">Sold</th>
                  <th className="pb-2 text-right font-medium pr-3">Views</th>
                  <th className="pb-2 text-right font-medium pr-3">Cart</th>
                  <th className="pb-2 text-right font-medium pr-3">Cart %</th>
                  <th className="pb-2 text-right font-medium">Refunds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-base">
                {sorted.map((p) => (
                  <tr key={p.id || p.name} className="text-ui-fg-base hover:bg-ui-bg-subtle transition-colors">
                    <td className="py-2 max-w-[240px]">
                      <Text size="small" className="truncate font-medium" title={p.name}>{p.name}</Text>
                      {p.id && p.id !== "(not set)" && (
                        <Text size="xsmall" className="text-ui-fg-muted font-mono">{p.id}</Text>
                      )}
                    </td>
                    <td className="py-2 text-right pr-3 tabular-nums font-medium">
                      {p.revenue > 0 ? inr(p.revenue) : <span className="text-ui-fg-muted">—</span>}
                    </td>
                    <td className="py-2 text-right pr-3 tabular-nums">{p.purchased}</td>
                    <td className="py-2 text-right pr-3 tabular-nums text-ui-fg-subtle">{fmt(p.viewed)}</td>
                    <td className="py-2 text-right pr-3 tabular-nums text-ui-fg-subtle">{p.added_to_cart}</td>
                    <td className="py-2 text-right pr-3 tabular-nums">
                      {p.viewed > 0 ? (
                        <Badge
                          color={p.cart_to_detail >= 10 ? "green" : p.cart_to_detail >= 3 ? "orange" : "grey"}
                          size="xsmall"
                        >
                          {fmtPct(p.cart_to_detail)}
                        </Badge>
                      ) : <span className="text-ui-fg-muted">—</span>}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {p.refund_amount > 0 ? (
                        <span className="text-ui-fg-error">{inr(p.refund_amount)}</span>
                      ) : <span className="text-ui-fg-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>

      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="small"
          onClick={() => window.open(
            `https://analytics.google.com/analytics/web/#/a366168585p${d.property_id}/reports/lifecycle-engage-pages-and-screens`,
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

export default ProductsPage

export const config = defineRouteConfig({
  label: "Products",
  icon:  ShoppingCart,
})
