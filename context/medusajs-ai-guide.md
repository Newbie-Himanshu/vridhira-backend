# MedusaJS Complete Setup & AI Development Guide
*Optimized for Antigravity IDE & AI Agents*

## 🚀 ANTIGRAVITY IDE SETUP

### What is Antigravity?
Antigravity is Google's agent-first IDE powered by Gemini. Unlike traditional editors, it features an "Agent Manager" where you orchestrate autonomous AI agents that work in parallel.

### Initial Setup for MedusaJS Development

**Step 1: Install Antigravity**
- Download from: https://antigravity.google/
- Currently in Public Preview (free for personal accounts)

**Step 2: Install MedusaJS Skills**
```bash
# Install essential skills for backend development
npx @rmyndharis/antigravity-skills install backend-architect
npx @rmyndharis/antigravity-skills install async-python-patterns
npx @rmyndharis/antigravity-skills install api-design-principles

# Install development bundles
npx @rmyndharis/antigravity-skills install --bundle core-dev
```

**Step 3: Create Antigravity Project Rules**
Create `.antigravity/rules.md` in your project root:

```markdown
# MedusaJS Project Rules

## Tech Stack
- Backend: MedusaJS (Node.js + TypeScript)
- Database: PostgreSQL + TypeORM
- Architecture: Services → Repositories → Models

## Critical Rules
1. ALWAYS extend TransactionBaseService for services
2. ALWAYS use dependency injection pattern
3. NEVER modify core Medusa files
4. ALWAYS use atomic phases for transactions
5. Follow file structure: src/services/, src/api/routes/, src/models/

## File Locations
- Services: src/services/*.ts
- API Routes: src/api/routes/admin/* or src/api/routes/store/*
- Models: src/models/*.ts
- Migrations: src/migrations/*
- Subscribers: src/subscribers/*.ts

## Code Standards
- Use TypeScript strict mode
- Import MedusaError for errors
- Use manager for database operations in transactions
- Follow camelCase for methods, PascalCase for classes
```

**Step 4: Configure Agent Workspace**
In Antigravity, create specialized agents:

1. **Backend Agent** - For service and API logic
2. **Database Agent** - For migrations and models
3. **Testing Agent** - For unit tests
4. **Review Agent** - For code reviews

**Step 5: Add MedusaJS Context to Chat**
Start every Antigravity session with:
```
@backend-architect I'm working on MedusaJS. Load project rules from .antigravity/rules.md
```

---

## 📦 INSTALLATION GUIDE

### Prerequisites
```bash
# Required versions
Node.js >= 16
PostgreSQL >= 13
Redis (optional, for caching)
```

### Step 1: Install Medusa CLI
```bash
npm install -g @medusajs/medusa-cli
```

### Step 2: Create New Medusa Project
```bash
# Create backend
medusa new my-medusa-store

cd my-medusa-store

# Install dependencies
npm install
```

### Step 3: Configure Database
```bash
# Create PostgreSQL database
createdb medusa-store

# Update .env file
DATABASE_URL=postgresql://user:password@localhost:5432/medusa-store
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-token
COOKIE_SECRET=your-super-secret-cookie-token
```

### Step 4: Run Migrations
```bash
medusa migrations run
```

### Step 5: Seed Database (Optional)
```bash
npm run seed
```

### Step 6: Start Development Server
```bash
npm run dev
# Backend runs on http://localhost:9000
```

### Step 7: Install Admin Dashboard (Optional)
```bash
cd ..
npx create-medusa-app@latest --admin-only my-medusa-admin
cd my-medusa-admin
npm run dev
# Admin runs on http://localhost:7001
```

### Step 8: Install Storefront (Next.js)
```bash
cd ..
npx create-next-app@latest my-medusa-storefront --starter
cd my-medusa-storefront
npm install @medusajs/medusa-js
```

---

## 🎯 AI CONTEXT RULESET
**Copy this section when working with AI on Medusa projects**

### TECH STACK CONTEXT
```
BACKEND:
- Framework: MedusaJS (Node.js/Express-based)
- Language: TypeScript
- Database: PostgreSQL
- ORM: TypeORM
- API: RESTful + WebSocket events
- Architecture: Modular monolith with dependency injection
- Structure: Services → Repositories → Models

FRONTEND OPTIONS:
- Next.js (recommended storefront)
- React
- Vue/Nuxt
- Any framework via REST API

KEY CONCEPTS:
- Services: Business logic layer
- Subscribers: Event listeners
- Middlewares: Request interceptors
- Repositories: Data access layer
- Models: TypeORM entities
- API Routes: Express routes
```

### ARCHITECTURE RULES FOR AI

---

## ⚠️ COMPREHENSIVE DO'S AND DON'TS

### ✅ ALWAYS DO

#### 1. Service Development
```typescript
✅ DO: Extend TransactionBaseService
class MyService extends TransactionBaseService {
  constructor(container) {
    super(container)
  }
}

✅ DO: Use dependency injection
constructor(container) {
  this.productService = container.productService
  this.orderService = container.orderService
}

✅ DO: Use atomic phases for database operations
async createCustomData(data) {
  return this.atomicPhase_(async (manager) => {
    const repo = manager.getRepository(MyEntity)
    return await repo.save(data)
  })
}

✅ DO: Handle errors with MedusaError
import { MedusaError } from "@medusajs/utils"
throw new MedusaError(
  MedusaError.Types.NOT_FOUND,
  "Product not found"
)

✅ DO: Add JSDoc comments
/**
 * Calculate shipping cost based on cart
 * @param cartId - ID of the cart
 * @returns Calculated shipping cost
 */
async calculateShipping(cartId: string): Promise<number> {}
```

#### 2. API Endpoints
```typescript
✅ DO: Use proper HTTP methods
router.get("/products", ...) // Read
router.post("/products", ...) // Create
router.put("/products/:id", ...) // Update
router.delete("/products/:id", ...) // Delete

✅ DO: Validate input
import { validator } from "@medusajs/medusa"
import { IsString, IsNumber } from "class-validator"

class CreateProductInput {
  @IsString()
  name: string
  
  @IsNumber()
  price: number
}

router.post("/", validator(CreateProductInput), async (req, res) => {
  // Input is validated
})

✅ DO: Use middleware for authentication
import { authenticate } from "@medusajs/medusa"

router.post("/admin/custom", authenticate(), async (req, res) => {
  // User is authenticated
})

✅ DO: Return consistent responses
res.json({
  success: true,
  data: result,
  message: "Operation successful"
})
```

#### 3. Database & Models
```typescript
✅ DO: Create migrations for schema changes
// Never modify database directly in production
npx typeorm migration:create -n AddCustomField

✅ DO: Use proper TypeORM decorators
@Entity()
export class MyEntity extends BaseEntity {
  @Column({ type: "varchar", nullable: false })
  name: string
  
  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number
  
  @CreateDateColumn()
  created_at: Date
}

✅ DO: Add indexes for frequently queried fields
@Entity()
@Index(["email"]) // Add index
export class Customer extends BaseEntity {
  @Column({ unique: true })
  email: string
}

✅ DO: Use relations properly
@ManyToOne(() => Product)
@JoinColumn({ name: "product_id" })
product: Product

@Column()
product_id: string
```

#### 4. Event Handling
```typescript
✅ DO: Subscribe to events properly
class MySubscriber {
  constructor({ eventBusService, myService }) {
    this.myService = myService
    
    eventBusService.subscribe("order.placed", 
      this.handleOrderPlaced.bind(this)
    )
  }
  
  handleOrderPlaced = async (data) => {
    // Handle event
  }
}

✅ DO: Emit events for important actions
await this.eventBusService_.emit("custom.action", {
  id: entity.id,
  metadata: data
})
```

#### 5. Testing
```typescript
✅ DO: Write unit tests for services
import { MyService } from "../my-service"

describe("MyService", () => {
  let service: MyService
  
  beforeEach(() => {
    service = new MyService({
      manager: mockManager,
      productService: mockProductService
    })
  })
  
  it("should calculate correctly", async () => {
    const result = await service.calculate(data)
    expect(result).toBe(expected)
  })
})

✅ DO: Test API endpoints
import request from "supertest"

describe("GET /admin/custom", () => {
  it("returns custom data", async () => {
    const response = await request(app)
      .get("/admin/custom")
      .set("Authorization", `Bearer ${token}`)
    
    expect(response.status).toBe(200)
    expect(response.body.data).toBeDefined()
  })
})
```

### ❌ NEVER DO

#### 1. Service Anti-Patterns
```typescript
❌ DON'T: Directly import and instantiate services
import ProductService from "../services/product"
const productService = new ProductService() // WRONG!

❌ DON'T: Skip TransactionBaseService
class MyService { // WRONG! Missing extension
  async doSomething() {}
}

❌ DON'T: Use direct database queries without transactions
async updateProduct(id, data) {
  await this.manager.query( // WRONG! No transaction
    "UPDATE product SET name = $1 WHERE id = $2",
    [data.name, id]
  )
}

❌ DON'T: Modify core Medusa services
// NEVER edit files in node_modules/@medusajs/

❌ DON'T: Use synchronous operations for I/O
const data = fs.readFileSync("file.txt") // WRONG!
// Use: const data = await fs.promises.readFile("file.txt")

❌ DON'T: Catch errors without re-throwing or handling
try {
  await service.doSomething()
} catch (e) {
  console.log(e) // WRONG! Error is swallowed
}
```

#### 2. API Endpoint Anti-Patterns
```typescript
❌ DON'T: Skip input validation
router.post("/create", async (req, res) => {
  // WRONG! No validation
  const result = await service.create(req.body)
})

❌ DON'T: Expose internal errors to client
res.status(500).json({
  error: err.stack // WRONG! Security risk
})

❌ DON'T: Use generic error messages
throw new Error("Error") // WRONG! Not helpful

❌ DON'T: Forget to handle async errors
router.post("/create", async (req, res) => {
  const result = await service.create(req.body) // WRONG! No try-catch
  res.json(result)
})

// Correct:
router.post("/create", async (req, res) => {
  try {
    const result = await service.create(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: "Failed to create" })
  }
})

❌ DON'T: Mix admin and store logic
// WRONG! Admin endpoint in store routes
app.use("/store/admin-action", router)
```

#### 3. Database Anti-Patterns
```typescript
❌ DON'T: Modify database schema without migrations
// WRONG! Direct ALTER TABLE in code
await manager.query("ALTER TABLE product ADD COLUMN ...")

❌ DON'T: Use SELECT * in production
await repo.find() // WRONG! Fetches all columns
// Use: await repo.find({ select: ["id", "name"] })

❌ DON'T: Create N+1 queries
for (const order of orders) {
  const customer = await customerRepo.findOne(order.customer_id) // WRONG!
}
// Use: Load with relations: { relations: ["customer"] }

❌ DON'T: Store sensitive data unencrypted
@Column()
credit_card: string // WRONG! Never store raw CC data

❌ DON'T: Use hard-coded IDs
const adminRole = await roleRepo.findOne("role_01234") // WRONG!
// Use: await roleRepo.findOne({ where: { name: "admin" } })

❌ DON'T: Forget to add down() migrations
export class MyMigration {
  async up(queryRunner) {
    // ... migration logic
  }
  
  async down(queryRunner) {
    // REQUIRED! Must be able to rollback
  }
}
```

#### 4. Security Anti-Patterns
```typescript
❌ DON'T: Trust user input
const query = `SELECT * FROM users WHERE id = ${req.params.id}` // SQL INJECTION!

❌ DON'T: Expose API keys in code
const STRIPE_KEY = "sk_live_..." // WRONG! Use .env

❌ DON'T: Skip authentication checks
router.delete("/admin/products/:id", async (req, res) => {
  // WRONG! No authentication
  await productService.delete(req.params.id)
})

❌ DON'T: Log sensitive information
console.log("User password:", user.password) // WRONG!

❌ DON'T: Use weak JWT secrets
JWT_SECRET=secret // WRONG! Use strong random string
```

#### 5. Code Organization Anti-Patterns
```typescript
❌ DON'T: Put everything in one file
// my-service.ts (5000 lines) - WRONG!

❌ DON'T: Use magic numbers/strings
if (status === 5) {} // WRONG! What is 5?
// Use: const PENDING_STATUS = 5

❌ DON'T: Create god objects
class SuperService extends TransactionBaseService {
  // 50+ methods - WRONG! Split into multiple services
}

❌ DON'T: Ignore TypeScript types
async getData(id: any): any { // WRONG! Use proper types
  return await this.repo.find(id)
}

❌ DON'T: Use var
var count = 0 // WRONG! Use const or let
```

#### 6. Performance Anti-Patterns
```typescript
❌ DON'T: Load all data when paginating
const products = await productRepo.find() // WRONG! Loads everything

❌ DON'T: Make unnecessary database calls
for (let i = 0; i < 1000; i++) {
  await repo.save({ name: `Product ${i}` }) // WRONG! 1000 queries
}
// Use: await repo.insert(arrayOfProducts) // 1 query

❌ DON'T: Forget to close connections
const connection = await createConnection()
// ... do work
// WRONG! Connection not closed

❌ DON'T: Cache everything blindly
const allProducts = await cache.get("all_products") // WRONG! May be huge
```

---

### 🎯 ANTIGRAVITY-SPECIFIC DO'S AND DON'TS

#### ✅ DO in Antigravity

```typescript
✅ DO: Use task artifacts for complex changes
// In Antigravity, request a task list first:
"Create a task list for implementing loyalty points system in MedusaJS"
// Review the plan before execution

✅ DO: Use multiple agents for parallel work
Agent 1: "Create the loyalty service"
Agent 2: "Create the API endpoints"
Agent 3: "Write tests"

✅ DO: Reference project rules
"@backend-architect Follow .antigravity/rules.md and create a discount service"

✅ DO: Use skills for specific tasks
"@api-design-principles Design a RESTful API for custom orders"

✅ DO: Request implementation plans
"Show me an implementation plan for this feature before writing code"
```

#### ❌ DON'T in Antigravity

```typescript
❌ DON'T: Ask generic questions without context
"Create a service" // WRONG! Too vague

✅ DO:
"Following MedusaJS patterns, create a service that extends TransactionBaseService 
to calculate dynamic shipping rates based on cart weight and destination"

❌ DON'T: Accept code without reviewing artifacts
// Always review the task list and implementation plan first

❌ DON'T: Install all skills
npx antigravity-skills install --all // WRONG! Causes token bloat

✅ DO: Install targeted skills
npx antigravity-skills install --bundle core-dev

❌ DON'T: Skip project initialization
// WRONG! Starting without .antigravity/rules.md

❌ DON'T: Mix multiple unrelated tasks
"Create a service, fix this bug, and refactor that module" // WRONG!
```

---

### ARCHITECTURE RULES FOR AI

#### 1. PROJECT STRUCTURE
```
src/
├── api/                    # API routes
│   ├── routes/            # Custom routes
│   └── middlewares/       # Custom middleware
├── models/                # Database entities (TypeORM)
├── repositories/          # Data access layer
├── services/              # Business logic
├── subscribers/           # Event handlers
├── migrations/            # Database migrations
├── loaders/               # Initialization logic
└── types/                 # TypeScript types
```

#### 2. CUSTOM LOGIC PATTERNS

**Pattern A: Custom Service**
```typescript
// LOCATION: src/services/my-custom.ts
import { TransactionBaseService } from "@medusajs/medusa"

class MyCustomService extends TransactionBaseService {
  constructor(container) {
    super(container)
    // Inject dependencies
    this.productService = container.productService
  }

  async customLogic(data) {
    return this.atomicPhase_(async (manager) => {
      // Your logic here
      // Use manager for transactions
    })
  }
}

export default MyCustomService
```

**Pattern B: Custom API Endpoint**
```typescript
// LOCATION: src/api/routes/custom/index.ts
import { Router } from "express"

export default (app: Router) => {
  const router = Router()
  
  router.post("/custom-endpoint", async (req, res) => {
    const myService = req.scope.resolve("myCustomService")
    const result = await myService.customLogic(req.body)
    res.json(result)
  })

  app.use("/admin/custom", router)
}
```

**Pattern C: Subscriber (Event Listener)**
```typescript
// LOCATION: src/subscribers/my-subscriber.ts
class MySubscriber {
  constructor({ eventBusService }) {
    eventBusService.subscribe("order.placed", this.handleOrderPlaced)
  }

  handleOrderPlaced = async (data) => {
    // React to events
  }
}

export default MySubscriber
```

**Pattern D: Custom Model/Entity**
```typescript
// LOCATION: src/models/my-entity.ts
import { Entity, Column } from "typeorm"
import { BaseEntity } from "@medusajs/medusa"

@Entity()
export class MyEntity extends BaseEntity {
  @Column()
  custom_field: string
}
```

#### 3. DEVELOPMENT WORKFLOW RULES

**RULE 1: Always extend core services, never modify**
```
✅ DO: Create new service extending TransactionBaseService
❌ DON'T: Modify core Medusa services
```

**RULE 2: Use dependency injection**
```typescript
✅ DO: 
constructor(container) {
  this.productService = container.productService
}

❌ DON'T: 
import ProductService directly
```

**RULE 3: Use atomic phases for transactions**
```typescript
✅ DO:
return this.atomicPhase_(async (manager) => {
  // database operations
})

❌ DON'T: 
Direct database queries without transaction
```

**RULE 4: Follow naming conventions**
```
Services: *Service (e.g., MyCustomService)
Routes: kebab-case (e.g., /my-custom-route)
Models: PascalCase (e.g., MyEntity)
Methods: camelCase (e.g., customLogic)
```

**RULE 5: Handle errors properly**
```typescript
✅ DO:
import { MedusaError } from "@medusajs/utils"
throw new MedusaError(
  MedusaError.Types.NOT_FOUND,
  "Resource not found"
)

❌ DON'T: 
throw new Error("...")
```

#### 4. API ENDPOINT RULES

**Admin API Routes:**
- Prefix: `/admin/*`
- Authentication: Required (JWT)
- Location: `src/api/routes/admin/`

**Store API Routes:**
- Prefix: `/store/*`
- Authentication: Optional
- Location: `src/api/routes/store/`

**Custom Routes:**
- Can use any prefix
- Register in `src/api/index.ts`

#### 5. DATABASE MIGRATION RULES

**Always create migrations for schema changes:**
```bash
# Generate migration
npx typeorm migration:create -n MyMigration

# Run migrations
medusa migrations run
```

**Migration Template:**
```typescript
// LOCATION: src/migrations/TIMESTAMP-MyMigration.ts
import { MigrationInterface, QueryRunner } from "typeorm"

export class MyMigration implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "my_table" ADD COLUMN "new_field" VARCHAR
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "my_table" DROP COLUMN "new_field"
    `)
  }
}
```

---

## 🤖 AI PROMPT TEMPLATE

**Use this template when asking AI to build custom logic:**

```
I'm working with MedusaJS backend. Here's the context:

TECH STACK: MedusaJS, TypeScript, PostgreSQL, TypeORM
ARCHITECTURE: Services → Repositories → Models

TASK: [Describe what you want]

REQUIREMENTS:
- Follow Medusa's dependency injection pattern
- Use atomic phases for transactions
- Extend TransactionBaseService for services
- Use proper error handling with MedusaError
- Follow the file structure: src/services/ or src/api/routes/

EXAMPLE REQUEST:
"Create a custom service that calculates shipping costs based on distance.
It should:
1. Extend TransactionBaseService
2. Inject cartService and regionService
3. Have a method calculateShipping(cartId, address)
4. Return the shipping cost
5. Include proper error handling"

Please provide:
1. The service file (src/services/*)
2. The API endpoint (src/api/routes/*)
3. Any required types (src/types/*)
4. Migration if needed
```

---

## 📋 COMMON CUSTOM LOGIC EXAMPLES

### Example 1: Custom Discount Logic
```typescript
// src/services/custom-discount.ts
import { TransactionBaseService } from "@medusajs/medusa"

class CustomDiscountService extends TransactionBaseService {
  async applyBulkDiscount(cartId: string) {
    const cartService = this.container.cartService
    const cart = await cartService.retrieve(cartId, {
      relations: ["items"]
    })
    
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
    let discount = 0
    
    if (itemCount >= 10) discount = 0.15
    else if (itemCount >= 5) discount = 0.10
    
    return discount
  }
}

export default CustomDiscountService
```

### Example 2: Custom Product Filter
```typescript
// src/api/routes/store/products/filtered.ts
export default async (req, res) => {
  const productService = req.scope.resolve("productService")
  
  const [products] = await productService.listAndCount({
    price: { $gte: req.query.minPrice, $lte: req.query.maxPrice }
  })
  
  res.json({ products })
}
```

### Example 3: Order Notification Subscriber
```typescript
// src/subscribers/order-notification.ts
class OrderNotificationSubscriber {
  constructor({ eventBusService, notificationService }) {
    this.notificationService = notificationService
    
    eventBusService.subscribe("order.placed", this.sendNotification)
  }
  
  sendNotification = async (data) => {
    await this.notificationService.sendNotification(
      "order.placed",
      data,
      null
    )
  }
}

export default OrderNotificationSubscriber
```

---

## 🔧 DEBUGGING & TESTING

### Enable Debug Logs
```bash
# .env
LOG_LEVEL=debug
```

### Test Custom Endpoints
```bash
# Using curl
curl -X POST http://localhost:9000/admin/custom-endpoint \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": "value"}'
```

### Test with Postman
```
Import Medusa's Postman collection:
https://docs.medusajs.com/api/admin
```

---

## 📚 KEY MEDUSA CONCEPTS FOR AI

### 1. Service Resolution
```typescript
// In routes
const myService = req.scope.resolve("myCustomService")

// In services
const productService = this.container.productService
```

### 2. Event System
```
Events: order.placed, cart.updated, product.created, etc.
Subscribe in subscribers/
Emit: eventBusService.emit("custom.event", data)
```

### 3. Extending Core Models
```typescript
// Extend Product model
import { Product as MedusaProduct } from "@medusajs/medusa"

@Entity()
export class Product extends MedusaProduct {
  @Column()
  custom_field: string
}
```

### 4. Plugin System
```typescript
// Create plugin: src/plugins/my-plugin/
export default {
  services: [MyService],
  repositories: [MyRepository],
  models: [MyModel]
}
```

---

## ⚡ QUICK REFERENCE

### Create Custom Service
```bash
1. Create: src/services/my-service.ts
2. Extend: TransactionBaseService
3. Register automatically (no config needed)
4. Use: req.scope.resolve("myService")
```

### Create Custom Route
```bash
1. Create: src/api/routes/custom/index.ts
2. Export router function
3. Register in src/api/index.ts
4. Access: /admin/custom or /store/custom
```

### Create Subscriber
```bash
1. Create: src/subscribers/my-subscriber.ts
2. Subscribe to events in constructor
3. Auto-registered on server start
```

### Create Migration
```bash
npx typeorm migration:create -n MyMigration
# Edit: src/migrations/TIMESTAMP-MyMigration.ts
medusa migrations run
```

---

## 🎨 FRONTEND INTEGRATION

### Next.js Storefront Setup
```typescript
// lib/medusa.ts
import Medusa from "@medusajs/medusa-js"

export const medusa = new Medusa({
  baseUrl: "http://localhost:9000",
  maxRetries: 3,
})

// Usage in pages
const { products } = await medusa.products.list()
```

### API Call Examples
```typescript
// Get products
await medusa.products.list()

// Get cart
await medusa.carts.retrieve(cartId)

// Create order
await medusa.carts.complete(cartId)

// Custom endpoint
await fetch("http://localhost:9000/store/custom-endpoint", {
  method: "POST",
  body: JSON.stringify(data)
})
```

---

## 🚀 PRODUCTION CHECKLIST

- [ ] Environment variables secured
- [ ] Database migrations run
- [ ] Redis configured for production
- [ ] CORS configured properly
- [ ] JWT secrets are strong
- [ ] File upload storage configured (S3/MinIO)
- [ ] Email service configured
- [ ] Payment providers configured
- [ ] SSL certificates installed
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Error tracking (Sentry)

---

## 📖 ADDITIONAL RESOURCES

- Official Docs: https://docs.medusajs.com
- API Reference: https://docs.medusajs.com/api/admin
- GitHub: https://github.com/medusajs/medusa
- Discord: https://discord.gg/medusajs

---

## 💡 PRO TIPS FOR AI DEVELOPMENT

1. **Always specify file paths** when asking AI to create files
2. **Include the full tech stack context** in your prompts
3. **Request TypeScript types** for better code quality
4. **Ask for error handling** explicitly
5. **Request tests** for critical logic
6. **Specify Medusa version** if using specific features
7. **Include example data structures** in your requests
8. **Ask for comments** in complex logic
9. **Request validation** for user inputs
10. **Specify API route prefixes** (/admin or /store)

---

## 🎯 EXAMPLE AI CONVERSATION

**You:** "Following the MedusaJS context ruleset above, create a loyalty points system. Customers earn 1 point per $1 spent. Create the service, model, migration, and API endpoint to check points."

**AI will provide:**
1. `src/models/loyalty-points.ts` - Model
2. `src/services/loyalty-points.ts` - Service
3. `src/migrations/XXXXX-CreateLoyaltyPoints.ts` - Migration
4. `src/api/routes/store/loyalty/index.ts` - API endpoint
5. `src/types/loyalty-points.ts` - Types
6. `src/subscribers/order-loyalty.ts` - Auto-award points on order

All following Medusa's patterns!

---

**SAVE THIS FILE AND REFERENCE IT WHEN WORKING WITH AI ON MEDUSA PROJECTS**

---

## 🤖 ANTIGRAVITY WORKFLOW FOR MEDUSAJS

### Recommended Agent Setup

**Create 4 Specialized Agents:**

1. **Architect Agent** - Planning & Design
   - Skills: `backend-architect`, `api-design-principles`
   - Use for: Feature planning, architecture decisions
   
2. **Implementation Agent** - Coding
   - Skills: `async-python-patterns`, `conductor-implement`
   - Use for: Writing services, API routes, models
   
3. **Database Agent** - Schema Management
   - Skills: Database-specific skills
   - Use for: Migrations, entity design
   
4. **QA Agent** - Testing & Review
   - Skills: `security-auditor`, testing skills
   - Use for: Code review, test writing, security checks

### Step-by-Step Workflow

#### Phase 1: Planning (Architect Agent)
```
You: "@backend-architect I need to add a referral system to MedusaJS. 
      Create an implementation plan following project rules."

Agent: [Creates task artifact with breakdown]
- Create Referral model
- Create ReferralService
- Create API endpoints
- Create subscriber for rewards
- Create migration
- Write tests

You: [Review plan] "Approved. Let's proceed."
```

#### Phase 2: Implementation (Parallel Agents)

**Agent 1 (Database):**
```
"Create Referral entity in src/models/referral.ts with fields:
- referrer_id (customer)
- referred_id (customer)  
- reward_amount (decimal)
- status (enum: pending, completed)
- created_at

Follow MedusaJS model patterns, extend BaseEntity."
```

**Agent 2 (Service):**
```
"Create ReferralService in src/services/referral.ts.
Methods needed:
- createReferral(referrerId, referredId)
- completeReferral(referralId)
- getReferralsByCustomer(customerId)

Inject customerService and use atomic phases for transactions."
```

**Agent 3 (API):**
```
"Create API endpoints in src/api/routes/store/referral/index.ts:
POST /store/referral - Create referral
GET /store/referral/me - Get my referrals
PATCH /store/referral/:id - Update referral

Include input validation and error handling."
```

#### Phase 3: Testing (QA Agent)
```
"@security-auditor Review the referral system code for:
- Input validation issues
- Authentication gaps
- SQL injection risks
- Business logic errors

Also write unit tests for ReferralService."
```

#### Phase 4: Integration
```
"Create migration for referral table and update seed data.
Test the complete flow end-to-end."
```

### Antigravity Commands for MedusaJS

```bash
# Start new feature track
"Start a new feature: loyalty rewards system"

# Create service scaffold
"Scaffold a new service for email notifications following MedusaJS patterns"

# Review existing code
"Review src/services/custom-shipping.ts for Medusa best practices"

# Fix issues
"Fix the authentication issue in src/api/routes/admin/custom.ts"

# Generate tests
"Write comprehensive tests for ReferralService"

# Create documentation
"Document the custom discount API endpoints"
```

### Best Practices in Antigravity

#### 1. Always Provide Context
```
❌ "Create a product service"

✅ "Following MedusaJS architecture (Services extend TransactionBaseService, 
    use dependency injection, atomic phases for transactions), create a 
    ProductRecommendationService that suggests products based on purchase history."
```

#### 2. Use Artifacts for Review
```
"Before writing code, create:
1. Implementation plan artifact
2. API design artifact
3. Database schema artifact

Then proceed with implementation."
```

#### 3. Leverage Multi-Agent Workflows
```
# Sequential (when order matters)
Agent 1: Create models
→ Agent 2: Create services (uses models)
→ Agent 3: Create API (uses services)

# Parallel (when independent)
Agent 1: Create ShippingService
Agent 2: Create PaymentService
Agent 3: Create NotificationService
```

#### 4. Reference Project Context
```
"Load .antigravity/rules.md and implement feature X"
```

#### 5. Iterative Refinement
```
Phase 1: "Create basic structure"
Phase 2: "Add error handling"
Phase 3: "Add validation"
Phase 4: "Optimize performance"
Phase 5: "Add tests"
```

### Troubleshooting Common Issues

#### Issue: Agent creates code that doesn't follow Medusa patterns
**Solution:**
```
"Stop. Review the MedusaJS context in this conversation:
- Services MUST extend TransactionBaseService
- Use dependency injection (container pattern)
- Use atomic phases for transactions
- Import from @medusajs/medusa

Now regenerate following these rules."
```

#### Issue: Code has type errors
**Solution:**
```
"Enable TypeScript strict mode and fix all type errors.
Import types from @medusajs/medusa where needed."
```

#### Issue: Migration fails
**Solution:**
```
"Review the migration following TypeORM patterns.
Ensure:
- Both up() and down() are implemented
- Proper naming: TIMESTAMP-DescriptiveName
- No breaking changes for existing data
Regenerate if needed."
```

#### Issue: API endpoint not authenticated
**Solution:**
```
"Add authentication middleware:
import { authenticate } from '@medusajs/medusa'
router.use(authenticate())

Or for specific routes:
router.post('/protected', authenticate(), handler)"
```

### Antigravity Shortcuts

```bash
# Quick scaffold patterns
/scaffold service MyCustomService
/scaffold api-route /admin/custom
/scaffold model MyEntity
/scaffold migration AddCustomField

# Code review
/review src/services/my-service.ts --checklist medusa

# Fix common issues
/fix-types src/services/
/fix-imports src/api/

# Generate documentation
/document src/services/my-service.ts --format jsdoc
```

### Performance Tips

1. **Install only needed skills**
   ```bash
   npx antigravity-skills search medusa
   npx antigravity-skills install <relevant-skill>
   ```

2. **Use project-specific rules**
   - Keep .antigravity/rules.md updated
   - Reference it in every session

3. **Batch related tasks**
   - "Create model, service, and API for feature X"
   - Instead of 3 separate requests

4. **Use task artifacts**
   - Let agent create plan first
   - Review before execution
   - Prevents wasted iterations

### Example Session

```
# Session Start
You: "Load project rules and MedusaJS context"

# Feature Request
You: "I need to implement a subscription system for recurring orders"

# Planning Phase
Agent: [Creates task artifact]
- Design subscription model
- Create SubscriptionService
- Create billing subscriber
- Create admin API endpoints
- Create customer API endpoints  
- Write tests
- Create migration

# Review
You: "Approved. Start with phases 1-3"

# Implementation
[Agent creates files]
✓ src/models/subscription.ts
✓ src/services/subscription.ts  
✓ src/subscribers/subscription-billing.ts

# Testing
You: "@security-auditor Review for security issues"
[Agent reviews and suggests improvements]

# Finalize
You: "Create migration and update documentation"
[Agent completes remaining tasks]

# Done!
You: "Test the complete flow"
[Agent provides test script]
```

---

## 📚 ADDITIONAL ANTIGRAVITY RESOURCES

- Antigravity Docs: https://antigravity.google/
- Antigravity Skills Hub: https://antigravity.codes/
- MedusaJS Docs: https://docs.medusajs.com
- Community Discord: https://discord.gg/medusajs

---

## 🎓 TRAINING YOUR ANTIGRAVITY AGENT

### Create a Custom MedusaJS Skill

**Location:** `.antigravity/skills/medusajs-expert/SKILL.md`

```markdown
# MedusaJS Expert Skill

## Description
Expert in MedusaJS ecommerce backend development

## Context
- Architecture: Services → Repositories → Models
- Language: TypeScript
- ORM: TypeORM
- Pattern: Dependency injection

## Rules
1. Always extend TransactionBaseService
2. Use atomic phases for transactions
3. Follow naming: *Service, kebab-case routes, PascalCase models
4. Inject dependencies via container
5. Use MedusaError for errors

## Example Service
\`\`\`typescript
import { TransactionBaseService } from "@medusajs/medusa"

class MyService extends TransactionBaseService {
  constructor(container) {
    super(container)
    this.productService = container.productService
  }

  async customMethod(data) {
    return this.atomicPhase_(async (manager) => {
      // Transaction logic
    })
  }
}
\`\`\`

## Activation
Auto-activates when: "medusa", "ecommerce backend", "transaction service"
```

### Install the Skill
```bash
# Antigravity will auto-load from .antigravity/skills/
# Or install globally
cp -r .antigravity/skills/medusajs-expert ~/.antigravity/skills/
```

---

**SAVE THIS FILE AND REFERENCE IT WHEN WORKING WITH AI ON MEDUSA PROJECTS**
