# SoleVault — Local Setup Guide

> **Version**: 2.0  
> **Last Updated**: August 2026  
> **Purpose**: Step-by-step instructions to set up SoleVault on your local machine for development.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Install Dependencies](#3-install-dependencies)
4. [Environment Configuration](#4-environment-configuration)
5. [Firebase Setup](#5-firebase-setup)
6. [Razorpay Setup](#6-razorpay-setup)
7. [Delhivery Setup](#7-delhivery-setup)
8. [Shadowfax Setup](#8-shadowfax-setup)
9. [Running Locally](#9-running-locally)
10. [Testing](#10-testing)
11. [Common Issues](#11-common-issues)

---

## 1. Prerequisites

Before you begin, ensure you have:

| Tool | Version | Check Command |
|------|---------|---------------|
| **Node.js** | ≥ 18.x | `node --version` |
| **npm** | ≥ 9.x | `npm --version` |
| **Git** | Latest | `git --version` |
| **Code Editor** | VS Code recommended | — |

### Required Accounts (Free Tiers Available)

- **Firebase** — [console.firebase.google.com](https://console.firebase.google.com/)
- **Razorpay** — [dashboard.razorpay.com](https://dashboard.razorpay.com/) (test mode is free)
- **Delhivery** — Contact sales for API access
- **Shadowfax** — Contact sales for API access

---

## 2. Clone the Repository

```bash
git clone <repository-url>
cd Shoe
```

### Project Structure

```
Shoe/
├── frontend/          # React + Vite storefront & admin panel
├── backend/           # Express API server
├── firestore.rules    # Firestore security rules
├── ARCHITECTURE.md    # System architecture docs
├── DEPLOYMENT.md      # Deployment guide
├── SETUP.md           # This file
└── README.md          # Project overview
```

---

## 3. Install Dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

### Verify Installation

```bash
# Backend
cd backend
npm run build    # Should compile without errors

# Frontend
cd frontend
npm run build    # Should compile without errors
```

---

## 4. Environment Configuration

### 4.1 Backend Environment

Create `backend/.env`:

```env
# Server
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Firebase Admin SDK
# Option A: Service Account JSON file (recommended for local dev)
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# Option B: Individual env vars (for CI/production)
# FIREBASE_PROJECT_ID=your_project_id
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Razorpay (Test Mode)
RAZORPAY_KEY_ID=rzp_test_your_key_here
RAZORPAY_KEY_SECRET=your_razorpay_test_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Delhivery (optional for local dev)
DELHIVERY_API_TOKEN=your_delhivery_token

# Shadowfax (optional for local dev)
SHADOWFAX_API_KEY=your_shadowfax_key
SHADOWFAX_CLIENT_ID=your_shadowfax_client_id

# SMTP (optional for local dev — emails will fail silently)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_mailtrap_user
SMTP_PASSWORD=your_mailtrap_password
SMTP_FROM="SoleVault Dev <dev@solevault.local>"
```

### 4.2 Frontend Environment

Create `frontend/.env`:

```env
# API URL
VITE_API_URL=http://localhost:8080

# Firebase Client Config
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Razorpay (Test Mode — public key only)
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_here
```

> **Tip**: Copy from `frontend/.env.example` as a starting point.

---

## 5. Firebase Setup

### 5.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**
3. Enter project name (e.g., `solevault-dev`)
4. Disable Google Analytics (optional for dev)
5. Click **Create Project**

### 5.2 Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password**
3. Enable **Google** (select a support email)
4. Click **Save**

### 5.3 Create Firestore Database

1. Go to **Firestore Database** → **Create Database**
2. Select **Start in test mode** (for local development)
3. Choose region: `asia-south1` (Mumbai) or closest to you
4. Click **Enable**

### 5.4 Get Web Config (Frontend)

1. Go to **Project Settings** → **General**
2. Scroll to **Your apps** → Click **Web** icon (`</>`)
3. Register app name: `solevault-frontend`
4. Copy the `firebaseConfig` object values into `frontend/.env`:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `storageBucket` → `VITE_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`

### 5.5 Get Service Account Key (Backend)

1. Go to **Project Settings** → **Service Accounts**
2. Click **Generate new private key**
3. Save the downloaded JSON as `backend/serviceAccountKey.json`
4. **Never commit this file** — it's in `.gitignore`

### 5.6 Set Admin Claims

To access the admin panel, you need to set custom claims on your Firebase user:

```bash
cd backend
npx tsx src/scripts/setAdmin.ts <your-firebase-uid>
```

To find your UID:
1. Sign up via the app
2. Go to Firebase Console → **Authentication** → **Users**
3. Copy the UID

### 5.7 Deploy Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

---

## 6. Razorpay Setup

### 6.1 Create Test Account

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up (no KYC needed for test mode)
3. You're automatically in **Test Mode**

### 6.2 Get API Keys

1. Go to **Settings** → **API Keys**
2. Click **Generate Key** (in Test Mode)
3. Copy:
   - **Key ID** → `backend/.env` → `RAZORPAY_KEY_ID`
   - **Key Secret** → `backend/.env` → `RAZORPAY_KEY_SECRET`
   - **Key ID** → `frontend/.env` → `VITE_RAZORPAY_KEY_ID`

### 6.3 Configure Test Webhook (Optional)

For local development, use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# In a separate terminal, expose backend
ngrok http 8080

# Copy the https URL (e.g., https://abc123.ngrok.io)
```

In Razorpay Dashboard:
1. Go to **Settings** → **Webhooks**
2. Add webhook URL: `https://abc123.ngrok.io/api/webhooks`
3. Set secret → `backend/.env` → `RAZORPAY_WEBHOOK_SECRET`
4. Select events: `payment.captured`, `order.paid`, `refund.processed`, `refund.failed`

### 6.4 Test Cards

Use these Razorpay test cards:

| Card Number | Result |
|-------------|--------|
| `4111 1111 1111 1111` | Success |
| `4000 0000 0000 0002` | Failure |
| `4000 0027 6000 3184` | Requires authentication |

- **CVV**: Any 3 digits
- **Expiry**: Any future date

---

## 7. Delhivery Setup

### 7.1 Get API Access

1. Contact Delhivery sales or sign up at [delhivery.com](https://www.delhivery.com/)
2. Request API access for your merchant account
3. Obtain your **API Token** from the Delhivery dashboard

### 7.2 Configure

Add to `backend/.env`:

```env
DELHIVERY_API_TOKEN=your_delhivery_api_token
```

### 7.3 Configure Pickup Address

In the Delhivery dashboard:
1. Add your warehouse/pickup address
2. Note the pickup pin code (used in shipment creation)

> **Note**: For local development without Delhivery access, shipping features will fail gracefully. Mock the service or skip shipment creation.

---

## 8. Shadowfax Setup

### 8.1 Get API Access

1. Contact Shadowfax sales at [shadowfax.in](https://www.shadowfax.in/)
2. Request API integration credentials
3. Obtain your **API Key** and **Client ID**

### 8.2 Configure

Add to `backend/.env`:

```env
SHADOWFAX_API_KEY=your_shadowfax_api_key
SHADOWFAX_CLIENT_ID=your_shadowfax_client_id
```

### 8.3 Configure Pickup Location

In the Shadowfax dashboard:
1. Add pickup locations matching your warehouse addresses
2. Configure serviceable pincodes

> **Note**: For local development without Shadowfax access, the system will fall back to Delhivery or handle errors gracefully.

---

## 9. Running Locally

### 9.1 Start Backend

```bash
cd backend
npm run dev
```

You should see:
```
Backend server running on port 8080
```

### 9.2 Start Frontend

In a **new terminal**:

```bash
cd frontend
npm run dev
```

You should see:
```
VITE vX.X.X  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

### 9.3 Access the Application

| URL | Description |
|-----|-------------|
| `http://localhost:5173` | Customer storefront |
| `http://localhost:5173/admin` | Admin panel |
| `http://localhost:8080/api/health` | Backend health check |

### 9.4 Verify Backend Connection

```bash
curl http://localhost:8080/api/health
# Expected: {"status":"ok"}
```

---

## 10. Testing

### 10.1 Manual Testing Checklist

#### Customer Flow
1. **Home Page** — Verify hero, featured products, new arrivals load
2. **Shop Page** — Test filters (category, size, price), sorting, pagination
3. **Product Detail** — Test image gallery, size selector, add to cart
4. **Cart** — Test add/remove items, quantity changes, coupon apply
5. **Auth** — Test signup, login, Google sign-in, forgot password
6. **Checkout** — Test address selection, Razorpay payment (test card)
7. **Orders** — Verify order appears in account, detail page loads
8. **Wishlist** — Test add/remove, move to cart

#### Admin Flow
1. **Dashboard** — Verify metrics load
2. **Products** — Test CRUD, size management
3. **Orders** — Test list, detail, status updates
4. **Coupons** — Test create, edit, apply
5. **Returns** — Test approval/rejection flow
6. **Settings** — Test save/update

### 10.2 API Testing with cURL

```bash
# Health check
curl http://localhost:8080/api/health

# List products
curl http://localhost:8080/api/products

# Get featured products
curl http://localhost:8080/api/products/featured

# Search products
curl "http://localhost:8080/api/products/search?q=nike"
```

### 10.3 Build Verification

```bash
# Verify frontend builds cleanly
cd frontend
npm run build

# Verify backend compiles cleanly
cd backend
npm run build
```

---

## 11. Common Issues

### Backend won't start

**Error**: `Firebase app has not been initialized`
- **Fix**: Ensure `serviceAccountKey.json` exists in `backend/` or env vars are set

**Error**: `Port 8080 already in use`
- **Fix**: Change `PORT` in `backend/.env` or kill the process using port 8080

### Frontend won't connect to backend

**Error**: `Network Error` / `CORS error`
- **Fix**: Ensure backend is running and `VITE_API_URL` matches backend URL
- **Fix**: Check `FRONTEND_URL` in `backend/.env` matches `http://localhost:5173`

### Firebase Auth not working

**Error**: `auth/invalid-api-key`
- **Fix**: Verify `VITE_FIREBASE_API_KEY` in `frontend/.env`

**Error**: `auth/user-not-found` after signup
- **Fix**: Check Firebase Console → Authentication → Users to see if user was created

### Razorpay modal not opening

**Error**: `Razorpay is not defined`
- **Fix**: Ensure `VITE_RAZORPAY_KEY_ID` is set in `frontend/.env`

**Error**: Modal opens but payment fails
- **Fix**: Use test card `4111 1111 1111 1111`
- **Fix**: Ensure backend is running for order creation

### Admin panel not accessible

**Error**: Redirected to login / 403
- **Fix**: Set admin claims: `npx tsx src/scripts/setAdmin.ts <uid>`
- **Fix**: Re-login after setting claims (token refresh needed)

---

*This guide covers local development setup. For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).*
