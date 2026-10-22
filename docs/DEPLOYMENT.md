# IVAC Premium System — Production Deployment Guide

## 1. Overview & Architecture Separation

The IVAC Premium suite consists of three fully decoupled applications:

1. **`ivac-license-backend/`** — Headless Node.js/Express API with PostgreSQL.
2. **`ivac-license-admin/`** — Static React SPA (Vite) deployable to any web server, CDN, or object storage.
3. **`IVAC-Automation/`** — Manifest V3 Chrome Extension packed for browser distribution.

All three projects are self-contained and use portable, relative paths. You can move or deploy them individually to separate servers or cloud providers.

---

## 2. Prerequisites

- **Operating System:** Ubuntu 22.04 / 24.04 LTS (recommended for VPS) or Windows Server
- **Node.js:** v18.0.0 or higher (v20 LTS or v22 LTS recommended)
- **Package Manager:** `npm` (v9+)
- **Database:** PostgreSQL 14+ (Local or Managed Database like Neon, Supabase, or AWS RDS)
- **Web Server / Reverse Proxy:** Nginx or Caddy with SSL (Let's Encrypt)
- **Process Manager:** PM2 (recommended for Node.js production service)

---

## 3. Environment Variables Reference

### 3.1 Backend (`ivac-license-backend/.env`)

```ini
# Server Port & Runtime Environment
PORT=5000
NODE_ENV=production

# PostgreSQL Connection String
DATABASE_URL="postgresql://ivac_user:StrongPassword123@localhost:5432/ivac_license_db?schema=public"

# Cryptographic Secrets (Generate with: openssl rand -base64 32)
JWT_SECRET="replace-with-a-very-long-cryptographically-secure-random-jwt-secret-string"
ENTITLEMENT_SECRET="replace-with-a-separate-hmac-sha256-signing-secret-for-entitlements"

# CORS Configuration (Admin dashboard origin and/or chrome-extension ID)
# Comma-separated or single origin
CORS_ORIGIN="https://admin.yourdomain.com,chrome-extension://*"

# Initial Superadmin Credentials (Used when running: npm run seed)
INITIAL_ADMIN_EMAIL="admin@yourdomain.com"
INITIAL_ADMIN_USERNAME="admin"
INITIAL_ADMIN_PASSWORD="ChangeThisPasswordImmediatelyUponFirstLogin!123"
```

### 3.2 Admin Frontend (`ivac-license-admin/.env`)

```ini
# Public URL of the License Backend API (NO trailing slash)
VITE_API_BASE_URL="https://api.yourdomain.com/api/v1"
```

---

## 4. Step-by-Step Production Deployment

### Step 1: PostgreSQL Setup
On your database server, create a dedicated database and user:
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE ivac_license_db;
CREATE USER ivac_user WITH ENCRYPTED PASSWORD 'StrongPassword123';
GRANT ALL PRIVILEGES ON DATABASE ivac_license_db TO ivac_user;
\q
```

---

### Step 2: Deploy Backend (`ivac-license-backend`)

1. Clone or copy `ivac-license-backend/` to your server (e.g. `/var/www/ivac-license-backend`).
2. Install production dependencies:
   ```bash
   cd /var/www/ivac-license-backend
   npm ci
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   nano .env
   ```
4. Push Prisma schema & generate client:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Seed initial superadmin and default payment settings:
   ```bash
   npm run seed
   ```
6. Build TypeScript code to `dist/`:
   ```bash
   npm run build
   ```
7. Start with PM2:
   ```bash
   sudo npm install -g pm2
   pm2 start dist/server.js --name "ivac-backend" --node-args="-r dotenv/config"
   pm2 save
   pm2 startup
   ```

---

### Step 3: Deploy Admin Frontend (`ivac-license-admin`)

1. Navigate to `ivac-license-admin`:
   ```bash
   cd /var/www/ivac-license-admin
   npm ci
   ```
2. Configure `.env` with your backend domain:
   ```bash
   echo 'VITE_API_BASE_URL="https://api.yourdomain.com/api/v1"' > .env
   ```
3. Build the production SPA bundle:
   ```bash
   npm run build
   ```
   The static production assets are compiled to `dist/`.
4. Deploy `dist/` to Nginx, Apache, or Cloudflare Pages.

---

### Step 4: Configure Nginx & SSL

Here is a battle-tested Nginx reverse proxy configuration for both the API backend and the static admin dashboard:

```nginx
# 1. License Backend API (api.yourdomain.com)
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}

# 2. Admin Dashboard (admin.yourdomain.com)
server {
    server_name admin.yourdomain.com;
    root /var/www/ivac-license-admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 80;
}
```

Enable SSL certificates with Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com
```

---

### Step 5: Build & Distribute Chrome Extension (`IVAC-Automation`)

1. Open `IVAC-Automation/src/features/license/licenseClient.ts`:
   - Verify `DEFAULT_API_BASE_URL` points to your production API:
     ```ts
     const DEFAULT_API_BASE_URL = 'https://api.yourdomain.com/api/v1';
     ```
2. Build the production extension:
   ```bash
   cd IVAC-Automation
   npm ci
   npm run build
   ```
3. Load the unpacked extension or package as ZIP:
   - In Google Chrome, navigate to `chrome://extensions/`.
   - Enable **Developer mode** (top right toggle).
   - Click **Load unpacked** and select the `IVAC-Automation/dist` folder.
   - Or zip the `dist/` directory for internal team distribution or submission to the Chrome Web Store.

---

## 5. Docker Deployment Option (Alternative)

For teams preferring containerized deployments, a minimal `docker-compose.yml` can be placed at the root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ivac-postgres
    restart: always
    environment:
      POSTGRES_DB: ivac_license_db
      POSTGRES_USER: ivac_user
      POSTGRES_PASSWORD: StrongPassword123
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./ivac-license-backend
    container_name: ivac-backend
    restart: always
    depends_on:
      - postgres
    environment:
      PORT: 5000
      NODE_ENV: production
      DATABASE_URL: "postgresql://ivac_user:StrongPassword123@postgres:5432/ivac_license_db?schema=public"
      JWT_SECRET: "your-jwt-secret"
      ENTITLEMENT_SECRET: "your-entitlement-secret"
      CORS_ORIGIN: "*"
    ports:
      - "5000:5000"

volumes:
  pgdata:
```

---

## 6. Backup and Disaster Recovery

### Automated Database Backups
Run a daily cron job to backup the PostgreSQL database:
```bash
pg_dump -U ivac_user -h localhost -d ivac_license_db -F c -b -v -f "/backups/ivac_db_$(date +%Y%m%d_%H%M%S).dump"
```

### Database Restore
To restore from a dump file:
```bash
pg_restore -U ivac_user -h localhost -d ivac_license_db -v -c "/backups/ivac_db_20261022.dump"
```
