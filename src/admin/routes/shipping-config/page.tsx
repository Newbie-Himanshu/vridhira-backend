import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, Switch, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type Config = {
  surcharge_percent: number
  handling_fee: number
  fallback_rate: number
  free_shipping_threshold: number
  express_surcharge_percent: number
  express_handling_fee: number
  express_fallback_rate: number
  express_free_shipping_threshold: number
  enabled: boolean
}

const TruckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
)

const ShippingConfigPage = () => {
  const qc = useQueryClient()
  const [form, setForm] = useState<Config>({
    surcharge_percent: 0,
    handling_fee: 0,
    fallback_rate: 99,
    free_shipping_threshold: 0,
    express_surcharge_percent: 0,
    express_handling_fee: 0,
    express_fallback_rate: 149,
    express_free_shipping_threshold: 0,
    enabled: true,
  })

  const { data, isLoading } = useQuery<{ config: Config }>({
    queryKey: ["shipping-config"],
    queryFn: () => sdk.client.fetch("/admin/shipping-config"),
  })

  useEffect(() => {
    if (data?.config) setForm(data.config)
  }, [data])

  const { mutate, isPending } = useMutation({
    mutationFn: (values: Config) =>
      sdk.client.fetch("/admin/shipping-config", {
        method: "PUT",
        body: values,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipping-config"] })
      toast.success("Saved", { description: "Shipping config updated." })
    },
    onError: () => toast.error("Save failed"),
  })

  const num =
    (key: keyof Config) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))

  if (isLoading) {
    return (
      <div className="p-6">
        <Text className="text-ui-fg-subtle">Loading…</Text>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-2xl">
      <div>
        <Heading>Shipping Markup Config</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Controls the markup applied on top of Shiprocket rates at checkout.
          Formula: <code>Shiprocket rate + (subtotal × surcharge%) + handling fee</code>
        </Text>
      </div>

      <Container>
        <div className="flex flex-col gap-6">

          {/* Enable/disable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled" weight="plus">Enable Markup</Label>
              <Text size="small" className="text-ui-fg-subtle">
                When off, customers pay only the raw Shiprocket rate — no surcharge or handling fee.
              </Text>
            </div>
            <Switch
              id="enabled"
              checked={form.enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            />
          </div>

          <div className="h-px bg-ui-border-base" />

          {/* Standard Shipping */}
          <div>
            <Text weight="plus" className="mb-3">🚚 Standard Shipping — cheapest available courier</Text>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="surcharge_percent" weight="plus">Surcharge % of order value</Label>
                <Input
                  id="surcharge_percent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.surcharge_percent}
                  onChange={num("surcharge_percent")}
                  placeholder="e.g. 10"
                  disabled={!form.enabled}
                />
                <Text size="xsmall" className="text-ui-fg-muted">10 = 10% of cart subtotal added</Text>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="handling_fee" weight="plus">Fixed Handling Fee (₹)</Label>
                <Input
                  id="handling_fee"
                  type="number"
                  min={0}
                  step={1}
                  value={form.handling_fee}
                  onChange={num("handling_fee")}
                  placeholder="e.g. 50"
                  disabled={!form.enabled}
                />
                <Text size="xsmall" className="text-ui-fg-muted">Flat ₹ on every order</Text>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fallback_rate" weight="plus">Fallback Rate (₹)</Label>
                <Input
                  id="fallback_rate"
                  type="number"
                  min={0}
                  step={1}
                  value={form.fallback_rate}
                  onChange={num("fallback_rate")}
                  placeholder="e.g. 99"
                />
                <Text size="xsmall" className="text-ui-fg-muted">Used if Shiprocket is unreachable</Text>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="free_shipping_threshold" weight="plus">Free Shipping Above (₹)</Label>
                <Input
                  id="free_shipping_threshold"
                  type="number"
                  min={0}
                  step={1}
                  value={form.free_shipping_threshold}
                  onChange={num("free_shipping_threshold")}
                  placeholder="0 = disabled"
                />
                <Text size="xsmall" className="text-ui-fg-muted">0 = disabled</Text>
              </div>
            </div>
          </div>

          <div className="h-px bg-ui-border-base" />

          {/* Express Shipping */}
          <div>
            <Text weight="plus" className="mb-3">⚡ Express Shipping — fastest available courier</Text>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="express_surcharge_percent" weight="plus">Surcharge % of order value</Label>
                <Input
                  id="express_surcharge_percent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.express_surcharge_percent}
                  onChange={num("express_surcharge_percent")}
                  placeholder="e.g. 15"
                  disabled={!form.enabled}
                />
                <Text size="xsmall" className="text-ui-fg-muted">15 = 15% of cart subtotal added</Text>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="express_handling_fee" weight="plus">Fixed Handling Fee (₹)</Label>
                <Input
                  id="express_handling_fee"
                  type="number"
                  min={0}
                  step={1}
                  value={form.express_handling_fee}
                  onChange={num("express_handling_fee")}
                  placeholder="e.g. 80"
                  disabled={!form.enabled}
                />
                <Text size="xsmall" className="text-ui-fg-muted">Flat ₹ on every express order</Text>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="express_fallback_rate" weight="plus">Fallback Rate (₹)</Label>
                <Input
                  id="express_fallback_rate"
                  type="number"
                  min={0}
                  step={1}
                  value={form.express_fallback_rate}
                  onChange={num("express_fallback_rate")}
                  placeholder="e.g. 149"
                />
                <Text size="xsmall" className="text-ui-fg-muted">Used if Shiprocket is unreachable</Text>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="express_free_shipping_threshold" weight="plus">Free Express Shipping Above (₹)</Label>
                <Input
                  id="express_free_shipping_threshold"
                  type="number"
                  min={0}
                  step={1}
                  value={form.express_free_shipping_threshold}
                  onChange={num("express_free_shipping_threshold")}
                  placeholder="0 = disabled"
                />
                <Text size="xsmall" className="text-ui-fg-muted">0 = disabled</Text>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              isLoading={isPending}
              onClick={() => mutate(form)}
            >
              Save Changes
            </Button>
          </div>

        </div>
      </Container>

      {/* Live preview */}
      <Container>
        <Heading level="h2" className="mb-4">Live Preview</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">
          Example: Shiprocket quotes ₹85 (standard) / ₹140 (express) for each order value
        </Text>
        <div className="grid grid-cols-3 gap-3">
          {[500, 999, 2000].map((subtotal) => {
            const stdBase = 85
            const expBase = 140

            const stdSurcharge = form.enabled ? Math.round(subtotal * (form.surcharge_percent / 100)) : 0
            const stdHandling  = form.enabled ? form.handling_fee : 0
            const stdFree      = form.free_shipping_threshold > 0 && subtotal >= form.free_shipping_threshold
            const stdTotal     = stdFree ? 0 : stdBase + stdSurcharge + stdHandling

            const expSurcharge = form.enabled ? Math.round(subtotal * (form.express_surcharge_percent / 100)) : 0
            const expHandling  = form.enabled ? form.express_handling_fee : 0
            const expFree      = form.express_free_shipping_threshold > 0 && subtotal >= form.express_free_shipping_threshold
            const expTotal     = expFree ? 0 : expBase + expSurcharge + expHandling

            return (
              <div key={subtotal} className="border border-ui-border-base rounded-lg p-3 bg-ui-bg-subtle">
                <Text size="xsmall" className="text-ui-fg-subtle mb-2">Order value: ₹{subtotal}</Text>
                <div className="flex flex-col gap-1">
                  <Text size="small">
                    🚚 {stdFree ? "Free" : `₹${stdTotal}`}
                    <span className="text-ui-fg-muted text-xs ml-1">
                      {!stdFree && `(₹${stdBase}+₹${stdSurcharge}+₹${stdHandling})`}
                    </span>
                  </Text>
                  <Text size="small">
                    ⚡ {expFree ? "Free" : `₹${expTotal}`}
                    <span className="text-ui-fg-muted text-xs ml-1">
                      {!expFree && `(₹${expBase}+₹${expSurcharge}+₹${expHandling})`}
                    </span>
                  </Text>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Shipping Config",
  icon: TruckIcon,
})

export default ShippingConfigPage
