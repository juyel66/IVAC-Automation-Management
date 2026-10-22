# IVAC License Management Backend

High-security, server-authoritative license validation, browser installation limit enforcement, and payment request management API for IVAC Automation.

## Architecture

- **Runtime**: Node.js (ES Modules, TypeScript)
- **Framework**: Express.js
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Validation**: Zod schema validation on all inputs
- **Security**:
  - Cryptographically secure license key generation (`IVAC-XXXX-XXXX-XXXX-XXXX`)
  - Plaintext license keys are **never stored** in the database; only SHA-256 hashes are persisted.
  - Plaintext key is displayed strictly once at generation time.
  - Tamper-evident HMAC-SHA256 entitlement signature returned on client activation & validation.
  - Concurrency-safe atomic database transactions for activations and payment approvals.
  - Bcrypt password hashing (12 rounds) for admin accounts.
  - JWT + Database session verification with revocation capability.
  - Strict Helmet security headers, CORS origin allowlist, and Express rate limiting.
  - Zero collection of IVAC portal credentials, OTPs, or applicant PDFs.

---

## Getting Started

### 1. Prerequisites
- Node.js >= 18
- PostgreSQL >= 14 (or hosted PostgreSQL instance like Supabase, Neon, AWS RDS)

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key environment variables:
```env
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1
DATABASE_URL="postgresql://user:password@localhost:5432/ivac_license?schema=public"
ADMIN_JWT_SECRET="your-ultra-secure-random-jwt-secret-at-least-32-chars"
INITIAL_ADMIN_EMAIL="admin@ivac-automation.com"
INITIAL_ADMIN_USERNAME="admin"
INITIAL_ADMIN_PASSWORD="YourStrongAdminPassword123!"
CORS_ORIGIN="http://localhost:5173,http://localhost:3000"
```

### 3. Database Migration & Seeding
```bash
# Generate Prisma Client
npm run prisma:generate

# Apply migrations
npm run prisma:migrate

# Seed initial admin and default subscription plans
npm run seed
```

### 4. Running the Backend
```bash
# Development (with hot-reload)
npm run dev

# Production Build
npm run build
npm start
```

### 5. Running Automated Tests
```bash
npm test
```
All 21 unit and integration tests execute against the test suite covering license creation, activation, limits, idempotency, and security.

---

## API Endpoints Overview

### Public & Extension APIs
- `GET /api/v1/public/payment-instructions` — Public payment plans, bKash/Nagad details.
- `POST /api/v1/licenses/activate` — Activate license key on a browser installation.
- `POST /api/v1/licenses/validate` — Validate entitlement status and browser registration.
- `POST /api/v1/licenses/heartbeat` — Periodic client status ping.
- `POST /api/v1/licenses/release-installation` — Release browser installation slot.
- `GET /api/v1/licenses/me` — Retrieve license details for an installation.
- `POST /api/v1/payments/requests` — Submit manual bKash/Nagad transaction ID.

### Admin APIs (Protected by Bearer Token)
- `POST /api/v1/admin/auth/login` — Admin login with rate limiting.
- `POST /api/v1/admin/auth/logout` — Admin logout & session termination.
- `GET /api/v1/admin/auth/me` — Current admin session info.
- `GET /api/v1/admin/dashboard` — Live dashboard metrics and counts.
- `GET /api/v1/admin/licenses` — Filtered/paginated license list.
- `POST /api/v1/admin/licenses` — Generate new license key.
- `GET /api/v1/admin/licenses/:id` — Full license details, installations, payments.
- `PATCH /api/v1/admin/licenses/:id` — Update notes, limits, status.
- `POST /api/v1/admin/licenses/:id/renew` — Extend license validity duration.
- `POST /api/v1/admin/licenses/:id/revoke` — Revoke license immediately.
- `POST /api/v1/admin/licenses/:id/reissue` — Reissue lost key.
- `POST /api/v1/admin/installations/:id/revoke` — Revoke individual browser installation.
- `GET /api/v1/admin/payments` — Review manual payments.
- `POST /api/v1/admin/payments/:id/approve` — Approve payment (idempotent, auto-renews/creates key).
- `POST /api/v1/admin/payments/:id/reject` — Reject payment request.
- `PUT /api/v1/admin/payment-settings` — Update bKash/Nagad/WhatsApp configurations.
- `GET /api/v1/admin/audit-logs` — Complete chronological audit trail.
