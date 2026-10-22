# IVAC Premium System — REST API Specification

## 1. Overview & Conventions

The IVAC License Backend exposes a high-performance, strictly typed RESTful API.

- **Base URL (Local):** `http://localhost:5000/api/v1`
- **Base URL (Production):** `https://api.yourdomain.com/api/v1`
- **Content-Type:** `application/json`
- **Authentication:**
  - **Admin Endpoints:** Bearer Token in `Authorization: Bearer <jwt-token>`
  - **Extension Endpoints:** Verified using `licenseKey` + `installationId` in JSON request body. License keys are NEVER passed in URLs or query parameters.

### Standard Response Envelope

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation message"
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "error": {
    "code": "ERROR_CODE_STRING",
    "details": null
  }
}
```

---

## 2. Public & Extension Endpoints

### 2.1 Get Public Payment Instructions
Retrieves active payment numbers (bKash, Nagad), subscription pricing, and WhatsApp support contact.

- **Method / Path:** `GET /api/v1/public/payment-instructions`
- **Auth Required:** None
- **Rate Limit:** 60 req/min

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "bkashNumber": "01700000000",
    "nagadNumber": "01800000000",
    "bankInstructions": "City Bank, Account Name: IVAC Automation, A/C: 1102938475",
    "monthlyPrice": 1500,
    "whatsappSupport": "+8801700000000",
    "instructionText": "Send Money via bKash or Nagad Personal, then submit your Transaction ID.",
    "plans": [
      {
        "id": "plan-1",
        "name": "1 Month Premium",
        "durationDays": 30,
        "maxInstallations": 2,
        "price": 1500,
        "description": "Full IVAC automation for 2 browsers for 30 days."
      }
    ]
  }
}
```

---

### 2.2 Activate License
Activates an unused key or registers an additional browser installation slot.

- **Method / Path:** `POST /api/v1/licenses/activate`
- **Auth Required:** None
- **Rate Limit:** 10 req/min

#### Request Body
```json
{
  "licenseKey": "IVAC-A2B3-C4D5-E6F7-G8H9",
  "installationId": "inst_7b9d4e5f-1a2b-4c3d-8e5f-6a7b8c9d0e1f",
  "installationLabel": "Chrome 129 on Windows (Workstation)"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "licenseId": "lic_9f8e7d6c-5b4a-3210-fedc-ba9876543210",
    "status": "ACTIVE",
    "activatedAt": "2026-10-22T18:00:00.000Z",
    "expiresAt": "2026-11-21T18:00:00.000Z",
    "daysRemaining": 30,
    "maxInstallations": 2,
    "activeInstallationsCount": 1,
    "availableSlots": 1,
    "signature": "3f8b0c8d...hmac-sha256-signature..."
  },
  "message": "License activated successfully on this browser."
}
```

#### Error Response `409 Conflict` (Installation Limit Reached)
```json
{
  "success": false,
  "message": "Maximum browser installation limit reached (2/2). Please release another browser first.",
  "error": {
    "code": "INSTALLATION_LIMIT_REACHED"
  }
}
```

---

### 2.3 Validate License Status
Validates current license status, checks expiration, and updates last-seen timestamp.

- **Method / Path:** `POST /api/v1/licenses/validate`
- **Auth Required:** None
- **Rate Limit:** 30 req/min

#### Request Body
```json
{
  "licenseKey": "IVAC-A2B3-C4D5-E6F7-G8H9",
  "installationId": "inst_7b9d4e5f-1a2b-4c3d-8e5f-6a7b8c9d0e1f"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "licenseId": "lic_9f8e7d6c-5b4a-3210-fedc-ba9876543210",
    "status": "ACTIVE",
    "activatedAt": "2026-10-22T18:00:00.000Z",
    "expiresAt": "2026-11-21T18:00:00.000Z",
    "daysRemaining": 29,
    "maxInstallations": 2,
    "activeInstallationsCount": 1,
    "availableSlots": 1,
    "signature": "8a7c6b5d...hmac-sha256-signature..."
  }
}
```

---

### 2.4 Heartbeat
Lightweight background heartbeat to record active presence without re-evaluating heavy queries.

- **Method / Path:** `POST /api/v1/licenses/heartbeat`
- **Auth Required:** None
- **Rate Limit:** 60 req/min

#### Request Body
```json
{
  "licenseKey": "IVAC-A2B3-C4D5-E6F7-G8H9",
  "installationId": "inst_7b9d4e5f-1a2b-4c3d-8e5f-6a7b8c9d0e1f"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "ACTIVE",
    "expiresAt": "2026-11-21T18:00:00.000Z",
    "daysRemaining": 29
  }
}
```

---

### 2.5 Release Installation Slot
Voluntarily surrenders the caller browser's installation slot, immediately freeing it on the backend for another machine.

- **Method / Path:** `POST /api/v1/licenses/release-installation`
- **Auth Required:** None
- **Rate Limit:** 10 req/min

#### Request Body
```json
{
  "licenseKey": "IVAC-A2B3-C4D5-E6F7-G8H9",
  "installationId": "inst_7b9d4e5f-1a2b-4c3d-8e5f-6a7b8c9d0e1f"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Browser installation released successfully. A license slot is now freed."
}
```

---

### 2.6 Submit Manual Payment Request
Submits a bKash or Nagad transaction ID for admin verification and license generation/renewal.

- **Method / Path:** `POST /api/v1/payments/requests`
- **Auth Required:** None
- **Rate Limit:** 5 req/min

#### Request Body
```json
{
  "paymentMethod": "BKASH",
  "planId": "plan-1",
  "transactionId": "BLX9827361",
  "senderMobile": "01712345678",
  "payerContact": "user@example.com",
  "licenseKey": "IVAC-A2B3-C4D5-E6F7-G8H9"
}
```

#### Response `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "pay_11223344",
    "transactionId": "BLX9827361",
    "paymentMethod": "BKASH",
    "status": "PENDING",
    "submittedAt": "2026-10-22T18:30:00.000Z"
  },
  "message": "Payment request submitted. Our team will verify and activate your license within 15-30 minutes."
}
```

---

## 3. Administrator Endpoints

All admin endpoints require `Authorization: Bearer <JWT>` header, obtained via `/admin/auth/login`.

### 3.1 Admin Authentication

#### `POST /api/v1/admin/auth/login`
- **Rate Limit:** 5 attempts / 15 minutes.
- **Request:** `{ "username": "admin", "password": "secure_password" }`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "admin": { "id": "adm_1", "username": "admin", "name": "Super Admin", "role": "SUPER_ADMIN" }
    }
  }
  ```

#### `POST /api/v1/admin/auth/logout`
- **Response:** `{ "success": true, "message": "Logged out successfully" }`

#### `GET /api/v1/admin/auth/me`
- **Response:** `{ "success": true, "data": { ...admin profile... } }`

---

### 3.2 Dashboard Overview

#### `GET /api/v1/admin/dashboard`
Returns 8 high-level KPI metrics for the executive dashboard cards.

- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "totalLicenses": 142,
      "activeLicenses": 98,
      "expiredLicenses": 32,
      "revokedLicenses": 8,
      "suspendedLicenses": 4,
      "pendingPayments": 3,
      "activeInstallations": 145,
      "expiringSoon": 7
    }
  }
  ```

---

### 3.3 License Management

#### `GET /api/v1/admin/licenses`
Paginated license listing with filter and search capabilities.
- **Query Params:**
  - `page` (default: 1)
  - `limit` (default: 20)
  - `search` (matches customerName, customerContact, adminNotes)
  - `status` (`ALL`, `PENDING`, `ACTIVE`, `EXPIRED`, `SUSPENDED`, `REVOKED`)

#### `POST /api/v1/admin/licenses`
Generates a new license key. **Returns plaintext key strictly in this response.**
- **Request:**
  ```json
  {
    "validityDays": 30,
    "maxInstallations": 2,
    "customerName": "John Doe",
    "customerContact": "01711223344",
    "adminNotes": "Paid via cash in office"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "licenseId": "lic_9f8e7d6c-5b4a-3210-fedc-ba9876543210",
      "licenseKey": "IVAC-X9Y8-Z7W6-V5U4-T3S2",
      "validityDays": 30,
      "maxInstallations": 2,
      "status": "PENDING"
    },
    "message": "License generated successfully. Copy the key now; it cannot be retrieved again."
  }
  ```

#### `GET /api/v1/admin/licenses/:id`
Retrieves single license details, masked key (`IVAC-••••-••••-••••-T3S2`), active installations, and audit history.

#### `PATCH /api/v1/admin/licenses/:id`
Updates quota (`maxInstallations`), customer details, or status (`ACTIVE`, `SUSPENDED`).
*Note: Modifying `maxInstallations` does NOT reset or alter validity expiration.*

#### `POST /api/v1/admin/licenses/:id/renew`
Extends license validity by configured duration.
- **Request:** `{ "days": 30, "reason": "Monthly renewal" }`

#### `POST /api/v1/admin/licenses/:id/revoke`
Immediately invalidates license and terminates all active browser sessions.
- **Request:** `{ "reason": "Suspected sharing of key outside terms" }`

#### `POST /api/v1/admin/licenses/:id/reissue-key`
Admin key rotation workflow. Invaluates old key and issues a new plaintext key.

#### `GET /api/v1/admin/licenses/:id/installations`
Lists all browser installations registered under this license ID.

#### `POST /api/v1/admin/installations/:id/revoke`
Allows an administrator to forcefully revoke a single browser installation slot without revoking the entire customer license.

---

### 3.4 Payment Queue & Review

#### `GET /api/v1/admin/payments`
Lists payment requests. Filters: `status` (`ALL`, `PENDING`, `APPROVED`, `REJECTED`).

#### `POST /api/v1/admin/payments/:id/approve`
Idempotent payment approval.
- **Request:**
  ```json
  {
    "adminNote": "Verified in bKash Merchant App at 18:35 PM"
  }
  ```
- **Action:** If linked to an existing license, extends validity. If unlinked, creates a new license and returns the plaintext key to the admin.

#### `POST /api/v1/admin/payments/:id/reject`
Rejects invalid/fake transaction ID.
- **Request:** `{ "adminNote": "Transaction ID not found in bKash statement" }`

---

### 3.5 System Settings & Audit Logs

#### `GET /api/v1/admin/settings` & `PATCH /api/v1/admin/settings`
View and update bKash number, Nagad number, bank details, monthly pricing, and support contact.

#### `GET /api/v1/admin/audit-logs`
Chronological, tamper-evident log of all sensitive admin actions (IP, Admin ID, Action, Entity, Changes).
