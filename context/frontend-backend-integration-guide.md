# 🎨 Complete Frontend-Backend Integration Guide
**Admin Dashboard + Customer Portal + Order Tracking + Best Practices**

---

## 📋 TABLE OF CONTENTS

1. [Admin Dashboard Integration](#admin-dashboard)
2. [Customer Account & Order Tracking](#customer-portal)
3. [Backend-Frontend Communication](#backend-frontend)
4. [Real-Life Project Structure](#project-structure)
5. [The Golden Ratio of Development](#golden-ratio)
6. [Best Practices & Standards](#best-practices)
7. [Complete Code Examples](#code-examples)
8. [Reference Links & Resources](#references)

---

## 🎛️ ADMIN DASHBOARD INTEGRATION {#admin-dashboard}

### Overview: MedusaJS Admin Architecture

MedusaJS Admin is built with React and uses:
- **Admin UI Components**: Pre-built components
- **Custom Widgets**: Extend dashboard functionality
- **Custom Routes**: Add new pages
- **Custom Settings**: Add configuration pages

---

### Adding COD Management to Admin Dashboard

#### Step 1: Create COD Management Widget

```typescript
// src/admin/widgets/cod-management.tsx
import { useAdminCustomQuery } from "medusa-react"
import { Container, Heading, Table, Badge, Button } from "@medusajs/ui"

const CODManagementWidget = () => {
  // Fetch COD orders
  const { data: codOrders, isLoading } = useAdminCustomQuery(
    "/admin/orders/cod",
    ["cod-orders"]
  )

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Heading level="h2">COD Orders Management</Heading>
        <Button variant="secondary" onClick={() => window.location.href = "/a/cod-settings"}>
          COD Settings
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Today's COD Orders"
          value={codOrders?.today_count || 0}
          subtitle={`₹${(codOrders?.today_amount / 100).toFixed(2)}`}
        />
        <StatCard
          title="Pending Deliveries"
          value={codOrders?.pending_count || 0}
          subtitle="Awaiting delivery"
          variant="warning"
        />
        <StatCard
          title="Failed Deliveries"
          value={codOrders?.failed_count || 0}
          subtitle="Need attention"
          variant="danger"
        />
        <StatCard
          title="Payment Collected"
          value={codOrders?.collected_count || 0}
          subtitle={`₹${(codOrders?.collected_amount / 100).toFixed(2)}`}
          variant="success"
        />
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Order ID</Table.HeaderCell>
            <Table.HeaderCell>Customer</Table.HeaderCell>
            <Table.HeaderCell>Amount</Table.HeaderCell>
            <Table.HeaderCell>Delivery Status</Table.HeaderCell>
            <Table.HeaderCell>Attempts</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {codOrders?.orders?.map((order) => (
            <Table.Row key={order.id}>
              <Table.Cell>
                <a href={`/a/orders/${order.id}`} className="text-blue-600">
                  #{order.display_id}
                </a>
              </Table.Cell>
              <Table.Cell>{order.customer.email}</Table.Cell>
              <Table.Cell>₹{(order.total / 100).toFixed(2)}</Table.Cell>
              <Table.Cell>
                <Badge variant={getStatusVariant(order.fulfillment_status)}>
                  {order.fulfillment_status}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                {order.metadata?.delivery_attempts || 0} / 3
              </Table.Cell>
              <Table.Cell>
                <div className="flex gap-2">
                  <Button size="small" variant="secondary">
                    Track
                  </Button>
                  <Button size="small" variant="secondary">
                    Contact
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

const StatCard = ({ title, value, subtitle, variant = "default" }) => {
  const bgColors = {
    default: "bg-gray-50",
    warning: "bg-yellow-50",
    danger: "bg-red-50",
    success: "bg-green-50",
  }

  return (
    <div className={`p-4 rounded-lg ${bgColors[variant]}`}>
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  )
}

const getStatusVariant = (status) => {
  const variants = {
    not_fulfilled: "default",
    fulfilled: "success",
    partially_fulfilled: "warning",
    shipped: "info",
    canceled: "danger",
  }
  return variants[status] || "default"
}

export default CODManagementWidget
```

#### Step 2: Register Widget in Admin

```typescript
// src/admin/widgets/cod-management.config.ts
import { WidgetConfig } from "@medusajs/admin"
import CODManagementWidget from "./cod-management"

export const config: WidgetConfig = {
  zone: "order.list.before",
}

export default CODManagementWidget
```

---

### Adding Delivery Partner Management

#### Create Delivery Dashboard Widget

```typescript
// src/admin/widgets/delivery-dashboard.tsx
import { useState, useEffect } from "react"
import { Container, Heading, Tabs, Table, Badge, Button } from "@medusajs/ui"

const DeliveryDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview")
  const [shipments, setShipments] = useState([])
  const [stats, setStats] = useState({})

  useEffect(() => {
    fetchDeliveryStats()
    fetchShipments()
  }, [])

  const fetchDeliveryStats = async () => {
    const response = await fetch("/admin/delivery/stats", {
      credentials: "include",
    })
    const data = await response.json()
    setStats(data.stats)
  }

  const fetchShipments = async () => {
    const response = await fetch("/admin/delivery/shipments", {
      credentials: "include",
    })
    const data = await response.json()
    setShipments(data.shipments)
  }

  return (
    <Container className="p-6">
      <Heading level="h2" className="mb-6">
        Delivery Management
      </Heading>

      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Total Shipments"
          value={stats.total_shipments || 0}
          icon="📦"
        />
        <StatCard
          title="In Transit"
          value={stats.in_transit || 0}
          icon="🚚"
          variant="info"
        />
        <StatCard
          title="Delivered"
          value={stats.delivered || 0}
          icon="✅"
          variant="success"
        />
        <StatCard
          title="Pending Pickup"
          value={stats.pending_pickup || 0}
          icon="⏳"
          variant="warning"
        />
        <StatCard
          title="Failed"
          value={stats.failed || 0}
          icon="❌"
          variant="danger"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="pending">Pending Pickup</Tabs.Trigger>
          <Tabs.Trigger value="transit">In Transit</Tabs.Trigger>
          <Tabs.Trigger value="ndr">NDR Cases</Tabs.Trigger>
          <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview">
          <ShipmentsTable shipments={shipments} />
        </Tabs.Content>

        <Tabs.Content value="pending">
          <PendingPickupsTable
            shipments={shipments.filter((s) => s.status === "pending_pickup")}
          />
        </Tabs.Content>

        <Tabs.Content value="transit">
          <ShipmentsTable
            shipments={shipments.filter((s) => s.status === "in_transit")}
          />
        </Tabs.Content>

        <Tabs.Content value="ndr">
          <NDRTable
            shipments={shipments.filter((s) => s.status === "ndr")}
          />
        </Tabs.Content>

        <Tabs.Content value="settings">
          <DeliverySettings />
        </Tabs.Content>
      </Tabs>
    </Container>
  )
}

const ShipmentsTable = ({ shipments }) => {
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Order ID</Table.HeaderCell>
          <Table.HeaderCell>AWB Number</Table.HeaderCell>
          <Table.HeaderCell>Courier</Table.HeaderCell>
          <Table.HeaderCell>Customer</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell>Last Update</Table.HeaderCell>
          <Table.HeaderCell>Actions</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {shipments.map((shipment) => (
          <Table.Row key={shipment.id}>
            <Table.Cell>
              <a
                href={`/a/orders/${shipment.order_id}`}
                className="text-blue-600"
              >
                #{shipment.order_display_id}
              </a>
            </Table.Cell>
            <Table.Cell>
              <code className="text-xs">{shipment.awb_number}</code>
            </Table.Cell>
            <Table.Cell>{shipment.courier_name}</Table.Cell>
            <Table.Cell>{shipment.customer_email}</Table.Cell>
            <Table.Cell>
              <Badge variant={getShipmentStatusVariant(shipment.status)}>
                {shipment.status}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              {new Date(shipment.updated_at).toLocaleString()}
            </Table.Cell>
            <Table.Cell>
              <div className="flex gap-2">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => window.open(shipment.tracking_url, "_blank")}
                >
                  Track
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => downloadLabel(shipment.id)}
                >
                  Label
                </Button>
              </div>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

const PendingPickupsTable = ({ shipments }) => {
  const schedulePickup = async (shipmentId) => {
    await fetch(`/admin/delivery/schedule-pickup/${shipmentId}`, {
      method: "POST",
      credentials: "include",
    })
    window.location.reload()
  }

  return (
    <div>
      <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
        <p className="text-sm">
          📦 {shipments.length} shipments are waiting for pickup. Schedule
          pickups to start delivery.
        </p>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Order ID</Table.HeaderCell>
            <Table.HeaderCell>AWB</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {shipments.map((shipment) => (
            <Table.Row key={shipment.id}>
              <Table.Cell>#{shipment.order_display_id}</Table.Cell>
              <Table.Cell>
                <code className="text-xs">{shipment.awb_number}</code>
              </Table.Cell>
              <Table.Cell>
                {new Date(shipment.created_at).toLocaleDateString()}
              </Table.Cell>
              <Table.Cell>
                <Button
                  size="small"
                  onClick={() => schedulePickup(shipment.id)}
                >
                  Schedule Pickup
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}

const NDRTable = ({ shipments }) => {
  const reattemptDelivery = async (shipmentId) => {
    await fetch(`/admin/delivery/reattempt/${shipmentId}`, {
      method: "POST",
      credentials: "include",
    })
    alert("Reattempt scheduled")
  }

  return (
    <div>
      <div className="mb-4 p-4 bg-red-50 rounded-lg">
        <p className="text-sm">
          ⚠️ {shipments.length} shipments have NDR (Non-Delivery Report). Take
          action to resolve.
        </p>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Order ID</Table.HeaderCell>
            <Table.HeaderCell>Reason</Table.HeaderCell>
            <Table.HeaderCell>Attempts</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {shipments.map((shipment) => (
            <Table.Row key={shipment.id}>
              <Table.Cell>#{shipment.order_display_id}</Table.Cell>
              <Table.Cell>{shipment.ndr_reason}</Table.Cell>
              <Table.Cell>{shipment.delivery_attempts} / 3</Table.Cell>
              <Table.Cell>
                <div className="flex gap-2">
                  <Button
                    size="small"
                    onClick={() => reattemptDelivery(shipment.id)}
                  >
                    Reattempt
                  </Button>
                  <Button size="small" variant="secondary">
                    Contact Customer
                  </Button>
                  <Button size="small" variant="danger">
                    Cancel
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}

const DeliverySettings = () => {
  const [settings, setSettings] = useState({
    default_courier: "shiprocket",
    auto_schedule_pickup: true,
    max_delivery_attempts: 3,
    ndr_auto_reattempt: true,
  })

  const saveSettings = async () => {
    await fetch("/admin/delivery/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    })
    alert("Settings saved")
  }

  return (
    <div className="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Default Courier Partner
          </label>
          <select
            value={settings.default_courier}
            onChange={(e) =>
              setSettings({ ...settings, default_courier: e.target.value })
            }
            className="w-full p-2 border rounded"
          >
            <option value="shiprocket">Shiprocket (Aggregator)</option>
            <option value="delhivery">Delhivery</option>
            <option value="shadowfax">Shadowfax</option>
            <option value="bluedart">Blue Dart</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.auto_schedule_pickup}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  auto_schedule_pickup: e.target.checked,
                })
              }
            />
            <span className="text-sm">
              Automatically schedule pickup after order placement
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Max Delivery Attempts
          </label>
          <input
            type="number"
            value={settings.max_delivery_attempts}
            onChange={(e) =>
              setSettings({
                ...settings,
                max_delivery_attempts: parseInt(e.target.value),
              })
            }
            className="w-full p-2 border rounded"
            min="1"
            max="5"
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.ndr_auto_reattempt}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  ndr_auto_reattempt: e.target.checked,
                })
              }
            />
            <span className="text-sm">
              Automatically reattempt delivery after NDR
            </span>
          </label>
        </div>

        <Button onClick={saveSettings}>Save Settings</Button>
      </div>
    </div>
  )
}

const getShipmentStatusVariant = (status) => {
  const variants = {
    pending_pickup: "warning",
    picked_up: "info",
    in_transit: "info",
    out_for_delivery: "info",
    delivered: "success",
    ndr: "danger",
    rto: "danger",
    canceled: "default",
  }
  return variants[status] || "default"
}

const downloadLabel = async (shipmentId) => {
  const response = await fetch(`/admin/delivery/label/${shipmentId}`, {
    credentials: "include",
  })
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `label-${shipmentId}.pdf`
  a.click()
}

export default DeliveryDashboard
```

#### Register Delivery Dashboard

```typescript
// src/admin/widgets/delivery-dashboard.config.ts
import { WidgetConfig } from "@medusajs/admin"
import DeliveryDashboard from "./delivery-dashboard"

export const config: WidgetConfig = {
  zone: "order.list.after",
}

export default DeliveryDashboard
```

---

### Adding Custom Admin Routes

#### COD Settings Page

```typescript
// src/admin/routes/cod-settings/page.tsx
import { useState, useEffect } from "react"
import { Container, Heading, Button, Input, Toggle } from "@medusajs/ui"
import { RouteConfig } from "@medusajs/admin"

const CODSettingsPage = () => {
  const [settings, setSettings] = useState({
    cod_enabled: true,
    max_cod_amount: 50000,
    min_cod_amount: 100,
    cod_charge_percent: 2,
    min_cod_charge: 20,
    max_cod_charge: 100,
    otp_verification_threshold: 3000,
    new_customer_limit: 1500,
    max_daily_cod_orders: 3,
    restricted_pincodes: [],
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    const response = await fetch("/admin/cod/settings", {
      credentials: "include",
    })
    const data = await response.json()
    setSettings(data.settings)
  }

  const saveSettings = async () => {
    await fetch("/admin/cod/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    })
    alert("Settings saved successfully!")
  }

  return (
    <Container className="p-8">
      <Heading level="h1" className="mb-6">
        Cash on Delivery (COD) Settings
      </Heading>

      <div className="max-w-2xl space-y-6">
        {/* Enable/Disable COD */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Enable COD</h3>
              <p className="text-sm text-gray-600">
                Allow customers to pay cash on delivery
              </p>
            </div>
            <Toggle
              checked={settings.cod_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, cod_enabled: checked })
              }
            />
          </div>
        </div>

        {/* Order Value Limits */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-4">Order Value Limits</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">
                Minimum Order Value (₹)
              </label>
              <Input
                type="number"
                value={settings.min_cod_amount / 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    min_cod_amount: parseFloat(e.target.value) * 100,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-2">
                Maximum Order Value (₹)
              </label>
              <Input
                type="number"
                value={settings.max_cod_amount / 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_cod_amount: parseFloat(e.target.value) * 100,
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* COD Charges */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-4">COD Charges</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Charge Percentage (%)</label>
              <Input
                type="number"
                value={settings.cod_charge_percent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    cod_charge_percent: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Minimum Charge (₹)</label>
              <Input
                type="number"
                value={settings.min_cod_charge / 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    min_cod_charge: parseFloat(e.target.value) * 100,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Maximum Charge (₹)</label>
              <Input
                type="number"
                value={settings.max_cod_charge / 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_cod_charge: parseFloat(e.target.value) * 100,
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Fraud Prevention */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-4">Fraud Prevention</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">
                OTP Verification Threshold (₹)
              </label>
              <Input
                type="number"
                value={settings.otp_verification_threshold / 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    otp_verification_threshold:
                      parseFloat(e.target.value) * 100,
                  })
                }
              />
              <p className="text-xs text-gray-600 mt-1">
                Orders above this amount require OTP verification
              </p>
            </div>
            <div>
              <label className="block text-sm mb-2">
                New Customer Limit (₹)
              </label>
              <Input
                type="number"
                value={settings.new_customer_limit / 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    new_customer_limit: parseFloat(e.target.value) * 100,
                  })
                }
              />
              <p className="text-xs text-gray-600 mt-1">
                Maximum COD amount for first-time customers
              </p>
            </div>
            <div>
              <label className="block text-sm mb-2">
                Max Daily COD Orders
              </label>
              <Input
                type="number"
                value={settings.max_daily_cod_orders}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_daily_cod_orders: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-gray-600 mt-1">
                Maximum COD orders per customer per day
              </p>
            </div>
          </div>
        </div>

        {/* Restricted Pincodes */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-4">Restricted Pincodes</h3>
          <textarea
            className="w-full p-2 border rounded"
            rows={4}
            placeholder="Enter pincodes separated by commas (e.g., 110001, 400001)"
            value={settings.restricted_pincodes.join(", ")}
            onChange={(e) =>
              setSettings({
                ...settings,
                restricted_pincodes: e.target.value
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean),
              })
            }
          />
          <p className="text-xs text-gray-600 mt-1">
            COD will not be available for these pincodes
          </p>
        </div>

        <Button onClick={saveSettings} size="large">
          Save Settings
        </Button>
      </div>
    </Container>
  )
}

export const config: RouteConfig = {
  link: {
    label: "COD Settings",
    icon: "CashIcon",
  },
}

export default CODSettingsPage
```

---

### Backend API Endpoints for Admin

```typescript
// src/api/routes/admin/cod/index.ts
import { Router } from "express"
import { authenticate } from "@medusajs/medusa"

export default (app: Router) => {
  const router = Router()

  // Get COD orders
  router.get("/orders/cod", authenticate(), async (req, res) => {
    try {
      const orderService = req.scope.resolve("orderService")

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [allOrders] = await orderService.listAndCount(
        {
          created_at: {
            gte: today,
          },
        },
        {
          relations: ["payments", "customer", "shipping_address"],
        }
      )

      // Filter COD orders
      const codOrders = allOrders.filter((order) =>
        order.payments.some(
          (p) => p.provider_id === "cod" || p.provider_id === "manual"
        )
      )

      const stats = {
        today_count: codOrders.length,
        today_amount: codOrders.reduce((sum, o) => sum + o.total, 0),
        pending_count: codOrders.filter(
          (o) => o.fulfillment_status === "not_fulfilled"
        ).length,
        failed_count: codOrders.filter(
          (o) => o.metadata?.delivery_attempts >= 3
        ).length,
        collected_count: codOrders.filter(
          (o) => o.metadata?.cod_payment_received
        ).length,
        collected_amount: codOrders
          .filter((o) => o.metadata?.cod_payment_received)
          .reduce((sum, o) => sum + o.total, 0),
      }

      res.json({
        orders: codOrders,
        ...stats,
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get COD settings
  router.get("/cod/settings", authenticate(), async (req, res) => {
    try {
      // Get from database or config
      const settings = {
        cod_enabled: true,
        max_cod_amount: 5000000, // ₹50,000
        min_cod_amount: 10000, // ₹100
        cod_charge_percent: 2,
        min_cod_charge: 2000, // ₹20
        max_cod_charge: 10000, // ₹100
        otp_verification_threshold: 300000, // ₹3,000
        new_customer_limit: 150000, // ₹1,500
        max_daily_cod_orders: 3,
        restricted_pincodes: [],
      }

      res.json({ settings })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Save COD settings
  router.post("/cod/settings", authenticate(), async (req, res) => {
    try {
      const settings = req.body

      // Save to database or config file
      // For now, just return success
      
      res.json({
        success: true,
        settings,
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  app.use("/admin", router)
}
```

```typescript
// src/api/routes/admin/delivery/index.ts
import { Router } from "express"
import { authenticate } from "@medusajs/medusa"

export default (app: Router) => {
  const router = Router()

  // Get delivery stats
  router.get("/delivery/stats", authenticate(), async (req, res) => {
    try {
      const orderService = req.scope.resolve("orderService")

      const [orders] = await orderService.listAndCount({}, {
        relations: ["fulfillments"],
      })

      const stats = {
        total_shipments: orders.filter((o) => o.fulfillments?.length > 0).length,
        in_transit: orders.filter(
          (o) => o.fulfillment_status === "shipped"
        ).length,
        delivered: orders.filter(
          (o) => o.fulfillment_status === "fulfilled"
        ).length,
        pending_pickup: orders.filter(
          (o) =>
            o.metadata?.shipment_id &&
            !o.metadata?.pickup_scheduled
        ).length,
        failed: orders.filter((o) => o.metadata?.delivery_failed).length,
      }

      res.json({ stats })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get all shipments
  router.get("/delivery/shipments", authenticate(), async (req, res) => {
    try {
      const orderService = req.scope.resolve("orderService")

      const [orders] = await orderService.listAndCount({}, {
        relations: ["customer", "shipping_address"],
      })

      const shipments = orders
        .filter((o) => o.metadata?.shipment_id)
        .map((o) => ({
          id: o.metadata.shipment_id,
          order_id: o.id,
          order_display_id: o.display_id,
          awb_number: o.metadata.awb_number || "N/A",
          courier_name: o.metadata.courier_name || "Shiprocket",
          customer_email: o.email,
          status: o.metadata.delivery_status || "pending_pickup",
          updated_at: o.updated_at,
          tracking_url: o.metadata.tracking_url,
          ndr_reason: o.metadata.ndr_reason,
          delivery_attempts: o.metadata.delivery_attempts || 0,
          created_at: o.created_at,
        }))

      res.json({ shipments })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

  // Schedule pickup
  router.post(
    "/delivery/schedule-pickup/:shipmentId",
    authenticate(),
    async (req, res) => {
      try {
        const { shipmentId } = req.params
        const shiprocketService = req.scope.resolve("shiprocketService")

        const result = await shiprocketService.schedulePickup([
          parseInt(shipmentId),
        ])

        if (result.success) {
          // Update order metadata
          // ...

          res.json({ success: true })
        } else {
          res.status(500).json({ error: result.error })
        }
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    }
  )

  // Reattempt delivery
  router.post(
    "/delivery/reattempt/:shipmentId",
    authenticate(),
    async (req, res) => {
      try {
        const { shipmentId } = req.params
        
        // Call delivery partner API to reattempt
        // Update order metadata

        res.json({ success: true })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    }
  )

  // Download shipping label
  router.get(
    "/delivery/label/:shipmentId",
    authenticate(),
    async (req, res) => {
      try {
        const { shipmentId } = req.params
        const shiprocketService = req.scope.resolve("shiprocketService")

        // Get label URL from Shiprocket
        // Download and return PDF

        res.json({ success: true })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    }
  )

  app.use("/admin", router)
}
```

---

## 👤 CUSTOMER ACCOUNT & ORDER TRACKING {#customer-portal}

### Customer Account Page with Order Tracking

```typescript
// storefront/src/app/account/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useCustomer, useOrders } from "medusa-react"
import OrderCard from "@/components/account/order-card"
import OrderTracking from "@/components/account/order-tracking"

export default function AccountPage() {
  const { customer } = useCustomer()
  const { orders, isLoading } = useOrders({
    limit: 10,
    offset: 0,
  })

  const [selectedOrder, setSelectedOrder] = useState(null)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">My Account</h2>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-gray-600">Name:</span>{" "}
                <span className="font-medium">
                  {customer?.first_name} {customer?.last_name}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-gray-600">Email:</span>{" "}
                <span className="font-medium">{customer?.email}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-600">Phone:</span>{" "}
                <span className="font-medium">{customer?.phone || "N/A"}</span>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium mb-2">Account Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-2xl font-bold">
                    {orders?.length || 0}
                  </p>
                  <p className="text-xs text-gray-600">Total Orders</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-2xl font-bold">
                    {orders?.filter((o) => o.status === "completed").length ||
                      0}
                  </p>
                  <p className="text-xs text-gray-600">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">My Orders</h2>

          {isLoading ? (
            <div className="text-center py-12">Loading orders...</div>
          ) : orders?.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No orders yet</p>
              <button className="mt-4 px-6 py-2 bg-black text-white rounded-lg">
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders?.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onTrack={() => setSelectedOrder(order)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Tracking Modal */}
      {selectedOrder && (
        <OrderTracking
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  )
}
```

### Order Card Component

```typescript
// storefront/src/components/account/order-card.tsx
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface OrderCardProps {
  order: any
  onTrack: () => void
}

export default function OrderCard({ order, onTrack }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      canceled: "bg-red-100 text-red-800",
      processing: "bg-blue-100 text-blue-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const isCOD = order.payments.some(
    (p) => p.provider_id === "cod" || p.provider_id === "manual"
  )

  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">Order #{order.display_id}</h3>
          <p className="text-sm text-gray-600">
            {new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Badge className={getStatusColor(order.status)}>
          {order.status.toUpperCase()}
        </Badge>
      </div>

      {/* Order Items Preview */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          {order.items.length} item(s)
        </p>
        <div className="flex gap-2">
          {order.items.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="w-16 h-16 bg-gray-100 rounded overflow-hidden"
            >
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-sm text-gray-600">
                +{order.items.length - 3}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-600">Total Amount</p>
          <p className="font-bold">₹{(order.total / 100).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-600">Payment Method</p>
          <p className="font-medium">
            {isCOD ? "Cash on Delivery" : "Paid Online"}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Delivery Status</p>
          <p className="font-medium">
            {order.fulfillment_status === "fulfilled"
              ? "Delivered"
              : order.fulfillment_status === "shipped"
              ? "In Transit"
              : order.fulfillment_status === "not_fulfilled"
              ? "Processing"
              : order.fulfillment_status}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Shipping Address</p>
          <p className="font-medium text-xs">
            {order.shipping_address.city},{" "}
            {order.shipping_address.postal_code}
          </p>
        </div>
      </div>

      {/* COD Amount (if applicable) */}
      {isCOD && order.fulfillment_status !== "fulfilled" && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm font-medium">
            💵 Amount to pay on delivery: ₹{(order.total / 100).toFixed(2)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() =>
            (window.location.href = `/account/orders/${order.id}`)
          }
        >
          View Details
        </Button>
        {order.metadata?.shipment_id && (
          <Button variant="default" className="flex-1" onClick={onTrack}>
            Track Order
          </Button>
        )}
      </div>

      {/* Delivery Timeline */}
      {order.metadata?.estimated_delivery && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-600">
            Expected Delivery:{" "}
            <span className="font-medium">
              {new Date(order.metadata.estimated_delivery).toLocaleDateString(
                "en-IN"
              )}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
```

### Order Tracking Component

```typescript
// storefront/src/components/account/order-tracking.tsx
import { useEffect, useState } from "react"
import { X } from "lucide-react"

interface OrderTrackingProps {
  order: any
  onClose: () => void
}

export default function OrderTracking({ order, onClose }: OrderTrackingProps) {
  const [trackingData, setTrackingData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrackingData()
  }, [order.id])

  const fetchTrackingData = async () => {
    try {
      const response = await fetch(`/api/track/order/${order.display_id}`)
      const data = await response.json()
      setTrackingData(data)
    } catch (error) {
      console.error("Failed to fetch tracking data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold">
            Track Order #{order.display_id}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-4 text-gray-600">Loading tracking information...</p>
            </div>
          ) : trackingData ? (
            <>
              {/* Current Status */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Current Status</p>
                <p className="text-xl font-bold">
                  {trackingData.shipping_status}
                </p>
                {trackingData.estimated_delivery && (
                  <p className="text-sm text-gray-600 mt-2">
                    Expected Delivery:{" "}
                    {new Date(
                      trackingData.estimated_delivery
                    ).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>

              {/* Courier Details */}
              {trackingData.courier_details && (
                <div className="mb-6 p-4 border rounded-lg">
                  <h3 className="font-medium mb-3">Courier Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Courier Partner</p>
                      <p className="font-medium">
                        {trackingData.courier_details.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">AWB Number</p>
                      <p className="font-medium font-mono">
                        {trackingData.courier_details.awb_number}
                      </p>
                    </div>
                  </div>
                  {trackingData.tracking_url && (
                    <a
                      href={trackingData.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                    >
                      Track on courier website →
                    </a>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className="mb-6">
                <h3 className="font-medium mb-4">Shipment Timeline</h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="space-y-6">
                    {trackingData.shipment_track?.map((track, index) => (
                      <div key={index} className="relative pl-10">
                        <div
                          className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            index === 0
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        >
                          {index === 0 ? (
                            <svg
                              className="w-5 h-5 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{track.status}</p>
                          <p className="text-sm text-gray-600">{track.location}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(track.timestamp).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Delivery Address</h3>
                <p className="text-sm">
                  {order.shipping_address.address_1}
                  {order.shipping_address.address_2 &&
                    `, ${order.shipping_address.address_2}`}
                  <br />
                  {order.shipping_address.city},{" "}
                  {order.shipping_address.province} -{" "}
                  {order.shipping_address.postal_code}
                  <br />
                  Phone: {order.shipping_address.phone}
                </p>
              </div>

              {/* NDR Information (if applicable) */}
              {trackingData.ndr_status && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-medium text-red-800 mb-2">
                    ⚠️ Delivery Attempt Failed
                  </h3>
                  <p className="text-sm text-red-700">
                    Reason: {trackingData.ndr_reason}
                  </p>
                  <p className="text-sm text-red-700 mt-2">
                    Next attempt scheduled for:{" "}
                    {new Date(
                      trackingData.next_attempt
                    ).toLocaleDateString("en-IN")}
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Please ensure someone is available to receive the package.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">
                Tracking information not available yet
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Shipment will be updated soon
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Tracking API Endpoint

```typescript
// src/api/routes/store/track/index.ts
import { Router } from "express"

export default (app: Router) => {
  const router = Router()

  // Track order by display ID
  router.get("/order/:order_id", async (req, res) => {
    try {
      const orderService = req.scope.resolve("orderService")
      const shiprocketService = req.scope.resolve("shiprocketService")

      // Get order
      const order = await orderService.retrieveByDisplayId(
        req.params.order_id,
        {
          relations: ["shipping_address", "fulfillments"],
        }
      )

      if (!order) {
        return res.status(404).json({ error: "Order not found" })
      }

      // Get shipment ID from metadata
      const shipmentId = order.metadata?.shipment_id

      if (!shipmentId) {
        return res.json({
          order_id: order.display_id,
          status: order.status,
          shipping_status: "Not yet shipped",
          message: "Shipment will be created soon",
        })
      }

      // Get tracking info from Shiprocket
      const tracking = await shiprocketService.trackShipment(
        parseInt(shipmentId)
      )

      if (tracking.success) {
        res.json({
          order_id: order.display_id,
          status: order.status,
          shipping_status: tracking.current_status,
          shipment_track: tracking.shipment_track,
          tracking_url: tracking.tracking_data?.track_url,
          courier_details: {
            name: tracking.tracking_data?.courier_name,
            awb_number: order.metadata?.awb_number,
          },
          estimated_delivery: order.metadata?.estimated_delivery,
          ndr_status: order.metadata?.ndr_status,
          ndr_reason: order.metadata?.ndr_reason,
          next_attempt: order.metadata?.next_attempt_date,
        })
      } else {
        res.json({
          order_id: order.display_id,
          status: order.status,
          message: "Tracking information temporarily unavailable",
        })
      }
    } catch (error) {
      console.error("Track order error:", error)
      res.status(500).json({ error: "Failed to fetch tracking information" })
    }
  })

  // Real-time tracking updates via webhook
  router.post("/webhook/shiprocket", async (req, res) => {
    try {
      const orderService = req.scope.resolve("orderService")
      const trackingUpdate = req.body

      // Find order by shipment ID
      const [orders] = await orderService.list({
        metadata: {
          shipment_id: trackingUpdate.shipment_id,
        },
      })

      if (orders.length > 0) {
        const order = orders[0]

        // Update order metadata with tracking info
        await orderService.update(order.id, {
          metadata: {
            ...order.metadata,
            delivery_status: trackingUpdate.status,
            last_tracking_update: new Date().toISOString(),
            current_location: trackingUpdate.location,
          },
        })

        // Handle specific events
        if (trackingUpdate.status === "delivered") {
          // Mark as fulfilled
          await orderService.createFulfillment(order.id, {
            metadata: {
              delivered_at: trackingUpdate.timestamp,
            },
          })
        } else if (trackingUpdate.status === "ndr") {
          // Handle NDR
          await orderService.update(order.id, {
            metadata: {
              ...order.metadata,
              ndr_status: true,
              ndr_reason: trackingUpdate.ndr_reason,
              delivery_attempts:
                (order.metadata?.delivery_attempts || 0) + 1,
            },
          })
        }
      }

      res.json({ received: true })
    } catch (error) {
      console.error("Webhook error:", error)
      res.status(500).json({ error: "Webhook processing failed" })
    }
  })

  app.use("/store/track", router)
}
```

---

## 🔗 BACKEND-FRONTEND COMMUNICATION {#backend-frontend}

### API Client Configuration

```typescript
// storefront/src/lib/medusa-client.ts
import Medusa from "@medusajs/medusa-js"

export const medusaClient = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  maxRetries: 3,
})

// Custom API calls
export const customAPI = {
  // Track order
  trackOrder: async (orderId: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/track/order/${orderId}`
    )
    return response.json()
  },

  // Check COD eligibility
  checkCODEligibility: async (cartId: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/cod/check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cartId }),
      }
    )
    return response.json()
  },

  // Check pincode serviceability
  checkPincodeServiceability: async (pincode: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/delivery/check-pincode`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode }),
      }
    )
    return response.json()
  },

  // Get shipping estimate
  getShippingEstimate: async (cartId: string, pincode: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/delivery/estimate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cartId, pincode }),
      }
    )
    return response.json()
  },
}
```

### React Hooks for Integration

```typescript
// storefront/src/hooks/use-order-tracking.ts
import { useState, useEffect } from "react"
import { customAPI } from "@/lib/medusa-client"

export function useOrderTracking(orderId: string) {
  const [trackingData, setTrackingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orderId) return

    const fetchTracking = async () => {
      try {
        setLoading(true)
        const data = await customAPI.trackOrder(orderId)
        setTrackingData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTracking()

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchTracking, 30000)

    return () => clearInterval(interval)
  }, [orderId])

  return { trackingData, loading, error }
}

// Usage:
// const { trackingData, loading } = useOrderTracking(order.display_id)
```

```typescript
// storefront/src/hooks/use-cod-eligibility.ts
import { useState, useEffect } from "react"
import { customAPI } from "@/lib/medusa-client"

export function useCODEligibility(cartId: string) {
  const [eligible, setEligible] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cartId) return

    const checkEligibility = async () => {
      try {
        setLoading(true)
        const data = await customAPI.checkCODEligibility(cartId)
        setEligible(data.eligible)
        setReason(data.reason || "")
      } catch (err) {
        setEligible(false)
        setReason("Unable to check COD eligibility")
      } finally {
        setLoading(false)
      }
    }

    checkEligibility()
  }, [cartId])

  return { eligible, reason, loading }
}

// Usage:
// const { eligible, reason } = useCODEligibility(cart.id)
```

```typescript
// storefront/src/hooks/use-pincode-check.ts
import { useState } from "react"
import { customAPI } from "@/lib/medusa-client"

export function usePincodeCheck() {
  const [checking, setChecking] = useState(false)
  const [serviceable, setServiceable] = useState(null)
  const [estimatedDays, setEstimatedDays] = useState(null)

  const checkPincode = async (pincode: string) => {
    try {
      setChecking(true)
      const data = await customAPI.checkPincodeServiceability(pincode)
      setServiceable(data.serviceable)
      setEstimatedDays(data.estimated_days)
      return data
    } catch (err) {
      setServiceable(false)
      return { serviceable: false, error: err.message }
    } finally {
      setChecking(false)
    }
  }

  return { checkPincode, checking, serviceable, estimatedDays }
}

// Usage:
// const { checkPincode, serviceable, estimatedDays } = usePincodeCheck()
// await checkPincode("400001")
```

---

## 🏗️ REAL-LIFE PROJECT STRUCTURE {#project-structure}

### Complete Folder Structure

```
medusa-ecommerce-india/
├── backend/                          # MedusaJS Backend
│   ├── src/
│   │   ├── admin/                    # Admin customizations
│   │   │   ├── routes/               # Custom admin pages
│   │   │   │   ├── cod-settings/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── delivery-dashboard/
│   │   │   │       └── page.tsx
│   │   │   └── widgets/              # Dashboard widgets
│   │   │       ├── cod-management.tsx
│   │   │       ├── cod-management.config.ts
│   │   │       ├── delivery-dashboard.tsx
│   │   │       └── delivery-dashboard.config.ts
│   │   ├── api/                      # API routes
│   │   │   ├── index.ts
│   │   │   └── routes/
│   │   │       ├── admin/
│   │   │       │   ├── cod/
│   │   │       │   │   └── index.ts
│   │   │       │   └── delivery/
│   │   │       │       └── index.ts
│   │   │       ├── store/
│   │   │       │   ├── track/
│   │   │       │   │   └── index.ts
│   │   │       │   ├── cod/
│   │   │       │   │   └── index.ts
│   │   │       │   └── delivery/
│   │   │       │       └── index.ts
│   │   │       └── hooks/
│   │   │           └── razorpay.ts
│   │   ├── models/                   # Database models
│   │   │   ├── loyalty-points.ts
│   │   │   └── delivery-tracking.ts
│   │   ├── repositories/             # Data access
│   │   │   └── loyalty-points.ts
│   │   ├── services/                 # Business logic
│   │   │   ├── cod-payment.ts
│   │   │   ├── enhanced-cod-payment.ts
│   │   │   ├── cod-order-tracker.ts
│   │   │   ├── shiprocket.ts
│   │   │   ├── delhivery.ts
│   │   │   ├── shadowfax.ts
│   │   │   └── delivery-partner-selector.ts
│   │   ├── subscribers/              # Event handlers
│   │   │   ├── cod-order-placed.ts
│   │   │   ├── order-shiprocket.ts
│   │   │   └── payment-received.ts
│   │   ├── migrations/               # DB migrations
│   │   │   └── XXXXX-CreateLoyaltyPoints.ts
│   │   ├── loaders/                  # Initialization
│   │   │   └── custom-services.ts
│   │   ├── types/                    # TypeScript types
│   │   │   └── index.ts
│   │   └── utils/                    # Utilities
│   │       ├── error-handler.ts
│   │       └── retry-handler.ts
│   ├── .env                          # Environment variables
│   ├── .env.example                  # Env template
│   ├── docker-compose.yml            # Docker services
│   ├── medusa-config.js              # Medusa configuration
│   ├── package.json
│   └── tsconfig.json
│
├── storefront/                       # Next.js Storefront
│   ├── src/
│   │   ├── app/                      # App router
│   │   │   ├── page.tsx              # Home
│   │   │   ├── products/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── cart/
│   │   │   │   └── page.tsx
│   │   │   ├── checkout/
│   │   │   │   └── page.tsx
│   │   │   ├── account/
│   │   │   │   ├── page.tsx          # Account dashboard
│   │   │   │   └── orders/
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx  # Order details
│   │   │   └── api/                  # API routes
│   │   │       └── track/
│   │   │           └── route.ts
│   │   ├── components/
│   │   │   ├── account/
│   │   │   │   ├── order-card.tsx
│   │   │   │   └── order-tracking.tsx
│   │   │   ├── checkout/
│   │   │   │   ├── razorpay-payment-button.tsx
│   │   │   │   ├── cod-payment-button.tsx
│   │   │   │   ├── pincode-checker.tsx
│   │   │   │   └── delivery-estimate.tsx
│   │   │   ├── cart/
│   │   │   │   └── cart-items.tsx
│   │   │   └── ui/                   # UI components
│   │   │       ├── button.tsx
│   │   │       ├── badge.tsx
│   │   │       └── input.tsx
│   │   ├── hooks/                    # Custom hooks
│   │   │   ├── use-order-tracking.ts
│   │   │   ├── use-cod-eligibility.ts
│   │   │   └── use-pincode-check.ts
│   │   ├── lib/                      # Libraries
│   │   │   ├── medusa-client.ts
│   │   │   └── utils.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── .env.local                    # Environment variables
│   ├── next.config.js
│   ├── package.json
│   └── tailwind.config.js
│
├── admin/                            # Separate Admin (optional)
│   ├── src/
│   │   └── ...
│   └── package.json
│
└── docs/                             # Documentation
    ├── API.md
    ├── DEPLOYMENT.md
    └── CONTRIBUTING.md
```

---

## 📐 THE GOLDEN RATIO OF DEVELOPMENT {#golden-ratio}

### The 70-20-10 Rule

**70% - Core Functionality**
- Payment integration (Razorpay + COD)
- Order management
- Product catalog
- Cart & Checkout
- Customer authentication
- Basic admin dashboard

**20% - Enhancements**
- Delivery partner integration
- Order tracking
- COD fraud prevention
- Advanced admin features
- Email notifications
- SMS alerts

**10% - Polish & Optimization**
- UI/UX refinements
- Performance optimization
- SEO improvements
- Analytics integration
- A/B testing
- Advanced features

---

### Development Phases (The Golden Timeline)

#### Phase 1: Foundation (Week 1-2) - 30%
```
✅ Setup development environment
✅ Install MedusaJS + Docker
✅ Basic product catalog
✅ Cart functionality
✅ User authentication
```

#### Phase 2: Core Features (Week 3-4) - 40%
```
✅ Razorpay integration
✅ Basic COD
✅ Checkout flow
✅ Order creation
✅ Admin dashboard
```

#### Phase 3: Enhancements (Week 5-6) - 20%
```
✅ Enhanced COD (OTP, fraud prevention)
✅ Shiprocket integration
✅ Order tracking
✅ Customer account page
✅ Email notifications
```

#### Phase 4: Polish (Week 7-8) - 10%
```
✅ UI/UX improvements
✅ Performance optimization
✅ Testing & bug fixes
✅ Documentation
✅ Deployment
```

---

### Code Quality Ratios

**Test Coverage: 70%**
- 80% for payment logic
- 70% for business logic
- 50% for UI components

**Code Comments: 20%**
- Complex business logic: Heavy comments
- Simple CRUD: Light comments
- Self-explanatory code: No comments

**Documentation: 10%**
- API documentation
- Setup guides
- Architecture diagrams

---

## 🎯 BEST PRACTICES & STANDARDS {#best-practices}

### 1. Code Organization

```typescript
// ❌ DON'T: Everything in one file
// order-service.ts (2000 lines)

// ✅ DO: Separate concerns
// services/order/
//   ├── order.ts
//   ├── order-payment.ts
//   ├── order-fulfillment.ts
//   └── order-tracking.ts
```

### 2. Error Handling

```typescript
// ❌ DON'T: Generic errors
throw new Error("Error")

// ✅ DO: Specific, actionable errors
throw new MedusaError(
  MedusaError.Types.INVALID_DATA,
  "COD not available for orders above ₹50,000. Please choose online payment."
)
```

### 3. API Response Format

```typescript
// ❌ DON'T: Inconsistent responses
return { data: result }
return result
return { success: true, result }

// ✅ DO: Consistent structure
return {
  success: true,
  data: result,
  message: "Operation successful"
}

// For errors:
return {
  success: false,
  error: {
    code: "COD_NOT_ALLOWED",
    message: "User-friendly message",
    details: {} // Optional debug info
  }
}
```

### 4. Environment Variables

```bash
# ❌ DON'T: Hardcode values
const API_KEY = "rzp_live_abc123"

# ✅ DO: Use environment variables
RAZORPAY_KEY_ID=rzp_live_abc123
RAZORPAY_KEY_SECRET=your_secret
SHIPROCKET_EMAIL=your@email.com
SHIPROCKET_PASSWORD=secure_password
```

### 5. TypeScript Types

```typescript
// ❌ DON'T: Use any
function processOrder(data: any): any {
  // ...
}

// ✅ DO: Define proper types
interface OrderData {
  customer_id: string
  items: OrderItem[]
  shipping_address: Address
  payment_method: "cod" | "razorpay"
}

function processOrder(data: OrderData): Promise<Order> {
  // ...
}
```

### 6. Database Queries

```typescript
// ❌ DON'T: N+1 queries
for (const order of orders) {
  const customer = await customerService.retrieve(order.customer_id)
}

// ✅ DO: Eager loading
const orders = await orderService.list({}, {
  relations: ["customer", "items", "payments"]
})
```

### 7. Frontend State Management

```typescript
// ❌ DON'T: Prop drilling
<Parent>
  <Child data={data}>
    <GrandChild data={data}>
      <GreatGrandChild data={data} />
    </GrandChild>
  </Child>
</Parent>

// ✅ DO: Use Context or state management
const { trackingData } = useOrderTracking(orderId)
```

### 8. API Calls

```typescript
// ❌ DON'T: No error handling
const data = await fetch(url).then(r => r.json())

// ✅ DO: Proper error handling
try {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const data = await response.json()
  return data
} catch (error) {
  console.error("API call failed:", error)
  throw error
}
```

### 9. Component Structure

```typescript
// ❌ DON'T: Monolithic components
function OrderPage() {
  // 500 lines of code
}

// ✅ DO: Small, focused components
function OrderPage() {
  return (
    <>
      <OrderHeader order={order} />
      <OrderItems items={order.items} />
      <OrderTracking orderId={order.id} />
      <OrderActions order={order} />
    </>
  )
}
```

### 10. Security

```typescript
// ❌ DON'T: Expose secrets
const config = {
  razorpay_secret: "your_secret" // In frontend!
}

// ✅ DO: Keep secrets in backend only
// Frontend: Only public keys
const config = {
  razorpay_key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
}

// Backend: Secret keys
const config = {
  razorpay_secret: process.env.RAZORPAY_SECRET
}
```

---

## 📚 REFERENCE LINKS & RESOURCES {#references}

### Official Documentation

**MedusaJS:**
- Main Docs: https://docs.medusajs.com
- API Reference: https://docs.medusajs.com/api/admin
- Customization Guide: https://docs.medusajs.com/development/entities/extend-entity
- Admin UI: https://docs.medusajs.com/admin/widgets
- Storefront: https://docs.medusajs.com/starters/nextjs-medusa-starter

**Razorpay:**
- API Docs: https://razorpay.com/docs/api/
- Payment Methods: https://razorpay.com/docs/payments/
- Webhooks: https://razorpay.com/docs/webhooks/
- Test Cards: https://razorpay.com/docs/payments/payments/test-card-details/
- Integration Checklist: https://razorpay.com/docs/payments/

**Shiprocket:**
- API Documentation: https://apidocs.shiprocket.in
- Authentication: https://apidocs.shiprocket.in/#authentication
- Create Order: https://apidocs.shiprocket.in/#create-order
- Track Shipment: https://apidocs.shiprocket.in/#track-shipment
- Webhooks: https://apidocs.shiprocket.in/#webhooks

**Next.js:**
- Documentation: https://nextjs.org/docs
- App Router: https://nextjs.org/docs/app
- API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Server Components: https://nextjs.org/docs/app/building-your-application/rendering/server-components

---

### Real-Life Project Examples

**1. Medusa Next.js Starter**
- GitHub: https://github.com/medusajs/nextjs-starter-medusa
- Live Demo: https://next.medusajs.com
- Features: Complete storefront with cart, checkout, account

**2. Medusa Digital Products**
- GitHub: https://github.com/medusajs/medusa-starter-digital
- Features: Digital product downloads, payment integration

**3. Medusa Multi-Vendor**
- GitHub: https://github.com/Agilo/medusa-marketplace
- Features: Multi-vendor marketplace functionality

**4. Medusa B2B**
- GitHub: https://github.com/medusajs/b2b-starter-medusa
- Features: B2B features, custom pricing, approval workflows

**5. Indian E-Commerce Examples**
- Myntra Clone: https://github.com/topics/myntra-clone
- Flipkart Clone: https://github.com/topics/flipkart-clone

---

### Community Resources

**Forums & Communities:**
- MedusaJS Discord: https://discord.gg/medusajs
- GitHub Discussions: https://github.com/medusajs/medusa/discussions
- Dev.to Articles: https://dev.to/t/medusajs

**Video Tutorials:**
- MedusaJS YouTube: https://www.youtube.com/@medusajs
- Crash Course: https://www.youtube.com/watch?v=CoSHfzjc8O0
- Custom Admin: https://www.youtube.com/watch?v=E-8E5xD59xQ

**Blogs & Articles:**
- Official Blog: https://medusajs.com/blog
- Payment Integration: https://medusajs.com/blog/payment-providers-guide
- Customization: https://medusajs.com/blog/customizing-medusa

---

### Tools & Libraries

**Development:**
- Medusa CLI: https://www.npmjs.com/package/@medusajs/medusa-cli
- Medusa React: https://www.npmjs.com/package/medusa-react
- Medusa JS Client: https://www.npmjs.com/package/@medusajs/medusa-js

**UI Components:**
- Medusa UI: https://docs.medusajs.com/ui
- Tailwind CSS: https://tailwindcss.com
- shadcn/ui: https://ui.shadcn.com

**Testing:**
- Jest: https://jestjs.io
- React Testing Library: https://testing-library.com/react
- Playwright: https://playwright.dev

**Deployment:**
- DigitalOcean: https://www.digitalocean.com
- Vercel: https://vercel.com
- Railway: https://railway.app
- Render: https://render.com

---

### Learning Resources

**Courses:**
- MedusaJS Official Course: https://docs.medusajs.com/learn
- Next.js Course: https://nextjs.org/learn
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/

**Books:**
- Clean Code: Robert C. Martin
- Domain-Driven Design: Eric Evans
- The Pragmatic Programmer: Andrew Hunt

**Blogs:**
- Kent C. Dodds: https://kentcdodds.com/blog
- Robin Wieruch: https://www.robinwieruch.de/blog
- Josh Comeau: https://www.joshwcomeau.com

---

## 🎓 IMPLEMENTATION CHECKLIST

### Phase 1: Admin Dashboard
- [ ] Install admin dependencies
- [ ] Create COD management widget
- [ ] Create delivery dashboard widget
- [ ] Add COD settings page
- [ ] Add delivery settings page
- [ ] Create backend API endpoints for admin
- [ ] Test all admin features
- [ ] Deploy admin customizations

### Phase 2: Customer Portal
- [ ] Create account dashboard page
- [ ] Build order card component
- [ ] Build order tracking modal
- [ ] Implement tracking API endpoint
- [ ] Add Shiprocket webhook handler
- [ ] Test complete tracking flow
- [ ] Add real-time updates
- [ ] Deploy storefront

### Phase 3: Integration
- [ ] Setup Medusa client
- [ ] Create custom API functions
- [ ] Build React hooks for tracking
- [ ] Build React hooks for COD
- [ ] Build React hooks for pincode check
- [ ] Test all integrations
- [ ] Handle edge cases
- [ ] Add error boundaries

### Phase 4: Testing
- [ ] Unit test services
- [ ] Integration test APIs
- [ ] E2E test complete flows
- [ ] Load test with multiple orders
- [ ] Security audit
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Mobile responsiveness

---

**🎉 YOU NOW HAVE EVERYTHING TO BUILD A PRODUCTION-GRADE E-COMMERCE PLATFORM!**

This guide provides:
✅ Complete admin dashboard integration
✅ Customer portal with order tracking
✅ Backend-frontend communication patterns
✅ Real-life project structure
✅ Golden ratio of development
✅ Industry best practices
✅ Complete code examples
✅ Reference links and resources

**Ready to build! 🚀**
