# SoleVault — Deployment Guide

> **Version**: 2.0  
> **Last Updated**: August 2026  
> **Purpose**: Step-by-step deployment instructions for local development and production environments.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables](#2-environment-variables)
3. [Firebase Setup](#3-firebase-setup)
4. [Backend Deployment](#4-backend-deployment)
5. [Frontend Deployment](#5-frontend-deployment)
6. [Razorpay Configuration](#6-razorpay-configuration)
7. [Shipping Provider Setup](#7-shipping-provider-setup)
8. [Email/SMTP Configuration](#8-emailsmtp-configuration)
9. [Domain & SSL Configuration](#9-domain--ssl-configuration)
10. [Monitoring & Health Checks](#10-monitoring--health-checks)
11. [Post-Deployment Verification](#11-post-deployment-verification)
12. [Rollback Procedures](#12-rollback-procedures)

---

## 1. Prerequisites

### Required Accounts & Services

| Service | Purpose | Get Started |
|---------|---------|-------------|
| **Node.js** ≥ 18.x | Runtime | [nodejs.org](https://nodejs.org/) |
| **Firebase** | Database + Auth | [console.firebase.google.com](https://console.firebase.google.com/) |
| **Razorpay** | Payments | [dashboard.razorpay.com](https://dashboard.razorpay.com/) |
| **Delhivery** | Shipping (primary) | Contact Delhivery sales |
| **Shadowfax** | Shipping (express) | Contact Shadowfax sales |
| **SMTP Service** | Transactional email | SendGrid / Mailgun / AWS SES |

### Development Tools

```bash
# Verify installations
node --version    # >= 18.x
npm --version     # >= 9.x
```

---

## 2. Environment Variables

### Backend Environment (`.env` in `backend/`)

```env
# Server
PORT=8080
NODE_ENV=production
FRONTEND_URL=https://solevault.example.com

# Firebase Admin SDK (choose ONE method)

# Method 1: Service Account JSON file path
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# Method 2: Individual environment variables
FIREBASE_PROJECT_ID=your_production_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_production_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n"

# Razorpay (Live Mode)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Delhivery
DELHIVERY_API_TOKEN=your_delhivery_api_token

# Shadowfax
SHADOWFAX_API_KEY=your_shadowfax_api_key
SHADOWFAX_CLIENT_ID=your_shadowfax_client_id

# SMTP (SendGrid example)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
SMTP_FROM="SoleVault <noreply@solevault.example.com>"
```

### Frontend Environment (`.env` in `frontend/`)

```env
# API
VITE_API_URL=https://api.solevault.example.com

# Firebase Client Config
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Razorpay (Public Key Only)
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
```

> **Security**: Never commit `.env` files. The `.gitignore` already excludes them.

---

## 3. Firebase Setup

### 3.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project** and follow the wizard
3. Enable Google Analytics (optional)

### 3.2 Enable Authentication

1. Navigate to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Enable **Google** provider
4. Configure authorized domains for production

### 3.3 Create Firestore Database

1. Navigate to **Firestore Database**
2. Click **Create Database**
3. Select **Production mode** (security rules enforced)
4. Choose a region close to your users (e.g., `asia-south1` for India)

### 3.4 Deploy Security Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project root
firebase init firestore

# Deploy the rules from firestore.rules
firebase deploy --only firestore:rules
```

### 3.5 Create Firestore Indexes

Firestore will prompt with auto-index links when queries fail. Required composite indexes:

- `products` — `isActive` + `category` + `createdAt` (for shop filters)
- `orders` — `userId` + `createdAt` (for customer order history)
- `reviews` — `productId` + `status` + `createdAt` (for product reviews)
- `notifications` — `userId` + `createdAt` (for notification feed)

### 3.6 Generate Service Account Key

1. Go to **Project Settings** → **Service Accounts**
2. Click **Generate new private key**
3. Save the JSON file as `serviceAccountKey.json` in `backend/`
4. **Never commit this file** — it's in `.gitignore`

### 3.7 Set Admin Custom Claims

```bash
# Run the admin claim script
cd backend
npx tsx src/scripts/setAdmin.ts <firebase-uid>
```

---

## 4. Backend Deployment

### 4.1 Local Development

```bash
cd backend
npm install

# Create .env with test credentials
cp .env.example .env  # if exists, or create manually

# Start development server with hot reload
npm run dev
```

Server starts at `http://localhost:8080`.

### 4.2 Production Build

```bash
cd backend
npm install
npm run build
```

This compiles TypeScript to `dist/` directory.

### 4.3 Production Start

```bash
cd backend
NODE_ENV=production node dist/index.js
```

### 4.4 Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start dist/index.js --name solevault-api

# Useful PM2 commands
pm2 status              # Check status
pm2 logs solevault-api  # View logs
pm2 restart solevault-api
pm2 stop solevault-api
pm2 save                # Save process list
pm2 startup             # Auto-start on reboot
```

### 4.5 Environment-Specific Notes

| Variable | Development | Production |
|----------|-------------|------------|
| `PORT` | `8080` | `8080` |
| `NODE_ENV` | `development` | `production` |
| `FRONTEND_URL` | `http://localhost:5173` | `https://solevault.example.com` |
| `RAZORPAY_KEY_ID` | `rzp_test_*` | `rzp_live_*` |

---

## 5. Frontend Deployment

### 5.1 Local Development

```bash
cd frontend
npm install

# Create .env with test credentials
# (see .env.example)

# Start Vite dev server
npm run dev
```

App starts at `http://localhost:5173`.

### 5.2 Production Build

```bash
cd frontend
npm install
npm run build
```

Output is in `frontend/dist/` — a static SPA.

### 5.3 Serve Static Build

**Option A: Nginx**

```nginx
server {
    listen 80;
    server_name solevault.example.com;
    root /var/www/solevault/frontend/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Option B: Serve with `serve`**

```bash
npm install -g serve
cd frontend
serve -s dist -l 3000
```

**Option C: Firebase Hosting**

```bash
firebase init hosting
# Set public directory to: frontend/dist
# Configure as SPA: Yes
firebase deploy --only hosting
```

---

## 6. Razorpay Configuration

### 6.1 Switch to Live Mode

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Toggle to **Live Mode** (top-right)
3. Complete KYC verification if not done

### 6.2 Generate API Keys

1. Go to **Settings** → **API Keys**
2. Click **Generate Key**
3. Copy both **Key ID** and **Key Secret**
4. Update backend `.env`:
   - `RAZORPAY_KEY_ID=rzp_live_*`
   - `RAZORPAY_KEY_SECRET=*`

### 6.3 Configure Webhook

1. Go to **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Configure:
   - **URL**: `https://api.solevault.example.com/api/webhooks`
   - **Secret**: Generate a strong secret
   - **Events**:
     - `payment.captured`
     - `order.paid`
     - `refund.processed`
     - `refund.failed`
4. Update backend `.env`:
   - `RAZORPAY_WEBHOOK_SECRET=<your-secret>`

### 6.4 Test Webhook (Development)

Use Razorpay's test mode webhook with ngrok:

```bash
# Install ngrok
ngrok http 8080

# Use the ngrok URL as webhook URL
# https://xxxx.ngrok.io/api/webhooks
```

---

## 7. Shipping Provider Setup

### 7.1 Delhivery

1. Contact Delhivery sales to get API access
2. Obtain your **API Token** from the Delhivery dashboard
3. Configure warehouse/pickup addresses in Delhivery dashboard
4. Update backend `.env`:
   - `DELHIVERY_API_TOKEN=<your-token>`

### 7.2 Shadowfax

1. Contact Shadowfax sales to get API access
2. Obtain your **API Key** and **Client ID**
3. Configure pickup locations in Shadowfax dashboard
4. Update backend `.env`:
   - `SHADOWFAX_API_KEY=<your-key>`
   - `SHADOWFAX_CLIENT_ID=<your-client-id>`

---

## 8. Email/SMTP Configuration

### Recommended Providers

| Provider | SMTP Host | Port |
|----------|-----------|------|
| **SendGrid** | `smtp.sendgrid.net` | 587 |
| **Mailgun** | `smtp.mailgun.org` | 587 |
| **AWS SES** | `email-smtp.<region>.amazonaws.com` | 587 |
| **Gmail** | `smtp.gmail.com` | 587 |

### Configuration

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_api_key
SMTP_FROM="SoleVault <noreply@solevault.example.com>"
```

---

## 9. Domain & SSL Configuration

### 9.1 DNS Records

```
Type    Name                        Value
A       solevault.example.com       <frontend-server-ip>
A       api.solevault.example.com   <backend-server-ip>
CNAME   www.solevault.example.com   solevault.example.com
```

### 9.2 SSL with Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d solevault.example.com -d www.solevault.example.com
sudo certbot --nginx -d api.solevault.example.com

# Auto-renewal (cron)
sudo certbot renew --dry-run
```

### 9.3 CORS Configuration

The backend `FRONTEND_URL` must exactly match the production frontend URL:

```env
FRONTEND_URL=https://solevault.example.com
```

---

## 10. Monitoring & Health Checks

### 10.1 Health Endpoint

The backend exposes a health check:

```
GET /api/health
Response: { "status": "ok" }
```

### 10.2 Uptime Monitoring

Configure monitoring with any of:

| Service | Free Tier | Setup |
|---------|-----------|-------|
| **UptimeRobot** | 50 monitors | [uptimerobot.com](https://uptimerobot.com/) |
| **Better Uptime** | 10 monitors | [betterstack.com](https://betterstack.com/) |
| **Firebase Monitoring** | Built-in | Firebase Console → Monitoring |

Monitor these endpoints:
- `https://api.solevault.example.com/api/health`
- `https://solevault.example.com`

### 10.3 Error Logging

Backend uses Morgan for HTTP logging:
- Development: `dev` format (colored)
- Production: `combined` format (Apache standard)

For production, consider integrating:
- **Sentry** for error tracking
- **LogDNA** or **Papertrail** for log aggregation

---

## 11. Post-Deployment Verification

Run this checklist after every deployment:

### Customer Flow
- [ ] Homepage loads with all assets
- [ ] Product catalog displays correctly
- [ ] Product detail page loads with images and reviews
- [ ] Add to cart works (Zustand persistence)
- [ ] User registration with email/password works
- [ ] Google Sign-In works
- [ ] Checkout flow completes:
  - [ ] Cart validation passes
  - [ ] Razorpay modal opens
  - [ ] Payment completes
  - [ ] Order confirmation page shows
- [ ] Order appears in account/order history
- [ ] Email confirmation is received

### Admin Flow
- [ ] Admin login works (admin custom claims)
- [ ] Dashboard loads with metrics
- [ ] Product CRUD works
- [ ] Order status updates work
- [ ] Shipment creation works
- [ ] Coupon management works
- [ ] Settings save correctly

### Security
- [ ] Non-admin users cannot access `/admin/*`
- [ ] Razorpay webhook endpoint is publicly reachable
- [ ] CORS blocks unauthorized origins
- [ ] Rate limiting is active
- [ ] CSP headers are present

### Shipping
- [ ] Shipment creation with Delhivery works
- [ ] Shipment creation with Shadowfax works
- [ ] Tracking sync returns correct status
- [ ] AWB is generated and stored

---

## 12. Rollback Procedures

### If Deployment Fails

1. **Revert to previous Git tag:**
   ```bash
   git log --oneline -5
   git checkout <previous-working-commit>
   ```

2. **Rebuild and redeploy:**
   ```bash
   cd backend && npm run build && pm2 restart solevault-api
   cd frontend && npm run build
   ```

3. **Do NOT rollback database structures** unless absolutely necessary. Firestore schema changes are additive by nature.

### If Payment Issues Occur

1. Check Razorpay dashboard for failed transactions
2. Verify webhook is receiving events
3. Check `RAZORPAY_WEBHOOK_SECRET` matches dashboard
4. Review backend logs: `pm2 logs solevault-api`

### If Shipping Issues Occur

1. Verify API tokens are valid
2. Check pickup address configuration in provider dashboard
3. Review shipping service logs
4. Manually sync tracking from admin panel

---

*This document covers the complete deployment lifecycle. Keep it updated as infrastructure changes.*
