# 📄 MEDUSAJS + ANTIGRAVITY ONE-PAGE CHEAT SHEET

## 🚀 SETUP (One Time)
```bash
npm install -g @medusajs/medusa-cli
medusa new my-store
cd my-store
# Create .env with DATABASE_URL, JWT_SECRET, COOKIE_SECRET
medusa migrations run
npm run dev  # Runs on :9000
```

## 🤖 ANTIGRAVITY SESSION START
```
Load .antigravity/rules.md
I'm working with MedusaJS (TypeScript, PostgreSQL, TypeORM)
Services extend TransactionBaseService with dependency injection
```

## 📋 CREATE SERVICE
```typescript
// src/services/my-service.ts
import { TransactionBaseService } from "@medusajs/medusa"

class MyService extends TransactionBaseService {
  constructor(container) {
    super(container)
    this.productService = container.productService
  }

  async myMethod(data) {
    return this.atomicPhase_(async (manager) => {
      // Logic here with transactions
    })
  }
}
export default MyService
```

## 🛣️ CREATE API ROUTE
```typescript
// src/api/routes/admin/custom/index.ts
import { Router } from "express"
import { authenticate, validator } from "@medusajs/medusa"
import { IsString } from "class-validator"

class Input {
  @IsString()
  field: string
}

export default (app: Router) => {
  const router = Router()
  
  router.post("/", authenticate(), validator(Input), 
    async (req, res) => {
      try {
        const service = req.scope.resolve("myService")
        const result = await service.myMethod(req.body)
        res.json({ success: true, data: result })
      } catch (error) {
        res.status(400).json({ message: error.message })
      }
    }
  )
  
  app.use("/admin/custom", router)
}
```

## 🗄️ CREATE MODEL
```typescript
// src/models/my-entity.ts
import { Entity, Column, Index } from "typeorm"
import { BaseEntity } from "@medusajs/medusa"

@Entity()
export class MyEntity extends BaseEntity {
  @Index()
  @Column({ type: "varchar" })
  field_name: string
}
```

## 🔄 CREATE MIGRATION
```bash
npx typeorm migration:create -n MyMigration
# Edit: src/migrations/TIMESTAMP-MyMigration.ts
```

```typescript
import { MigrationInterface, QueryRunner } from "typeorm"

export class MyMigration1234567890 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "my_entity" (...)`)
  }
  
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "my_entity"`)
  }
}
```

```bash
medusa migrations run
```

## 📡 CREATE SUBSCRIBER
```typescript
// src/subscribers/my-subscriber.ts
class MySubscriber {
  constructor({ eventBusService, myService }) {
    eventBusService.subscribe("order.placed", 
      this.handleOrder.bind(this))
  }
  
  handleOrder = async (data) => {
    // React to event
  }
}
export default MySubscriber
```

## ⚡ COMMON INJECTIONS
```typescript
constructor(container) {
  this.productService = container.productService
  this.orderService = container.orderService
  this.cartService = container.cartService
  this.customerService = container.customerService
  this.eventBusService = container.eventBusService
  this.manager = container.manager
}
```

## ✅ DO's
- ✅ Extend TransactionBaseService
- ✅ Use atomicPhase_ for DB operations
- ✅ Inject via container
- ✅ Use MedusaError for errors
- ✅ Validate inputs with class-validator
- ✅ Add authentication to admin routes
- ✅ Create migrations for schema changes
- ✅ Use eager loading: { relations: ["..."] }
- ✅ Add @Index() on foreign keys
- ✅ Paginate with skip/take

## ❌ DON'Ts
- ❌ new ProductService() (direct instantiation)
- ❌ Modify core Medusa files
- ❌ Direct queries without atomicPhase_
- ❌ Expose error.stack to clients
- ❌ Skip input validation
- ❌ SELECT * in production
- ❌ Store secrets in code
- ❌ Use var (use const/let)
- ❌ Use any type
- ❌ Loop DB saves (use bulk insert)

## 🎯 ANTIGRAVITY PROMPTS

### New Feature
```
Following MedusaJS patterns, create [feature]:
- Model: src/models/[name].ts
- Service: src/services/[name].ts extending TransactionBaseService
- API: src/api/routes/[prefix]/[name]/
- Migration for schema
Show implementation plan first
```

### Code Review
```
@security-auditor Review [file] against .antigravity/rules.md for:
- Pattern compliance (TransactionBaseService, dependency injection)
- Security issues (validation, auth, error handling)
- Performance problems (N+1 queries, missing indexes)
```

### Fix Issues
```
Following MedusaJS rules, fix [issue] in [file]:
- Use proper error handling with MedusaError
- Ensure atomic phases for transactions
- Add missing type annotations
```

## 🔍 DEBUGGING

### Service Not Resolving
```bash
# Check: Extends TransactionBaseService?
# Check: In src/services/?
# Check: Has export default?
npm run dev  # Restart
```

### Type Errors
```bash
npm install --save-dev @types/node
# Check imports from @medusajs/medusa
```

### Migration Failed
```bash
medusa migrations revert  # Rollback
# Fix migration file
medusa migrations run
```

### Slow Queries
```typescript
// Add index
@Index()
@Column()
field: string
```

## 🧪 TESTING

### Test Endpoint
```bash
curl -X POST http://localhost:9000/admin/custom \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```

### Run Tests
```bash
npm test
npm run test:unit
npm run test:integration
```

## 📊 USEFUL COMMANDS

```bash
# Start dev server
npm run dev

# Run migrations
medusa migrations run

# Revert last migration
medusa migrations revert

# Generate migration
npx typeorm migration:create -n Name

# Seed database
npm run seed

# Build
npm run build

# Check outdated packages
npm outdated
```

## 🎓 TOP 10 PRO TIPS

1. **Start with data model** - Design entities first
2. **Use task artifacts** - Plan before coding in Antigravity
3. **Compose services** - Orchestrate multiple small services
4. **Event-driven** - Emit events, don't call directly
5. **Eager load** - Prevent N+1 with relations
6. **Cache heavy ops** - Use CacheService
7. **Always paginate** - Use skip/take
8. **Validate everything** - class-validator on all inputs
9. **Detailed logging** - Track with request IDs
10. **Monitor production** - Health checks + APM

## 🔗 QUICK LINKS

- Full Guide: medusajs-ai-guide.md
- Quick Ref: antigravity-medusa-quickref.md
- Rules Template: antigravity-rules-template.md
- Docs: https://docs.medusajs.com
- Discord: https://discord.gg/medusajs

---

**Print this and keep it visible while coding! 🚀**
