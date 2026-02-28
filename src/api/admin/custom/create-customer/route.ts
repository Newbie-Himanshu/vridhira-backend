import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * POST /admin/custom/create-customer
 *
 * Creates a customer account with email + password credentials, exactly
 * replicating what the storefront signup flow does:
 *   1. Validate input
 *   2. Check for duplicate email
 *   3. Register auth identity via the emailpass provider  → hashes the password
 *   4. Create the customer record (has_account = true)
 *   5. Link the auth identity to the customer via the remote link module
 *
 * After this, the customer can log in at /store/auth/customer/emailpass with
 * the same credentials.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as Record<string, unknown>

  const email      = (body.email      as string | undefined)?.trim().toLowerCase()
  const password   = (body.password   as string | undefined) ?? ""
  const first_name = (body.first_name as string | undefined)?.trim() ?? ""
  const last_name  = (body.last_name  as string | undefined)?.trim() ?? ""
  const phone      = (body.phone      as string | undefined)?.trim() ?? ""

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "A valid email address is required." })
  }
  if (!password || password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters." })
  }
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({
      error: "Password must contain at least one uppercase letter and one number.",
    })
  }
  // Sanity-cap field lengths to prevent oversized payloads
  if (first_name.length > 100 || last_name.length > 100) {
    return res.status(400).json({ error: "Name fields must be under 100 characters." })
  }
  if (phone.length > 30) {
    return res.status(400).json({ error: "Phone number must be under 30 characters." })
  }

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const authModule     = req.scope.resolve(Modules.AUTH) as any
    const remoteLink     = req.scope.resolve(ContainerRegistrationKeys.LINK) as any

    // ── 1. Check duplicate email ───────────────────────────────────────────
    const existing = await customerModule.listCustomers(
      { email },
      { select: ["id"], take: 1 }
    )
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." })
    }

    // ── 2. Register password credentials via the emailpass auth provider ───
    //    This hashes the password and creates an auth_identity record.
    const { success, authIdentity, error: authError } = await authModule.register(
      "emailpass",
      { body: { email, password } }
    )

    if (!success || !authIdentity) {
      const msg = (authError as any)?.message ?? String(authError ?? "Auth registration failed")
      return res.status(400).json({ error: msg })
    }

    // ── 3. Create the customer record ──────────────────────────────────────
    const [customer] = await customerModule.createCustomers([
      {
        email,
        first_name: first_name || undefined,
        last_name:  last_name  || undefined,
        phone:      phone      || undefined,
        has_account: true,
        metadata: {
          created_by_admin: true,
          admin_created_at: new Date().toISOString(),
        },
      },
    ])

    // ── 4. Link auth identity → customer ──────────────────────────────────
    await remoteLink.create([
      {
        [Modules.AUTH]: {
          auth_identity_id: authIdentity.id,
        },
        [Modules.CUSTOMER]: {
          customer_id: customer.id,
        },
      },
    ])

    return res.status(201).json({
      customer: {
        id:         customer.id,
        email:      customer.email,
        first_name: customer.first_name,
        last_name:  customer.last_name,
        phone:      customer.phone,
        has_account: customer.has_account,
        created_at: customer.created_at,
      },
    })
  } catch (err: any) {
    console.error("[create-customer] Error:", err?.message)
    return res
      .status(500)
      .json({ error: err?.message ?? "Failed to create customer." })
  }
}
