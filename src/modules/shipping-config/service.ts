import { MedusaService } from "@medusajs/framework/utils"
import ShippingConfig from "./models/shipping-config"

class ShippingConfigModuleService extends MedusaService({
  ShippingConfig,
}) {}

export default ShippingConfigModuleService
