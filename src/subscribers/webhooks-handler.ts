import {
  type SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework/subscribers"
import { fullWebhooksSubscriptionsWorkflow } from "@lambdacurry/medusa-webhooks/workflows"

/**
 * Webhooks subscriber – forwards Medusa events to registered external endpoints.
 *
 * Endpoints are managed via:
 *   Admin → Webhooks  (or POST /admin/webhooks)
 *
 * To expose additional events:
 *   1. Add the event name to the `event` array below.
 *   2. Add the same event to `subscriptions` in medusa-config.ts.
 *
 * Source: https://medusajs.com/integrations/lambdacurry-webhooks/
 */
export const config: SubscriberConfig = {
  event: [
    "order.placed",
    "order.canceled",
    "order.fulfillment_created",
    "customer.created",
    "product.created",
    "product.updated",
  ],
  context: {
    subscriberId: "webhooks-handler",
  },
}

export default async function handleWebhookEvent({
  event: { name, data },
  container,
}: SubscriberArgs<unknown>) {
  await fullWebhooksSubscriptionsWorkflow(container).run({
    input: {
      eventName: name,
      eventData: data as Record<string, unknown>,
    },
  })
}
