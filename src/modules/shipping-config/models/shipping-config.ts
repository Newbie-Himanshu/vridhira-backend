import { model } from "@medusajs/framework/utils"

const ShippingConfig = model.define("shipping_config", {
  id: model.id().primaryKey(),

  // ── Standard (cheapest courier) ──────────────────────────────────────────
  surcharge_percent: model.float().default(0),
  handling_fee: model.number().default(0),
  fallback_rate: model.number().default(99),
  free_shipping_threshold: model.number().default(0),

  // ── Express (fastest courier) ────────────────────────────────────────────
  express_surcharge_percent: model.float().default(0),
  express_handling_fee: model.number().default(0),
  express_fallback_rate: model.number().default(149),
  express_free_shipping_threshold: model.number().default(0),

  enabled: model.boolean().default(true),
})

export default ShippingConfig
