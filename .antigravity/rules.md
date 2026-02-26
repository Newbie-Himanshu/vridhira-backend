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
