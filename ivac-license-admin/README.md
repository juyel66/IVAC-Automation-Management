# IVAC License Management Admin Portal

Modern, responsive Executive Admin Dashboard for controlling IVAC Automation license keys, browser quotas, manual bKash/Nagad payments, and system audit logs.

## Technology Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (Executive dark-mode design system with glassmorphism)
- **Routing**: React Router v7
- **Data Fetching & State**: TanStack React Query v5
- **Icons**: Lucide React

---

## Features

1. **Performance Dashboard**: Real-time summary KPI cards showing Total, Active, Expired, Revoked, and Suspended licenses, along with pending payment counts and browser quotas.
2. **License Authority**:
   - Filter, search, and paginate through all licenses.
   - Generate keys with configurable durations (7, 15, 30, 90, 180, 365 days, or custom) and configurable browser installation limits (1, 2, 5, etc.).
   - Secure plaintext key reveal: displays plaintext key exactly once with a single-click clipboard copy tool.
   - Extend or renew license validity without resetting activation timestamps.
   - Revoke license immediately with cascading invalidation.
   - Reissue / rotate keys for lost keys.
3. **Browser Quota & Installation Manager**:
   - Inspect all browser installations registered to a license.
   - View Installation ID, label, first activation timestamp, and last-seen activity.
   - Revoke individual browser installations to immediately free a slot for another device.
   - Adjust installation limits with guardrails that prevent accidental limit reduction below active counts.
4. **Manual Payment Verification Queue**:
   - Inspect customer bKash and Nagad transaction submissions.
   - Idempotent one-click approval: automatically links to existing licenses or generates new keys with zero risk of duplicate extensions.
   - Rejection with audit notes.
5. **Gateway & System Settings**:
   - Configure public bKash/Nagad receiving numbers, WhatsApp support numbers, and instructions.
   - Administrator password updates.
6. **Chronological Audit Trail**: Complete immutable audit log of administrative actions.

---

## Getting Started

### 1. Prerequisites
- Node.js >= 18

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your backend API base URL:
```env
VITE_API_BASE_URL="http://localhost:5000/api/v1"
```

### 3. Installation & Development
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Production Build
```bash
npm run build
npm run preview
```
Output bundle is generated into `dist/`.
