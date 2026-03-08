import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { SHIPPING_CONFIG_MODULE } from "../../../modules/shipping-config"
import ShippingConfigModuleService from "../../../modules/shipping-config/service"

const DEFAULTS = {
  surcharge_percent: 0,
  handling_fee: 0,
  fallback_rate: 99,
  free_shipping_threshold: 0,
  express_surcharge_percent: 0,
  express_handling_fee: 0,
  express_fallback_rate: 149,
  express_free_shipping_threshold: 0,
  enabled: true,
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve<ShippingConfigModuleService>(SHIPPING_CONFIG_MODULE)
  const configs = await svc.listShippingConfigs({}, { take: 1 })
  res.json({ config: configs[0] ?? DEFAULTS })
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve<ShippingConfigModuleService>(SHIPPING_CONFIG_MODULE)
  const body = req.body as Partial<typeof DEFAULTS>

  const configs = await svc.listShippingConfigs({}, { take: 1 })
  const existing = configs[0]

  const config = existing
    ? await svc.updateShippingConfigs({ id: existing.id }, body)
    : await svc.createShippingConfigs({ ...DEFAULTS, ...body })

  res.json({ config })
}
