---
trigger: always_on
---

# MedusaJS Project Rules for Antigravity AI

## 🛠️ Tech Stack & Infrastructure
- **Backend**: MedusaJS (Node.js + TypeScript)
- **Database**: PostgreSQL + TypeORM (Running in Docker)
- **Cache/Event Bus**: Redis (Running in Docker)
- **Architecture**: Services → Repositories → Models
- **Infrastructure Management**: Use the Docker MCP to provision, manage, and monitor containers.

## 🏗️ Critical Development Rules
1. **Extend Base**: ALWAYS extend `TransactionBaseService` for services.
2. **Dependency Injection**: ALWAYS use the dependency injection pattern via the container.
3. **Immutability**: NEVER modify core Medusa files.
4. **Transactions**: ALWAYS use atomic phases (`this.atomicPhase_`) for database operations.
5. **Standardized Structure**: Follow file structure: `src/services/`, `src/api/routes/`, `src/models/`.

## 📂 File Locations
- **Services**: `src/services/*.ts`
- **API Routes**: `src/api/routes/admin/*` or `src/api/routes/store/*`
- **Models**: `src/models/*.ts`
- **Migrations**: `src/migrations/*`
- **Subscribers**: `src/subscribers/*.ts`

## 💻 Code Standards
- **TypeScript**: Use strict mode.
- **Errors**: Import `MedusaError` for all error handling.
- **Database**: Use the `manager` for database operations within transactions.
- **Naming**: Follow `camelCase` for methods and `PascalCase` for classes.

## 🐳 Docker MCP Instructions
- Before starting the development server, use the Docker MCP to check if the PostgreSQL and Redis containers are active.
- If containers are missing, use the MCP to run `docker-compose up -d`.