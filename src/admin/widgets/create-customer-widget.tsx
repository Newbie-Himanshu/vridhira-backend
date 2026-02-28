import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  FocusModal,
  Heading,
  Hint,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { useState } from "react"
import { sdk } from "../lib/sdk"

// ── Password strength ──────────────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { score, label: "Weak",   color: "bg-red-500" }
  if (score <= 3) return { score, label: "Fair",   color: "bg-yellow-500" }
  if (score <= 4) return { score, label: "Good",   color: "bg-blue-500" }
  return              { score, label: "Strong", color: "bg-green-500" }
}

const STRENGTH_RULES = [
  { test: (p: string) => p.length >= 8,          label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p),         label: "One uppercase letter" },
  { test: (p: string) => /[0-9]/.test(p),         label: "One number" },
]

// ── Form ───────────────────────────────────────────────────────────────────────

type Field = {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  confirm: string
}

const EMPTY: Field = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
  confirm: "",
}

function CreateCustomerModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<Field>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const set = (k: keyof Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setServerError(null)
  }

  const strength = passwordStrength(form.password)

  // ── Local validation ───────────────────────────────────────────────────
  const errors: Partial<Record<keyof Field, string>> = {}
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address"
  }
  if (form.password && form.password.length < 8) {
    errors.password = "Minimum 8 characters"
  }
  if (form.password && !/[A-Z]/.test(form.password)) {
    errors.password = "Needs an uppercase letter"
  }
  if (form.password && !/[0-9]/.test(form.password)) {
    errors.password = "Needs a number"
  }
  if (form.confirm && form.confirm !== form.password) {
    errors.confirm = "Passwords do not match"
  }

  const canSubmit =
    !loading &&
    form.email !== "" &&
    form.password !== "" &&
    form.confirm !== "" &&
    !Object.keys(errors).length

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setServerError(null)

    try {
      await sdk.client.fetch("/admin/custom/create-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:      form.email,
          password:   form.password,
          first_name: form.first_name,
          last_name:  form.last_name,
          phone:      form.phone,
        }),
      })

      toast.success("Customer account created", {
        description: `${form.email} can now log in on the storefront.`,
      })
      setForm(EMPTY)
      onCreated()
      onClose()
    } catch (err: any) {
      const msg: string =
        err?.body?.error ?? err?.message ?? "Something went wrong."
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setForm(EMPTY)
    setServerError(null)
    onClose()
  }

  return (
    <FocusModal open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <FocusModal.Content className="max-w-lg">
        <FocusModal.Header>
          <FocusModal.Title>Create Customer Account</FocusModal.Title>
          <Text size="small" className="text-ui-fg-muted mt-1">
            Creates a storefront account. The customer can log in immediately
            with the email and password you set.
          </Text>
        </FocusModal.Header>

        <FocusModal.Body className="px-6 py-5 flex flex-col gap-y-4">

          {/* Name row */}
          <div className="grid grid-cols-2 gap-x-3">
            <div className="flex flex-col gap-y-1">
              <Label size="xsmall" htmlFor="cc-first-name">First Name</Label>
              <Input
                id="cc-first-name"
                placeholder="John"
                value={form.first_name}
                onChange={set("first_name")}
                size="small"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="xsmall" htmlFor="cc-last-name">Last Name</Label>
              <Input
                id="cc-last-name"
                placeholder="Doe"
                value={form.last_name}
                onChange={set("last_name")}
                size="small"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-y-1">
            <Label size="xsmall" htmlFor="cc-email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cc-email"
              type="email"
              placeholder="customer@example.com"
              value={form.email}
              onChange={set("email")}
              size="small"
            />
            {errors.email && (
              <Hint variant="error">{errors.email}</Hint>
            )}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-y-1">
            <Label size="xsmall" htmlFor="cc-phone">Phone</Label>
            <Input
              id="cc-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={set("phone")}
              size="small"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-y-1">
            <Label size="xsmall" htmlFor="cc-password">
              Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cc-password"
              type="password"
              placeholder="Min. 8 chars, 1 uppercase, 1 number"
              value={form.password}
              onChange={set("password")}
              size="small"
            />

            {/* Strength bar */}
            {form.password && (
              <div className="mt-1.5 flex flex-col gap-y-1.5">
                <div className="flex gap-x-1 h-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-colors ${
                        i <= strength.score ? strength.color : "bg-ui-border-base"
                      }`}
                    />
                  ))}
                </div>
                <Text size="xsmall" className={
                  strength.score <= 1 ? "text-red-500"
                  : strength.score <= 3 ? "text-yellow-500"
                  : "text-green-600"
                }>
                  {strength.label}
                </Text>
              </div>
            )}

            {/* Rule checklist */}
            {form.password && (
              <ul className="mt-1 flex flex-col gap-y-0.5">
                {STRENGTH_RULES.map(r => (
                  <li key={r.label} className="flex items-center gap-x-1.5">
                    <span className={r.test(form.password) ? "text-green-500" : "text-ui-fg-muted"}>
                      {r.test(form.password) ? "✓" : "○"}
                    </span>
                    <Text size="xsmall" className={
                      r.test(form.password) ? "text-green-600" : "text-ui-fg-muted"
                    }>
                      {r.label}
                    </Text>
                  </li>
                ))}
              </ul>
            )}

            {errors.password && !form.confirm && (
              <Hint variant="error">{errors.password}</Hint>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-y-1">
            <Label size="xsmall" htmlFor="cc-confirm">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cc-confirm"
              type="password"
              placeholder="Re-enter password"
              value={form.confirm}
              onChange={set("confirm")}
              size="small"
            />
            {errors.confirm && (
              <Hint variant="error">{errors.confirm}</Hint>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="rounded-md border border-ui-border-strong bg-ui-bg-subtle px-3 py-2.5">
              <Text size="small" className="text-ui-fg-error">{serverError}</Text>
            </div>
          )}

          {/* Info banner */}
          <div className="rounded-md bg-ui-bg-subtle border border-ui-border-base px-3 py-2.5">
            <Text size="xsmall" className="text-ui-fg-muted">
              The customer will be able to log in immediately at the storefront
              with these credentials. This is identical to a self-registered account.
            </Text>
          </div>
        </FocusModal.Body>

        <div className="flex justify-end items-center gap-x-2 px-6 pb-6 pt-0">
          <FocusModal.Close asChild>
            <Button variant="secondary" size="small" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
          </FocusModal.Close>
          <Button
            size="small"
            onClick={handleSubmit}
            isLoading={loading}
            disabled={!canSubmit}
          >
            Create Account
          </Button>
        </div>
      </FocusModal.Content>
    </FocusModal>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

const CreateCustomerWidget = () => {
  const [open, setOpen] = useState(false)
  const [lastCreated, setLastCreated] = useState<string | null>(null)

  return (
    <>
      <Container className="p-0">
        <div className="flex items-center justify-between px-6 py-4 flex-wrap gap-3">
          <div>
            <Heading level="h2">Create Customer Account</Heading>
            <Text size="small" className="text-ui-fg-muted mt-0.5">
              Manually create a customer with email &amp; password login access.
            </Text>
          </div>
          <div className="flex items-center gap-x-3">
            {lastCreated && (
              <Badge color="green" size="xsmall">
                Last created: {lastCreated}
              </Badge>
            )}
            <Button size="small" onClick={() => setOpen(true)}>
              + New Customer Account
            </Button>
          </div>
        </div>
      </Container>

      <CreateCustomerModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setLastCreated(new Date().toLocaleTimeString("en-IN"))
          // Page-level query client isn't accessible here, but the customer list
          // auto-refreshes on navigation. If needed, window.location.reload() is a
          // fallback the admin can trigger with the browser refresh.
        }}
      />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.list.before",
})

export default CreateCustomerWidget
