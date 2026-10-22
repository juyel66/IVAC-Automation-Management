# IVAC Premium System — Security Architecture & Guidelines

## 1. Threat Model & Trust Boundaries

The IVAC Premium system operates across three distinct security domains with clearly defined trust boundaries:

```
[ UNTRUSTED ZONE ]                       [ SECURE ZONE ]
+----------------------+                 +-----------------------+
|  Chrome Extension    |                 |   License API Server  |
|  (User Machine)      | === HTTPS ====> |   (Node.js / Express) |
+----------------------+                 +-----------------------+
                                                     |
[ AUTHENTICATED ZONE ]                               |
+----------------------+                             v
|  Admin Web Panel     | === Bearer JWT> +-----------------------+
|  (Super Admin Only)  |                 |  PostgreSQL Database  |
+----------------------+                 +-----------------------+
```

### 1.1 Untrusted Client (Chrome Extension)
- The extension runs in the user's browser, where scripts, DOM elements, and local storage can be inspected or modified.
- **Security Rule:** The extension client is never trusted to make authorization decisions. Hiding or disabling a UI button is strictly an ergonomic feature; all critical operations (`workflowEngine.start()`) enforce server-side entitlement checks.

### 1.2 Authenticated Admin Domain
- Only authorized administrators access the admin portal.
- All admin endpoints enforce strict JWT validation, role-based access control, session expiration, and tamper-evident audit logging.

### 1.3 Secure Backend Domain
- The backend API and PostgreSQL database enforce all business logic, quotas, expiration, and cryptographic hashing.

---

## 2. Cryptographic Security Standards

### 2.1 License Key Architecture
- **Entropy & Generation:** License keys are generated using Node.js `crypto.randomBytes(16)`.
- **Format:** `IVAC-XXXX-XXXX-XXXX-XXXX` encoded in Base32 (using an unambiguous character set excluding confusing characters: `0`, `O`, `1`, `I`).
- **One-Way Hashing:**
  - Plaintext license keys are **never stored** in the database.
  - The database stores a `SHA-256` digest:
    ```ts
    const licenseKeyHash = crypto.createHash('sha256').update(key.trim()).digest('hex');
    ```
  - The plaintext key is returned to the administrator **only once** upon creation.
  - All subsequent database queries look up keys by hash. Routine API responses and logs display only masked keys (e.g., `IVAC-••••-••••-••••-B3D9`).
  - If a customer loses their key, an admin can execute the **Reissue Key** workflow rather than recovering the unrecoverable hash.

### 2.2 Admin Password Security
- Passwords are salted and hashed using **bcrypt** with a work factor of **12 rounds**.
- No plaintext passwords ever appear in logs, error traces, or configuration files.

### 2.3 Entitlement Verification Signatures
- When returning an entitlement response (`status`, `expiresAt`, `maxInstallations`, `activeInstallationsCount`), the backend attaches an HMAC-SHA256 signature:
  ```ts
  const signature = crypto
    .createHmac('sha256', process.env.ENTITLEMENT_SECRET)
    .update(`${license.id}:${license.status}:${expiresAt}:${license.maxInstallations}`)
    .digest('hex');
  ```
- This prevents users from manually editing cached license states in browser storage to simulate an active license offline.

---

## 3. Privacy & Zero-Knowledge Compliance

### 3.1 Strict Data Minimization
The IVAC License Backend has **zero access** to:
- IVAC portal login passwords or authentication credentials
- OTPs (One-Time Passwords) received via SMS or email
- Applicant visa photos, passport copies, or utility bill PDFs
- Applicant personal identifiable information (PII) beyond optional customer contact details provided manually by the admin during license creation

### 3.2 No Hardware Fingerprinting
- Browser installations are identified solely through a random UUID (`inst_<uuid>`) generated upon first extension installation.
- No hardware serial numbers, MAC addresses, audio canvas signatures, or CPU metrics are collected or stored.

### 3.3 Zero Third-Party Telemetry
- The extension does not transmit telemetry, analytics, or transaction IDs to external advertising or analytics platforms (e.g., Google Analytics, Mixpanel). All communication is confined strictly to the operator's private license backend.

---

## 4. API & Network Hardening

### 4.1 Transport Security (HTTPS)
- Production deployments must terminate TLS 1.3 / 1.2 with strong cipher suites via Nginx, Caddy, or Cloudflare.

### 4.2 Security Headers (Helmet)
The backend employs `helmet` to inject industry-standard HTTP response headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`

### 4.3 Multi-Tier Rate Limiting
Configured using `express-rate-limit` with IP-based counters:
| Route Category | Window | Max Requests | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin Login** (`/api/v1/admin/auth/login`) | 15 mins | 5 requests | Protects against credential stuffing & brute-force |
| **License Activation** (`/api/v1/licenses/activate`) | 1 minute | 10 requests | Protects against automated key-guessing attacks |
| **Payment Submission** (`/api/v1/payments/requests`) | 15 mins | 5 requests | Prevents spam transaction flooding |
| **General Public API** | 1 minute | 60 requests | Protects against denial-of-service |

### 4.4 Strict CORS Allowlist
The CORS middleware strictly validates origins against the configured `CORS_ORIGIN` environment variable.
- Wildcards (`*`) are disallowed when credentials/cookies are enabled.
- Extension origins (`chrome-extension://<id>`) can be explicitly allowed for browser fetch requests.

---

## 5. Transaction Integrity & Concurrency Safety

### 5.1 Race Condition Defense on Installation Limits
To prevent concurrent requests from exceeding the configured `maxInstallations`:
- Activations run within a PostgreSQL database transaction (`prisma.$transaction`).
- The active installation count is evaluated and the new slot is registered atomically.

### 5.2 Idempotent Payment Approvals
- Payment approvals check whether `payment.status === 'APPROVED'`. If already approved, the system returns the existing state without extending the subscription twice.
- Duplicate transaction ID submissions by extension users are blocked at the database level using a pending transaction uniqueness query.

---

## 6. Audit Logging & Non-Repudiation

All sensitive administrative actions generate permanent records in the `AuditLog` table:
- **Recorded Fields:** `id`, `adminId`, `action`, `entityType`, `entityId`, `details` (JSON before/after diff), `ipAddress`, `userAgent`, `createdAt`.
- **Monitored Operations:**
  - License creation, revocation, renewal, and quota updates
  - Browser installation slot revocations
  - Payment request approval and rejection
  - Payment setting and gateway number modifications
  - Admin login attempts and password changes
