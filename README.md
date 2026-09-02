# Stockline

Full-stack inventory-by-location application built for the evaluated authentication, RBAC, architecture, and Supabase assignment.

## Stack

- NestJS API
- React + Vite frontend
- Prisma ORM 7 with PostgreSQL driver adapter
- Supabase PostgreSQL
- Vitest

## Requirements

- Node.js 24.15 or newer
- A PostgreSQL database or Supabase project

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL`: pooled runtime connection.
   - `DIRECT_URL`: direct connection used by Prisma migrations.
   - `ACCESS_TOKEN_SECRET`: at least 32 random characters.

3. Generate Prisma Client and apply migrations:

   ```bash
   npm run prisma:generate
   npm run db:migrate
   ```

4. Start API and web app in separate terminals:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

5. Bootstrap the first administrator:

   ```http
   POST http://localhost:3000/api/admin/register
   Content-Type: application/json

   { "email": "admin@example.com", "password": "admin123" }
   ```

After the first administrator exists, this endpoint requires that administrator's bearer token.

## Required API evidence

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/api/login` | Public | Returns access and refresh tokens |
| POST | `/api/register` | Public | Creates active `Subscription_L1` |
| POST | `/api/admin/register` | Conditional/Admin | Bootstraps or creates an administrator |
| POST | `/api/refresh` | Refresh token | Rotates both tokens |
| POST | `/api/logout` | Authenticated | Revokes all user sessions |
| GET | `/api/users/me` | Authenticated | Returns current user |
| GET | `/api/users` | Admin | Lists users |
| GET | `/api/users/:id` | Admin | Gets one user |
| PATCH | `/api/users/:id/activity` | Admin | Activates/deactivates independently |
| PATCH | `/api/users/:id/subscription-expiration` | Admin | Updates expiration independently |
| POST | `/api/products` | Admin | Creates a product |
| POST | `/api/locations` | Admin | Creates a location |
| PUT | `/api/inventory/products/:productId/locations/:locationId` | Admin | Sets stock |
| GET | `/api/inventory` | Authenticated | Queries related inventory data |

## Verification

```bash
npm run test
npm run build
```

The architectural rationale and entity diagram are in [`docs/architecture.md`](docs/architecture.md).

The timed presentation script, rehearsal checklist, contingency plan, and executable API evidence are in [`docs/technical-demo.md`](docs/technical-demo.md).
