import ShippingConfigModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const SHIPPING_CONFIG_MODULE = "shippingConfig"

export default Module(SHIPPING_CONFIG_MODULE, {
  service: ShippingConfigModuleService,
})
