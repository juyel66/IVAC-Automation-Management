# IVAC Premium System — Automated & Integration Testing Guide

## 1. Test Suite Overview

The IVAC Premium suite includes comprehensive automated test coverage spanning backend business logic, security barriers, quota enforcement, and Chrome extension workflow engine guards.

| Project Component | Test Runner | Test Suites | Total Tests | Pass Rate |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API** (`ivac-license-backend`) | Vitest 3.2 | 4 | 21 | **100%** (21/21) |
| **Chrome Extension** (`IVAC-Automation`) | Vitest 3.2 | 13 | 138 | **100%** (138/138) |
| **Admin Frontend** (`ivac-license-admin`) | TypeScript + Vite | Static / Build | 2020 Modules | **100%** (0 errors) |

---

## 2. Backend Automated Test Coverage (`ivac-license-backend/tests/`)

Run the backend test suite:
```bash
cd ivac-license-backend
npm test
```

### 2.1 Core License System (`tests/license.test.ts`)
- `[PASS]` Creates key in `PENDING` state with uninitialized validity dates.
- `[PASS]` First activation initializes `activatedAt` and `expiresAt` timestamps.
- `[PASS]` Subsequent activations on permitted slots preserve existing expiry date (no reset).
- `[PASS]` Admin renewal extends validity according to the documented rule.
- `[PASS]` Rejects invalid license keys with HTTP `404 INVALID_LICENSE_KEY`.
- `[PASS]` Rejects suspended licenses with HTTP `403 LICENSE_SUSPENDED`.
- `[PASS]` Rejects revoked licenses with HTTP `403 LICENSE_REVOKED`.

### 2.2 Browser Installation Limits & Release (`tests/installation.test.ts`)
- `[PASS]` Enforces installation limit strictly and rejects activations exceeding quota with HTTP `409 INSTALLATION_LIMIT_REACHED`.
- `[PASS]` Releases an installation slot from the client and permits another browser to claim the freed slot.
- `[PASS]` Admin can forcefully revoke an individual browser installation directly from the admin panel.

### 2.3 Manual Payment Workflow (`tests/payment.test.ts`)
- `[PASS]` Submits manual payment request with pending review status.
- `[PASS]` Rejects duplicate submission with the same pending transaction ID.
- `[PASS]` Admin approves payment, renews linked license, and marks payment `APPROVED`.
- `[PASS]` Idempotent approval: approving a payment twice does not double-extend subscription.
- `[PASS]` Admin rejects invalid payment request with review note.
- `[PASS]` Unapproved pending payment does NOT authorize or renew a license.

### 2.4 Security & Access Control (`tests/security.test.ts`)
- `[PASS]` Rejects unauthenticated admin API requests with HTTP `401`.
- `[PASS]` Ordinary extension activation requests cannot access admin endpoints.
- `[PASS]` Prevents another user/license from releasing an installation they do not own with HTTP `404`.
- `[PASS]` Plaintext license keys are NEVER returned in public or list API responses (stored as SHA-256 hashes).
- `[PASS]` Validates presence of Helmet security headers and CORS protection.

---

## 3. Chrome Extension Automated Test Coverage (`IVAC-Automation/src/__tests__/`)

Run the extension test suite:
```bash
cd IVAC-Automation
npm test
```

### 3.1 License Integration & Security Gate (`src/__tests__/licenseIntegration.test.ts`)
- `[PASS]` **1. No-license state:** Returns `UNLICENSED` and blocks `workflowEngine.start()`.
- `[PASS]` **2. Successful activation:** Stores entitlement, HMAC signature, and permits automation.
- `[PASS]` **3. Installation limit reached:** Handles HTTP 409 rejection gracefully with an actionable error.
- `[PASS]` **4. Expired license:** Pre-emptively halts `workflowEngine.start()` and reports expired status.
- `[PASS]` **5. Admin revoked license:** Halts active workflow immediately upon validation.
- `[PASS]` **6. Installation release:** Calls server release endpoint, frees slot, and resets local state to `UNLICENSED`.
- `[PASS]` **7. Network resilience:** Transient offline errors fall back to valid cached state without falsely reporting the license expired.

### 3.2 Preserved Core Automation Suites (12 Suites, 131 Tests)
- `[PASS]` `src/__tests__/adapters.test.ts` (12 tests) — Appointment & Document adapters.
- `[PASS]` `src/__tests__/credentialsWorkflow.test.ts` (5 tests) — AES-256-GCM encrypted credential handling.
- `[PASS]` `src/__tests__/crypto.test.ts` (5 tests) — PBKDF2 salt and key derivation.
- `[PASS]` `src/__tests__/documentConfirmationWorkflow.test.ts` (14 tests) — Turnstile and document mapping.
- `[PASS]` `src/__tests__/documentStorage.test.ts` (4 tests) — Local PDF blob storage.
- `[PASS]` `src/__tests__/fullAppointmentWorkflow.test.ts` (5 tests) — End-to-end appointment automation.
- `[PASS]` `src/__tests__/loginWorkflow.test.ts` (26 tests) — Login, OTP, and captcha workflows.
- `[PASS]` `src/__tests__/pageDetector.test.ts` (15 tests) — Portal page detection.
- `[PASS]` `src/__tests__/storage.test.ts` (4 tests) — Chrome storage repository.
- `[PASS]` `src/__tests__/validation.test.ts` (19 tests) — Profile validation rules.
- `[PASS]` `src/__tests__/workflow.test.ts` (9 tests) — State transitions.
- `[PASS]` `src/__tests__/workflowProgressHelper.test.ts` (13 tests) — Step timing and recovery.

---

## 4. Manual End-to-End Verification Walkthrough

Follow this verification procedure to validate the full software lifecycle in a development environment:

### Step 1: Start the Backend Service
```bash
cd ivac-license-backend
npm run dev
# Server listening at http://localhost:5000
```

### Step 2: Start the Admin Dashboard
```bash
cd ivac-license-admin
npm run dev
# Dashboard available at http://localhost:5173
```
- Open `http://localhost:5173`.
- Log in with default admin credentials (`admin` / `admin123456`).
- Navigate to **Licenses** -> Click **Generate License**.
- Configure: Validity: 30 days, Max Installations: 2.
- Click **Generate License** and copy the revealed key: `IVAC-XXXX-XXXX-XXXX-XXXX`.

### Step 3: Test Chrome Extension Activation
1. Load `IVAC-Automation/dist` in `chrome://extensions/`.
2. Open the IVAC portal (`https://appointment.ivacbd.com/`) or test page.
3. Open the IVAC floating control panel.
4. Click the **License** pill button.
5. Paste the copied license key and click **Activate License**.
6. Verify:
   - Status updates to `ACTIVE`.
   - Displays: `Registered installations: 1 / 2`.
   - Displays: `Available slots: 1`.
   - Exact expiration date is calculated and displayed in your local time zone.

### Step 4: Test Installation Release
1. Inside the extension License Modal, click **Release This Installation**.
2. Confirm the action.
3. Verify that the extension immediately transitions to `UNLICENSED` and that the slot is freed on the backend dashboard.

### Step 5: Test Manual Payment Submission & Approval
1. In the extension License Modal, select **Renew / Submit Payment Request**.
2. Select **bKash**, enter transaction ID (e.g. `TRX99887766`), sender mobile, and select plan.
3. Click **Submit Payment Request**.
4. Switch to the Admin Dashboard at `http://localhost:5173` -> Click **Payments**.
5. Locate the pending request -> Click **Approve**.
6. Verify that the payment transitions to `APPROVED` and that the linked license is renewed.
