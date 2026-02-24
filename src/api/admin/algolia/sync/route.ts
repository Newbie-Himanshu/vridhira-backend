/**
 * POST /admin/algolia/sync  [DEPRECATED]
 *
 * Legacy endpoint kept for backwards compatibility.
 * Prefer POST /admin/search/sync which respects the active provider selection
 * (Admin → Search → Provider tab).
 *
 * This route still works but always triggers an Algolia reindex regardless of
 * the current active provider. If you have switched to Meilisearch, use
 * /admin/search/sync instead.
 *
 * Protected by admin authentication (applied automatically by Medusa to all
 * routes under /admin/**).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const eventModuleService = req.scope.resolve(Modules.EVENT_BUS)

  await eventModuleService.emit({
    name: "algolia.sync",
    data: {},
  })

  res.json({
    message: "Algolia full reindex started in the background.",
    deprecation_notice: "This endpoint is deprecated. Use POST /admin/search/sync to respect the active provider setting.",
  })
}
