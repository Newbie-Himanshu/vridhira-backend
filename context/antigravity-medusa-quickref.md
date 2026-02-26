# 🚀 ANTIGRAVITY + MEDUSAJS QUICK REFERENCE

## 📋 SETUP CHECKLIST
- [ ] Install Antigravity IDE
- [ ] Install core-dev skill bundle: `npx antigravity-skills install --bundle core-dev`
- [ ] Create `.antigravity/rules.md` in project root
- [ ] Set up 4 specialized agents (Architect, Implementation, Database, QA)
- [ ] Load MedusaJS context at session start

---

## 🎯 ESSENTIAL COMMANDS

### Start Every Session
```
Load project rules from .antigravity/rules.md
I'm working with MedusaJS (TypeScript, PostgreSQL, TypeORM)
Services extend TransactionBaseService with dependency injection
```

### Create New Feature
```
Create an implementation plan for [feature] following MedusaJS patterns:
- Model in src/models/
- Service extending TransactionBaseService in src/services/
- API routes in src/api/routes/
- Migration in src/migrations/
- Tests

Show me the plan before implementing.
```

### Generate Service
```
Create [ServiceName] in src/services/[service-name].ts that:
- Extends TransactionBaseService
- Injects [dependencies] from container
- Has method [methodName] using atomic phases
- Includes proper TypeScript types and error handling
```

### Generate API Endpoint
```
Create API route in src/api/routes/[admin|store]/[route-name]/index.ts:
- [METHOD] /[admin|store]/[path]
- Validate input with class-validator
- Use authenticate() middleware if needed
- Resolve service from req.scope
- Return consistent JSON response
```

### Generate Model
```
Create [EntityName] model in src/models/[entity-name].ts:
- Extend BaseEntity
- Add fields: [list fields with types]
- Add indexes on [fields]
- Include relations to [other entities]
- Follow TypeORM decorators
```

### Generate Migration
```
Create migration for [description]:
- File: src/migrations/TIMESTAMP-[Description].ts
- Implement both up() and down()
- Use TypeORM QueryRunner
- Handle existing data safely
```

### Code Review
```
@security-auditor Review [file] for:
- MedusaJS pattern compliance
- Security vulnerabilities
- Type safety issues
- Performance problems
- Missing error handling
```

---

## ✅ PATTERN TEMPLATES

### Service Template
```typescript
// src/services/my-custom.ts
import { TransactionBaseService } from "@medusajs/medusa"
import { MedusaError } from "@medusajs/utils"

class MyCustomService extends TransactionBaseService {
  constructor(container) {
    super(container)
    this.productService = container.productService
  }

  async customMethod(data: CustomData): Promise<CustomResult> {
    return this.atomicPhase_(async (manager) => {
      // Validate input
      if (!data.id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "ID is required"
        )
      }

      // Use injected services
      const product = await this.productService
        .withTransaction(manager)
        .retrieve(data.id)

      // Your logic here
      const result = // ... process

      return result
    })
  }
}

export default MyCustomService
```

### API Route Template
```typescript
// src/api/routes/admin/custom/index.ts
import { Router } from "express"
import { authenticate } from "@medusajs/medusa"
import { validator } from "@medusajs/medusa"
import { IsString } from "class-validator"

class RequestBody {
  @IsString()
  data: string
}

export default (app: Router) => {
  const router = Router()
  
  router.post(
    "/",
    authenticate(),
    validator(RequestBody),
    async (req, res) => {
      try {
        const myService = req.scope.resolve("myCustomService")
        const result = await myService.customMethod(req.body)
        
        res.json({
          success: true,
          data: result
        })
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message
        })
      }
    }
  )

  app.use("/admin/custom", router)
}
```

### Model Template
```typescript
// src/models/my-entity.ts
import { Entity, Column, Index } from "typeorm"
import { BaseEntity } from "@medusajs/medusa"

@Entity()
@Index(["custom_field"])
export class MyEntity extends BaseEntity {
  @Column({ type: "varchar" })
  custom_field: string

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number

  @Column({ type: "boolean", default: true })
  is_active: boolean
}
```

### Migration Template
```typescript
// src/migrations/XXXXX-CreateMyEntity.ts
import { MigrationInterface, QueryRunner } from "typeorm"

export class CreateMyEntity1234567890 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "my_entity" (
        "id" VARCHAR PRIMARY KEY,
        "custom_field" VARCHAR NOT NULL,
        "price" DECIMAL(10,2) NOT NULL,
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `)
    
    await queryRunner.query(`
      CREATE INDEX "idx_my_entity_custom_field" 
      ON "my_entity" ("custom_field")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "my_entity"`)
  }
}
```

### Subscriber Template
```typescript
// src/subscribers/my-subscriber.ts
class MySubscriber {
  constructor({ eventBusService, myService }) {
    this.myService = myService
    
    eventBusService.subscribe(
      "order.placed",
      this.handleOrderPlaced.bind(this)
    )
  }

  handleOrderPlaced = async (data) => {
    const { id } = data
    await this.myService.processOrder(id)
  }
}

export default MySubscriber
```

---

## ❌ COMMON MISTAKES TO AVOID

### 1. Service Mistakes
```typescript
❌ class MyService { } // Missing extension
✅ class MyService extends TransactionBaseService { }

❌ const service = new ProductService() // Direct instantiation
✅ const service = container.productService // Injection

❌ await this.manager.query("UPDATE...") // No transaction
✅ return this.atomicPhase_(async (manager) => { ... })
```

### 2. API Mistakes
```typescript
❌ router.post("/create", async (req, res) => { // No validation
✅ router.post("/create", validator(CreateInput), async (req, res) => {

❌ router.post("/admin/action", handler) // No auth
✅ router.post("/admin/action", authenticate(), handler)

❌ res.json(result) // No error handling
✅ try { res.json(result) } catch (e) { res.status(500).json({...}) }
```

### 3. Database Mistakes
```typescript
❌ // Direct ALTER TABLE in code
✅ // Create migration with npx typeorm migration:create

❌ @Column() sensitive_data: string // Plain text
✅ // Encrypt or use Medusa's encryption utilities

❌ await repo.find() // Loads everything
✅ await repo.find({ select: ["id", "name"], take: 20 })
```

---

## 🔄 ANTIGRAVITY WORKFLOW

### 1. Planning Phase
```
You → Agent: "Create implementation plan for [feature]"
Agent → You: [Task artifact with breakdown]
You → Agent: "Approved, proceed"
```

### 2. Parallel Implementation
```
Agent 1: Create models
Agent 2: Create services
Agent 3: Create API routes
Agent 4: Write tests
```

### 3. Review & Test
```
You → QA Agent: "Review all code"
Agent → You: [Findings and suggestions]
You → Agent: "Fix issues and run tests"
```

### 4. Integration
```
Agent: Creates migration
Agent: Updates documentation
Agent: Runs end-to-end test
```

---

## 🛠️ DEBUGGING COMMANDS

### Check Service Registration
```
"Verify MyCustomService is properly registered and can be resolved"
```

### Test API Endpoint
```
"Generate curl command to test POST /admin/custom with sample data"
```

### Validate Migration
```
"Review migration file for:
- Proper up/down implementation
- No data loss risk
- Correct syntax"
```

### Fix Type Errors
```
"Fix all TypeScript errors in [file], ensuring imports from @medusajs/medusa"
```

---

## 📦 DEPENDENCY INJECTION MAP

```typescript
// Common injections
constructor(container) {
  // Core services
  this.productService = container.productService
  this.orderService = container.orderService
  this.cartService = container.cartService
  this.customerService = container.customerService
  this.regionService = container.regionService
  
  // Utilities
  this.eventBusService = container.eventBusService
  this.manager = container.manager
  
  // Custom services
  this.myCustomService = container.myCustomService
}
```

---

## 🎯 PROMPT FORMULAS

### For New Service
```
Create [ServiceName] extending TransactionBaseService in src/services/[name].ts

Dependencies: [list services to inject]

Methods:
1. [methodName](params): [returnType]
   - [description]
   - Use atomic phases
   - [business logic details]

Include:
- Proper TypeScript types
- MedusaError for errors
- JSDoc comments
```

### For API Endpoint
```
Create [METHOD] /[prefix]/[route] in src/api/routes/[prefix]/[route]/index.ts

Input: [describe payload]
Output: [describe response]
Auth: [required/optional]
Validation: [list validations]

Logic:
1. [step 1]
2. [step 2]
...

Include error handling and consistent response format
```

### For Complete Feature
```
Implement [feature name] following this structure:

1. Model (src/models/):
   - Fields: [list]
   - Relations: [list]
   - Indexes: [list]

2. Service (src/services/):
   - Methods: [list with descriptions]
   - Dependencies: [list]

3. API Routes (src/api/routes/):
   - [METHOD] [path] - [description]
   ...

4. Subscriber (if needed):
   - Listen to: [event]
   - Action: [description]

5. Migration:
   - Create table with fields
   - Add indexes

Show implementation plan first for review
```

---

## 🚨 EMERGENCY FIXES

### Server Won't Start
```
"Check for:
- Missing exports in service files
- Syntax errors in routes
- Database connection issues
- Missing environment variables"
```

### Migration Fails
```
"Review migration and ensure:
- No syntax errors in SQL
- down() properly reverses up()
- No conflicts with existing schema"
```

### Type Errors
```
"Fix all TypeScript errors in src/ directory:
- Add missing imports from @medusajs/medusa
- Add proper type annotations
- Fix any vs proper types"
```

### Service Not Resolving
```
"Verify:
- Service extends TransactionBaseService
- File is in src/services/
- Export default is present
- File name matches service name (kebab-case)"
```

---

## 💡 PRO TIPS

1. **Start with .antigravity/rules.md** - Load it every session
2. **Request plans first** - Review before implementing
3. **Use parallel agents** - Speed up development
4. **Install targeted skills** - Avoid token bloat
5. **Reference patterns** - Use templates from this guide
6. **Test incrementally** - Don't wait until the end
7. **Review with QA agent** - Catch issues early
8. **Document as you go** - Let agent generate JSDoc

---

## 📚 QUICK LINKS

- Full Guide: [Open medusajs-ai-guide.md]
- Medusa Docs: https://docs.medusajs.com
- Antigravity: https://antigravity.google/
- TypeORM: https://typeorm.io

---

## 💡 TOP 20 PRO TIPS

### Development
1. **Start with data model** - Design entities before coding
2. **Use feature branches** - Commit incrementally for easy rollback
3. **Test logic first** - Verify service methods before migrations
4. **Keep services focused** - Single responsibility principle
5. **Compose services** - Orchestrate small, specialized services

### Antigravity
6. **Create agent roles** - Architect, Implementation, Database, QA agents
7. **Use task artifacts** - Review plans before execution
8. **Version prompts** - Save reusable prompt templates
9. **Combine skills** - @backend-architect + @api-design-principles
10. **Cache context** - Save project setup for reuse

### MedusaJS
11. **Event-driven** - Emit events instead of direct service calls
12. **Use built-ins** - Leverage Medusa's pricing, tax, inventory
13. **Custom repos** - Create complex queries in repositories
14. **Service composition** - Inject and orchestrate multiple services
15. **Config system** - Store app settings in medusa-config.js

### Performance
16. **Eager load** - Prevent N+1 queries with relations
17. **Cache heavy ops** - Cache recommendations, calculations
18. **Always paginate** - Use skip/take for all lists
19. **Index foreign keys** - Add @Index() on lookup fields
20. **Batch operations** - Bulk insert instead of loops

### Security
21. **Validate everything** - Use class-validator on inputs
22. **Rate limit** - Protect public endpoints
23. **Sanitize errors** - Never expose stack traces
24. **Environment vars** - No secrets in code
25. **HTTPS in prod** - Secure cookies and connections

### Debugging
26. **Detailed logging** - Use Logger with context
27. **Request IDs** - Track requests through system
28. **TypeScript strict** - Catch errors at compile time
29. **Query logging** - See all SQL queries
30. **Postman collections** - Save API test collections

### Team Work
31. **Document code** - JSDoc for services and methods
32. **Consistent naming** - Follow team conventions
33. **PR templates** - MedusaJS compliance checklist
34. **Create runbooks** - Common task procedures
35. **Docker setup** - Consistent dev environments

### Production
36. **Environment configs** - Different settings per env
37. **Health checks** - Monitor service health
38. **Process management** - Use PM2 or similar
39. **APM monitoring** - Track performance in prod
40. **Graceful shutdown** - Close connections properly

### Quick Wins
41. **Study core code** - Learn from Medusa's services
42. **Join community** - Discord for help
43. **Keep updated** - Regular npm outdated checks
44. **Profile apps** - Find performance bottlenecks
45. **Build library** - Reusable utils and middleware

---

## 🎯 DAILY CHECKLIST

### Before Starting Work
- [ ] Load .antigravity/rules.md
- [ ] Review task list from previous session
- [ ] Pull latest from main branch
- [ ] Start docker-compose services

### During Development
- [ ] Follow MedusaJS patterns (extend TransactionBaseService)
- [ ] Use dependency injection
- [ ] Validate all inputs
- [ ] Add error handling
- [ ] Write tests as you go

### Before Committing
- [ ] Run tests: `npm test`
- [ ] Check types: `npm run build`
- [ ] Lint code: `npm run lint`
- [ ] Test API endpoints manually
- [ ] Update documentation

### Before Deploying
- [ ] Run all migrations
- [ ] Test health endpoint
- [ ] Check environment variables
- [ ] Review security checklist
- [ ] Backup database

---

## 🚨 TROUBLESHOOTING QUICK FIXES

### "Service not found"
```bash
# Check: Does service extend TransactionBaseService?
# Check: Is file in src/services/?
# Check: Is there export default?
# Restart: npm run dev
```

### "Cannot resolve dependency"
```typescript
// Check constructor injections match container
constructor(container) {
  super(container)
  this.productService = container.productService // ✅
  this.nonExistentService = container.xyz // ❌ Wrong!
}
```

### "Migration failed"
```bash
# Check: Both up() and down() implemented?
# Check: SQL syntax correct?
# Rollback: medusa migrations revert
# Fix migration
# Run: medusa migrations run
```

### "Type errors"
```bash
# Install types
npm install --save-dev @types/node

# Check tsconfig.json
# Fix imports from @medusajs/medusa
# Restart TypeScript server in editor
```

### "API returns 401"
```typescript
// Add authentication
router.post("/admin/custom", 
  authenticate(), // ✅ Add this
  handler
)
```

### "Slow queries"
```typescript
// Add indexes
@Entity()
export class MyEntity extends BaseEntity {
  @Index() // ✅ Add this
  @Column()
  frequently_queried_field: string
}

// Create migration
// Run migration
```

---

## 📞 QUICK CONTACTS

**Stuck?** Try these:
1. **Check this guide** - Most answers are here
2. **Read full guide** - medusajs-ai-guide.md
3. **Search Discord** - https://discord.gg/medusajs
4. **Check docs** - https://docs.medusajs.com
5. **Ask Antigravity** - Load context and ask for help

---

## 🔗 ESSENTIAL LINKS

- **Full Guide**: medusajs-ai-guide.md
- **Project Rules**: .antigravity/rules.md
- **Medusa Docs**: https://docs.medusajs.com
- **API Reference**: https://docs.medusajs.com/api/admin
- **Antigravity**: https://antigravity.google/
- **TypeORM**: https://typeorm.io
- **Discord**: https://discord.gg/medusajs

---

**Keep this file open while developing with Antigravity!**
