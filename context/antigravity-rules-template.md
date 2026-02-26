# MedusaJS Project Rules for Antigravity

## 🎯 Project Overview
**Type:** Ecommerce Backend  
**Framework:** MedusaJS  
**Language:** TypeScript  
**Database:** PostgreSQL + TypeORM  
**Architecture:** Modular Monolith with Dependency Injection  

---

## 🏗️ Architecture Pattern

```
Services → Repositories → Models

- Services: Business logic layer
- Repositories: Data access layer  
- Models: TypeORM entities
- API Routes: Express routes
- Subscribers: Event listeners
```

---

## ⚡ CRITICAL RULES - NEVER VIOLATE

### 1. Service Development
- ✅ ALWAYS extend `TransactionBaseService`
- ✅ ALWAYS use dependency injection via `container`
- ✅ ALWAYS use `atomicPhase_` for database operations
- ✅ ALWAYS use `MedusaError` for errors
- ❌ NEVER modify core Medusa files in `node_modules`
- ❌ NEVER instantiate services directly with `new`

### 2. File Structure
```
src/
├── api/                    # API routes
│   ├── routes/            
│   │   ├── admin/         # Admin endpoints (/admin/*)
│   │   └── store/         # Storefront endpoints (/store/*)
│   └── middlewares/       # Custom middleware
├── models/                # Database entities
├── repositories/          # Data access layer
├── services/              # Business logic (extend TransactionBaseService)
├── subscribers/           # Event handlers
├── migrations/            # Database migrations
├── loaders/               # Initialization logic
└── types/                 # TypeScript types
```

### 3. Naming Conventions
- Services: `PascalCase` + `Service` suffix (e.g., `MyCustomService`)
- Routes: `kebab-case` (e.g., `/my-custom-route`)
- Models: `PascalCase` (e.g., `MyEntity`)
- Files: `kebab-case.ts` (e.g., `my-custom-service.ts`)
- Methods: `camelCase` (e.g., `calculateShipping`)

### 4. Database Operations
- ✅ ALWAYS create migrations for schema changes
- ✅ ALWAYS implement both `up()` and `down()` in migrations
- ✅ ALWAYS use transactions via `atomicPhase_`
- ❌ NEVER run raw ALTER TABLE in code
- ❌ NEVER use SELECT * in production
- ❌ NEVER store sensitive data unencrypted

### 5. API Development
- ✅ ALWAYS validate input with `class-validator`
- ✅ ALWAYS use `authenticate()` middleware for protected routes
- ✅ ALWAYS handle async errors with try-catch
- ✅ ALWAYS return consistent JSON responses
- ❌ NEVER expose internal error details to clients
- ❌ NEVER skip authentication on admin routes

---

## 📝 CODE TEMPLATES

### Service Template
```typescript
import { TransactionBaseService } from "@medusajs/medusa"
import { MedusaError } from "@medusajs/utils"

class MyService extends TransactionBaseService {
  constructor(container) {
    super(container)
    // Inject dependencies
    this.productService = container.productService
  }

  async myMethod(data) {
    return this.atomicPhase_(async (manager) => {
      // Transaction logic here
      // Use this.productService.withTransaction(manager)
    })
  }
}

export default MyService
```

### API Route Template
```typescript
import { Router } from "express"
import { authenticate, validator } from "@medusajs/medusa"
import { IsString } from "class-validator"

class InputClass {
  @IsString()
  field: string
}

export default (app: Router) => {
  const router = Router()
  
  router.post(
    "/",
    authenticate(),
    validator(InputClass),
    async (req, res) => {
      try {
        const service = req.scope.resolve("myService")
        const result = await service.myMethod(req.body)
        res.json({ success: true, data: result })
      } catch (error) {
        res.status(400).json({ 
          success: false, 
          message: error.message 
        })
      }
    }
  )

  app.use("/admin/my-route", router)
}
```

### Model Template
```typescript
import { Entity, Column } from "typeorm"
import { BaseEntity } from "@medusajs/medusa"

@Entity()
export class MyEntity extends BaseEntity {
  @Column({ type: "varchar" })
  field_name: string
}
```

### Migration Template
```typescript
import { MigrationInterface, QueryRunner } from "typeorm"

export class MyMigration1234567890 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Your SQL here
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Reverse changes
    `)
  }
}
```

---

## 🔧 Development Workflow

### When Creating a New Feature:
1. **Plan** - Create implementation plan artifact
2. **Model** - Define entity in `src/models/`
3. **Service** - Implement logic in `src/services/`
4. **API** - Create routes in `src/api/routes/`
5. **Subscriber** - Add event handlers if needed in `src/subscribers/`
6. **Migration** - Generate DB migration
7. **Test** - Write unit/integration tests
8. **Review** - Security and code quality check

### Commands:
```bash
# Generate migration
npx typeorm migration:create -n MyMigration

# Run migrations
medusa migrations run

# Start dev server
npm run dev
```

---

## 🚫 COMMON ANTI-PATTERNS

### DON'T:
```typescript
// ❌ Direct service instantiation
const service = new ProductService()

// ❌ No transaction wrapper
await this.manager.query("UPDATE ...")

// ❌ Missing error handling
await service.doSomething() // No try-catch

// ❌ No input validation
router.post("/create", async (req, res) => {
  // No validator
})

// ❌ Skip authentication
router.post("/admin/delete", handler) // No authenticate()

// ❌ Expose internal errors
res.json({ error: err.stack })

// ❌ Use var
var count = 0

// ❌ Use any type
async getData(id: any): any {}
```

### DO:
```typescript
// ✅ Use dependency injection
const service = container.productService

// ✅ Use atomic phases
return this.atomicPhase_(async (manager) => {
  // operations
})

// ✅ Handle errors properly
try {
  await service.doSomething()
} catch (error) {
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    error.message
  )
}

// ✅ Validate input
router.post("/create", validator(InputClass), handler)

// ✅ Require authentication
router.post("/admin/delete", authenticate(), handler)

// ✅ Safe error responses
res.status(400).json({ message: "Operation failed" })

// ✅ Use const/let
const count = 0

// ✅ Use proper types
async getData(id: string): Promise<Data> {}
```

---

## 🎯 DEPENDENCY INJECTION MAP

Common services available via `container`:

```typescript
constructor(container) {
  // Core services
  this.productService = container.productService
  this.orderService = container.orderService
  this.cartService = container.cartService
  this.customerService = container.customerService
  this.regionService = container.regionService
  this.shippingProfileService = container.shippingProfileService
  this.paymentProviderService = container.paymentProviderService
  
  // Utilities
  this.eventBusService = container.eventBusService
  this.manager = container.manager
  
  // Custom services (if created)
  this.myCustomService = container.myCustomService
}
```

---

## 🛡️ SECURITY CHECKLIST

Before implementing any feature, verify:
- [ ] Input validation on all endpoints
- [ ] Authentication on admin routes
- [ ] No SQL injection vulnerabilities
- [ ] No sensitive data in logs
- [ ] Proper error handling (no stack traces to client)
- [ ] No hardcoded secrets (use .env)
- [ ] Rate limiting on public endpoints
- [ ] CORS properly configured

---

## 📊 PERFORMANCE GUIDELINES

- Use `select` to limit fetched fields
- Use pagination with `skip` and `take`
- Add database indexes on frequently queried fields
- Use bulk operations instead of loops
- Cache frequently accessed data
- Use eager loading for relations when needed
- Profile slow queries

---

## 🧪 TESTING REQUIREMENTS

Every feature should include:
1. **Unit tests** for services
2. **Integration tests** for API endpoints
3. **Validation tests** for input schemas
4. **Error handling tests**
5. **Security tests** (authentication, authorization)

---

## 📚 REFERENCE LINKS

- MedusaJS Docs: https://docs.medusajs.com
- API Reference: https://docs.medusajs.com/api/admin
- TypeORM Docs: https://typeorm.io

---

## 💬 HOW TO USE WITH ANTIGRAVITY

### At Session Start:
```
Load .antigravity/rules.md for this MedusaJS project
```

### When Requesting Features:
```
Following the MedusaJS rules, create [feature description]
Show implementation plan first
```

### For Code Review:
```
Review [file] against .antigravity/rules.md for:
- Pattern compliance
- Security issues
- Performance problems
```

---

## 🔄 MAINTENANCE

This file should be updated when:
- Project structure changes
- New patterns are adopted
- New services are created
- New conventions are established

**Last Updated:** [Your Date]
**Project Version:** [Your Version]

---

**Remember:** These rules ensure consistency, security, and maintainability.  
Follow them strictly when generating code with Antigravity.

---

## 💎 PRO TIPS & BEST PRACTICES

### 🚀 Development Workflow Tips

#### Tip 1: Start with Data Modeling
```
❌ Jump straight into coding
✅ Design your data model first

Steps:
1. Sketch entity relationships
2. Define fields and types
3. Plan indexes
4. Then create model, service, API
```

#### Tip 2: Use Feature Branches
```bash
# Create feature branch
git checkout -b feature/loyalty-points

# Make changes incrementally
git commit -m "Add loyalty points model"
git commit -m "Add loyalty service"
git commit -m "Add API endpoints"

# Easier to review and rollback
```

#### Tip 3: Test Locally Before Migration
```typescript
// Test service logic without migration first
const service = new LoyaltyService(container)
const result = await service.calculatePoints({
  amount: 100,
  customerId: "test_123"
})
console.log(result) // Should be 100 points

// Once logic works, run migration
```

#### Tip 4: Use Database Seeding for Development
```typescript
// src/seeds/loyalty-test-data.ts
export default async function seedLoyaltyData(container) {
  const loyaltyService = container.loyaltyService
  
  await loyaltyService.create({
    customer_id: "cus_01",
    points: 1000,
    tier: "gold"
  })
}
```

#### Tip 5: Keep Services Focused
```
❌ One service with 50 methods
✅ Multiple focused services

Good example:
- OrderProcessingService (handles order flow)
- OrderNotificationService (sends emails)
- OrderAnalyticsService (tracking/reports)

Each service = single responsibility
```

---

### 🤖 Antigravity-Specific Pro Tips

#### Tip 6: Create Agent Roles
```
Instead of one generic agent, create:

1. 🏗️ Architect Agent
   Prompt: "You are a backend architect. Focus on system design,
   data modeling, and architecture decisions for MedusaJS."

2. 👨‍💻 Implementation Agent  
   Prompt: "You write production-quality TypeScript code for MedusaJS.
   Always follow patterns in .antigravity/rules.md"

3. 🗄️ Database Agent
   Prompt: "You design database schemas and write migrations for
   MedusaJS/TypeORM. Focus on performance and data integrity."

4. 🧪 QA Agent
   Prompt: "You review code for bugs, security issues, and pattern
   violations. Write comprehensive tests."
```

#### Tip 7: Use Task Artifacts for Complex Features
```
You: "Create a complete referral system for MedusaJS"

Agent: [Creates task artifact]
✓ Phase 1: Data model design
✓ Phase 2: Service implementation
✓ Phase 3: API endpoints
✓ Phase 4: Event subscribers
✓ Phase 5: Tests
✓ Phase 6: Documentation

You can:
- Review each phase
- Modify the plan
- Execute phases in parallel
- Track progress
```

#### Tip 8: Version Your Prompts
```markdown
# .antigravity/prompts/create-service.md

## Version 2.1
Following MedusaJS patterns from .antigravity/rules.md, create [ServiceName]:

1. Extend TransactionBaseService
2. Inject: [dependencies]
3. Methods: [list]
4. Use atomic phases
5. Include types and error handling
6. Add JSDoc comments
7. Write unit tests

Location: src/services/[name].ts
```

#### Tip 9: Use Skill Combinations
```bash
# For API development
@backend-architect + @api-design-principles

# For database work
@backend-architect + @database-optimization

# For testing
@security-auditor + @test-driven-development
```

#### Tip 10: Cache Expensive Operations in Antigravity
```
# Create reusable context
You: "Save this context as 'medusa-project-setup'"

Later sessions:
You: "Load context 'medusa-project-setup'"
# Agent remembers your project structure instantly
```

---

### ⚡ MedusaJS-Specific Pro Tips

#### Tip 11: Use Service Composition
```typescript
// Good: Compose small services
class OrderFulfillmentService extends TransactionBaseService {
  constructor(container) {
    super(container)
    this.orderService = container.orderService
    this.inventoryService = container.inventoryService
    this.shippingService = container.shippingService
    this.notificationService = container.notificationService
  }

  async fulfillOrder(orderId: string) {
    return this.atomicPhase_(async (manager) => {
      // Orchestrate multiple services
      const order = await this.orderService
        .withTransaction(manager)
        .retrieve(orderId)
      
      await this.inventoryService
        .withTransaction(manager)
        .reserve(order.items)
      
      await this.shippingService
        .withTransaction(manager)
        .createLabel(order)
      
      await this.notificationService
        .sendNotification("order.fulfilled", order)
    })
  }
}
```

#### Tip 12: Use Event-Driven Architecture
```typescript
// Instead of calling services directly
❌ await emailService.sendOrderConfirmation(order)

// Emit events
✅ await this.eventBusService_.emit("order.placed", { id: order.id })

// Subscribe in separate service
class OrderNotificationSubscriber {
  constructor({ eventBusService, emailService }) {
    eventBusService.subscribe("order.placed", async (data) => {
      await emailService.sendOrderConfirmation(data.id)
    })
  }
}

Benefits:
- Decoupled services
- Easy to add new listeners
- Better for async operations
```

#### Tip 13: Leverage Medusa's Built-in Features
```typescript
// Use built-in price selection
const product = await productService.retrieve(id, {
  relations: ["variants", "variants.prices"],
  select: ["id", "title"]
})

const price = await pricingService.calculateVariantPrice(
  variant,
  { region_id: regionId, currency_code: "usd" }
)

// Use built-in tax calculation
const taxRate = await taxRateService.retrieve(taxRateId)

// Use built-in inventory management
await inventoryService.adjustInventory(variantId, quantity)

// Don't reinvent the wheel!
```

#### Tip 14: Use Medusa's Configuration System
```typescript
// medusa-config.js
module.exports = {
  projectConfig: {
    redis_url: REDIS_URL,
    database_url: DATABASE_URL,
    // Your custom config
    custom_config: {
      loyalty_points_rate: 1, // 1 point per $1
      referral_bonus: 500
    }
  }
}

// Access in service
class LoyaltyService extends TransactionBaseService {
  constructor(container) {
    super(container)
    const configModule = container.configModule
    this.pointsRate = configModule.projectConfig.custom_config.loyalty_points_rate
  }
}
```

#### Tip 15: Use Repository Pattern Properly
```typescript
// Create custom repository for complex queries
// src/repositories/loyalty-points.ts
import { EntityRepository, Repository } from "typeorm"
import { LoyaltyPoints } from "../models/loyalty-points"

@EntityRepository(LoyaltyPoints)
export class LoyaltyPointsRepository extends Repository<LoyaltyPoints> {
  async getTopCustomers(limit = 10) {
    return this.createQueryBuilder("lp")
      .select([
        "lp.customer_id",
        "SUM(lp.points) as total_points"
      ])
      .groupBy("lp.customer_id")
      .orderBy("total_points", "DESC")
      .limit(limit)
      .getRawMany()
  }
}

// Use in service
class LoyaltyService extends TransactionBaseService {
  async getLeaderboard(limit: number) {
    return this.atomicPhase_(async (manager) => {
      const repo = manager.getCustomRepository(LoyaltyPointsRepository)
      return await repo.getTopCustomers(limit)
    })
  }
}
```

---

### 🔍 Debugging Pro Tips

#### Tip 16: Use Detailed Logging
```typescript
import { Logger } from "@medusajs/medusa"

class MyService extends TransactionBaseService {
  private logger_: Logger
  
  constructor(container) {
    super(container)
    this.logger_ = container.logger
  }

  async processOrder(orderId: string) {
    this.logger_.info(`Processing order ${orderId}`)
    
    return this.atomicPhase_(async (manager) => {
      this.logger_.debug(`Starting transaction for order ${orderId}`)
      
      try {
        const result = await this.doSomething()
        this.logger_.info(`Order ${orderId} processed successfully`)
        return result
      } catch (error) {
        this.logger_.error(`Failed to process order ${orderId}`, error)
        throw error
      }
    })
  }
}

// Run with: LOG_LEVEL=debug npm run dev
```

#### Tip 17: Use Postman Collections
```javascript
// Create collection for your custom endpoints
{
  "info": { "name": "Custom Medusa APIs" },
  "item": [{
    "name": "Create Referral",
    "request": {
      "method": "POST",
      "url": "{{base_url}}/store/referral",
      "header": [{ "key": "Content-Type", "value": "application/json" }],
      "body": {
        "mode": "raw",
        "raw": "{\\n  \\"code\\": \\"FRIEND123\\"\\n}"
      }
    }
  }]
}
```

#### Tip 18: Use TypeScript Strict Mode
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true
  }
}
```

#### Tip 19: Add Request ID Tracking
```typescript
import { v4 as uuid } from "uuid"

export default () => {
  return async (req, res, next) => {
    req.requestId = uuid()
    res.setHeader("X-Request-ID", req.requestId)
    req.scope.resolve("logger").info(
      `[${req.requestId}] ${req.method} ${req.path}`
    )
    next()
  }
}
```

#### Tip 20: Use Database Query Logging
```javascript
// medusa-config.js
module.exports = {
  projectConfig: {
    database_logging: true,
    database_extra: {
      logging: ["query", "error"]
    }
  }
}
```

---

### ⚡ Performance Pro Tips

#### Tip 21: Use Eager Loading
```typescript
❌ N+1 Query Problem
const orders = await orderService.list({})
for (const order of orders) {
  const customer = await customerService.retrieve(order.customer_id)
}

✅ Eager Load Relations
const orders = await orderService.list({
  relations: ["customer", "items"]
})
```

#### Tip 22: Cache Read-Heavy Operations
```typescript
class ProductRecommendationService extends TransactionBaseService {
  async getRecommendations(customerId: string) {
    const cacheKey = `recommendations:${customerId}`
    let recommendations = await this.cacheService_.get(cacheKey)
    
    if (!recommendations) {
      recommendations = await this.calculateRecommendations(customerId)
      await this.cacheService_.set(cacheKey, recommendations, 3600)
    }
    
    return recommendations
  }
}
```

#### Tip 23: Always Paginate
```typescript
const [products, count] = await productService.listAndCount(
  {},
  {
    skip: offset,
    take: limit,
    relations: ["variants"]
  }
)
```

#### Tip 24: Use Indexes on Foreign Keys
```typescript
@Entity()
export class LoyaltyPoints extends BaseEntity {
  @Index()
  @Column()
  customer_id: string
  
  @Index()
  @Column()
  created_at: Date
}
```

#### Tip 25: Batch Operations
```typescript
❌ for (const customer of customers) {
  await loyaltyService.addPoints(customer.id, 100)
}

✅ const pointsToAdd = customers.map(c => ({
  customer_id: c.id,
  points: 100
}))
await manager.getRepository(LoyaltyPoints).insert(pointsToAdd)
```

---

### 🔒 Security Pro Tips

#### Tip 26: Validate All Input
```typescript
import { IsString, IsNumber, Min, Max } from "class-validator"

class CreateOrderInput {
  @IsString()
  customer_id: string
  
  @IsNumber()
  @Min(1)
  @Max(1000000)
  total: number
}
```

#### Tip 27: Use Environment Variables
```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost/medusa
JWT_SECRET=your-super-secret-32-char-min
STRIPE_SECRET_KEY=sk_test_...

# Add to .gitignore!
```

#### Tip 28: Implement Rate Limiting
```typescript
import rateLimit from "express-rate-limit"

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})

router.post("/store/referral", limiter, handler)
```

#### Tip 29: Sanitize Error Messages
```typescript
❌ res.json({ error: error.stack })

✅ logger.error("Order creation failed", error)
   res.status(500).json({ message: "Failed to create order" })
```

#### Tip 30: Use HTTPS in Production
```javascript
module.exports = {
  projectConfig: {
    cookie_options: {
      secure: process.env.NODE_ENV === "production"
    }
  }
}
```

---

### 👥 Collaboration Tips

#### Tip 31: Document Your Code
```typescript
/**
 * Loyalty Points Service
 * 
 * Business Rules:
 * - 1 point = $1 spent
 * - Points expire after 1 year
 * - Minimum redemption: 100 points
 */
class LoyaltyService extends TransactionBaseService {}
```

#### Tip 32: Use Consistent Naming
```
Services: [Feature]Service
Routes: /[resource]/[action]
Models: PascalCase
Methods: camelCase
```

#### Tip 33: Create PR Templates
```markdown
## MedusaJS Checklist
- [ ] Services extend TransactionBaseService
- [ ] Uses dependency injection
- [ ] Atomic phases for transactions
- [ ] Input validation
- [ ] Tests written
```

#### Tip 34: Build Runbooks
```markdown
# Adding a New Service
1. Create src/services/[name].ts
2. Extend TransactionBaseService
3. Add injections
4. Implement methods
5. Test
```

#### Tip 35: Use Docker for Consistency
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:13
  redis:
    image: redis:alpine
```

---

### 🚢 Production Tips

#### Tip 36: Environment Configs
```javascript
const NODE_ENV = process.env.NODE_ENV || "development"

module.exports = {
  projectConfig: {
    database_extra: {
      ssl: NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    }
  }
}
```

#### Tip 37: Health Checks
```typescript
router.get("/health", async (req, res) => {
  try {
    await req.scope.resolve("manager").query("SELECT 1")
    res.json({ status: "healthy" })
  } catch (error) {
    res.status(503).json({ status: "unhealthy" })
  }
})
```

#### Tip 38: Process Management
```json
// ecosystem.config.js
module.exports = {
  apps: [{
    name: "medusa",
    script: "npm run start",
    instances: 2,
    exec_mode: "cluster"
  }]
}
```

#### Tip 39: Monitor Performance
```typescript
import newrelic from "newrelic"

async expensiveOperation() {
  return newrelic.startSegment("operation", true, async () => {
    // Your code
  })
}
```

#### Tip 40: Graceful Shutdown
```typescript
process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully")
  // Close connections
  process.exit(0)
})
```

---

### 🎓 Learning Tips

#### Tip 41: Study Core Code
```bash
# Read these core services
node_modules/@medusajs/medusa/dist/services/product.js
node_modules/@medusajs/medusa/dist/services/order.js
```

#### Tip 42: Join Community
- Discord: https://discord.gg/medusajs
- GitHub: https://github.com/medusajs/medusa

#### Tip 43: Keep Updated
```bash
npm outdated
npm install @medusajs/medusa@latest
npm test
```

#### Tip 44: Profile Performance
```bash
node --prof node_modules/.bin/medusa start
node --prof-process isolate-*.log > profile.txt
```

#### Tip 45: Build Reusables
```
src/utils/validators/
src/utils/formatters/
src/utils/helpers/
src/middlewares/
```

---

**🚀 Apply these 45 pro tips to build production-grade MedusaJS backends!**

---

**SAVE THIS FILE AND REFERENCE IT WHEN WORKING WITH AI ON MEDUSA PROJECTS**
