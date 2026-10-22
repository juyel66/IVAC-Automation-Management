# IVAC Automation Management — Licensing Backend & Admin Portal

Enterprise-grade software licensing, browser quota management, and manual payment verification suite for the **IVAC Automation System**.

---

## 1. Project Overview & Workspace Structure

This workspace is dedicated to the license management backend and the administrative management portal:

```text
IVAC-automation-management/
├── ivac-license-backend/    # Node.js + Express + TypeScript + PostgreSQL Service (Port 5000)
├── ivac-license-admin/      # React 18 + Vite + Tailwind CSS + TanStack Query Dashboard (Port 5173)
├── docs/                    # Technical Manuals & Specifications
│   ├── ARCHITECTURE.md      # High-level architecture, state machines, offline tolerance
│   ├── API.md               # Complete REST API reference (request/response schemas)
│   ├── SECURITY.md          # Cryptographic hashing, rate limiting, zero-knowledge privacy
│   ├── DEPLOYMENT.md        # Production deployment, Nginx, PM2, and Docker guides
│   └── TESTING.md           # Automated test reports and verification procedures
├── package.json             # Root monorepo manager with concurrent dev runner
└── README.md                # System documentation
```

> **Note:** The IVAC Chrome Extension (`IVAC-Automation`) is maintained as an independent project outside this repository. It communicates with this backend strictly over standard HTTPS REST endpoints (`/api/v1`).

---

## 2. Technology Stack

| Component | Stack | Key Responsibilities |
| :--- | :--- | :--- |
| **Backend API** | Node.js, Express 5, TypeScript, PostgreSQL (Neon), Prisma ORM, Zod, bcrypt, JWT | License generation, SHA-256 key hashing, atomic installation quota enforcement, payment queue, audit logs |
| **Admin Portal** | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query v5, Lucide Icons | Executive KPI dashboard, license generator with one-time reveal, browser slot manager, payment review |

---

## 3. Quickstart Guide (One-Command Development)

From the root of this workspace (`IVAC-automation-management`), you can install all dependencies and start both the backend API and admin frontend concurrently:

```bash
# 1. Install root dependencies
npm install

# 2. Start both Backend & Admin Frontend concurrently
npm run dev
```

### Server Endpoints
- **Backend API:** `http://localhost:5000/api/v1`
- **Backend Health Check:** `http://localhost:5000/api/v1/health`
- **Admin Dashboard:** `http://localhost:5173`

### Default Admin Credentials (Development Seed)
- **Identifier:** `admin`
- **Password:** `AdminPassword123!`

---

## 4. PostgreSQL Database Configuration

The backend is connected to a live Neon PostgreSQL database using Prisma ORM.

### Connection Location
The connection string is configured in:
```text
ivac-license-backend/.env
```
Under:
```ini
DATABASE_URL="postgresql://neondb_owner:npg_...ep-cool-cloud-b4dl7o8g-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

> **Security Note:** `.env` and `.env.local` files are strictly excluded via `.gitignore` to prevent secret leakage. A safe `.env.example` is maintained for documentation.

### Database Migration & Seeding Commands
```bash
# Push schema changes to PostgreSQL
npm run prisma:push --prefix ivac-license-backend

# Seed initial admin and payment plans
npm run seed --prefix ivac-license-backend
```

---

## 5. Scripts Reference

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs backend (port 5000) and admin portal (port 5173) concurrently with colored terminal logs |
| `npm run build` | Compiles backend TypeScript and builds production admin assets to `dist/` |
| `npm test` | Runs the full Vitest suite in the backend (21 tests, 100% pass) |
| `npm run install:all` | Installs root, backend, and frontend dependencies in sequence |

---

## 6. Comprehensive Documentation Index

- 📐 [**System Architecture & Design**](docs/ARCHITECTURE.md)
- 🔌 [**REST API Specification**](docs/API.md)
- 🛡️ [**Security & Privacy Compliance**](docs/SECURITY.md)
- 🚀 [**Production Deployment Guide**](docs/DEPLOYMENT.md)
- 🧪 [**Testing & Verification Guide**](docs/TESTING.md)

---

## 7. License

Proprietary Software. All rights reserved. Built for IVAC Automation.
