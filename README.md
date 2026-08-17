# SoleVault — Premium Shoe E-Commerce Platform

A modern, production-grade shoe e-commerce platform built with TypeScript, React, and Node.js. SoleVault delivers an Apple-inspired aesthetic with deep blacks, soft off-white surfaces, metallic gold accents, and smooth micro-animations.

---

## Features

### Customer Storefront
- **Product Catalog** — Browse by category, collection, brand with advanced filters and sorting
- **Product Detail** — Image gallery with zoom, size selector with stock indicators, reviews
- **Smart Search** — Live search with suggestions across products, brands, categories
- **Shopping Cart** — Persistent cart with Zustand, coupon application, real-time totals
- **Wishlist** — Save and manage favorite products
- **Secure Checkout** — Razorpay Custom Checkout with server-verified pricing
- **Order Tracking** — Real-time shipment tracking via Delhivery/Shadowfax
- **Account Management** — Profile, addresses, order history, returns, notifications
- **Reviews & Ratings** — Submit and browse verified purchase reviews

### Admin Panel
- **Dashboard** — KPIs, revenue charts, operational alerts
- **Product Management** — CRUD with size/variant stock tracking
- **Order Management** — Full lifecycle with timeline and status updates
- **Shipment Management** — Create shipments, sync tracking with providers
- **Customer 360°** — Complete customer view with orders, returns, reviews
- **Coupon Builder** — Percentage, fixed, free shipping with usage limits
- **Returns & Refunds** — Inspection workflow with refund processing
- **Review Moderation** — Approve/reject with verified purchase badges
- **Settings** — Store, shipping, payments, tax, notifications, SEO
- **Audit Logs** — Immutable trail of all admin actions

### Platform
- **Server-Authoritative** — Backend validates all pricing, payments, and inventory
- **Firebase Auth** — Email/password + Google Sign-In with custom claims for admin
- **Webhook Processing** — Razorpay webhooks with HMAC verification and idempotency
- **Shipping Abstraction** — Provider-agnostic shipping with Delhivery and Shadowfax
- **Email Notifications** — Transactional emails via Nodemailer/SMTP
- **SEO Optimized** — Meta tags, OpenGraph, JSON-LD, sitemap, robots.txt
- **Responsive Design** — Mobile-first across all breakpoints (320px → 1440px+)
- **Accessibility** — Keyboard navigation, ARIA labels, semantic HTML, focus management

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 6, Vite 8, Tailwind CSS 4 |
| **Routing** | React Router v7 |
| **State** | Zustand 5 (cart/wishlist), React Context (auth) |
| **Forms** | React Hook Form 7 + Zod 4 |
| **Animations** | Framer Motion 13 |
| **Icons** | Lucide React, React Icons |
| **Backend** | Node.js, Express 5, TypeScript 7 |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Authentication |
| **Payments** | Razorpay (Custom Checkout) |
| **Shipping** | Delhivery, Shadowfax |
| **Email** | Nodemailer (SMTP) |
| **Security** | Helmet, CORS, Rate Limiting, HMAC |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- Firebase project ([create one](https://console.firebase.google.com/))
- Razorpay test account ([sign up](https://dashboard.razorpay.com/))

### 1. Clone & Install

```bash
git clone <repository-url>
cd Shoe

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configure Environment

```bash
# Backend — create backend/.env
# See docs/setup.md for full variable list

# Frontend — copy example
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your Firebase + Razorpay keys
```

### 3. Firebase Setup

1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable Email/Password + Google auth
3. Create Firestore database
4. Download service account key → `backend/serviceAccountKey.json`
5. Copy web config → `frontend/.env`

### 4. Run Development Servers

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open `http://localhost:5173` for the storefront.  
Open `http://localhost:5173/admin` for the admin panel.

---

## Documentation

| Document | Description |
|----------|-------------|
| **[Architecture](docs/ARCHITECTURE.md)** | System architecture, data flows, database schema, API routes |
| **[Deployment](docs/DEPLOYMENT.md)** | Production deployment, SSL, domain, monitoring |
| **[Render Guide](docs/RENDER_DEPLOYMENT.md)** | Step-by-step Render deployment |
| **[Setup](docs/setup.md)** | Local development setup, Firebase/Razorpay/Shipping configuration |
| **[Security Audit](docs/SECURITY_AUDIT.md)** | Security audit report with findings and fixes |
| **[Admin Architecture](docs/ADMIN_ARCHITECTURE.md)** | Admin panel specifications, section details, roles |
| **[Customer Architecture](docs/CUSTOMER_ARCHITECTURE.md)** | Customer-facing architecture, UX flows, SEO |
| **[Firestore Rules](firestore.rules)** | Firestore security rules |

---

## Project Structure

```
Shoe/
├── frontend/                    # React + Vite application
│   ├── src/
│   │   ├── components/ui/       # Reusable UI primitives
│   │   ├── features/            # Feature modules (auth, shop, cart, account, admin)
│   │   ├── layouts/             # Header, Footer, PageLayout, AdminLayout
│   │   ├── contexts/            # AuthContext (Firebase auth state)
│   │   ├── store/               # Zustand stores (cart, wishlist)
│   │   ├── services/            # API client layer (Axios)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Firebase client config
│   │   ├── types/               # TypeScript type definitions
│   │   └── utils/               # Utility functions
│   └── public/                  # Static assets
│
├── backend/                     # Express API server
│   ├── src/
│   │   ├── config/              # Firebase Admin SDK init
│   │   ├── middleware/           # Auth, rate limiting, error handling
│   │   ├── routes/              # API route definitions
│   │   ├── controllers/         # Request handlers
│   │   ├── services/            # Business logic (checkout, email, shipping, etc.)
│   │   ├── scripts/             # Admin tools (seed, set-admin)
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Utility functions
│   └── dist/                    # Compiled output
│
├── firestore.rules              # Firestore security rules
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # System architecture
│   ├── DEPLOYMENT.md            # Deployment guide
│   ├── RENDER_DEPLOYMENT.md     # Render deployment guide
│   ├── setup.md                 # Local setup guide
│   ├── SECURITY_AUDIT.md        # Security audit report
│   ├── ADMIN_ARCHITECTURE.md    # Admin architecture
│   └── CUSTOMER_ARCHITECTURE.md # Customer architecture
├── firestore.rules              # Firestore security rules
└── README.md                    # This file
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 8080) |
| `NODE_ENV` | Environment | No (default: development) |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to service account JSON | Yes* |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes* |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Yes* |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Yes* |
| `RAZORPAY_KEY_ID` | Razorpay key ID | Yes |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret | Yes |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification secret | Yes |
| `DELHIVERY_API_TOKEN` | Delhivery API token | No |
| `SHADOWFAX_API_KEY` | Shadowfax API key | No |
| `SMTP_HOST` | SMTP server host | No |
| `SMTP_PORT` | SMTP server port | No |
| `SMTP_USER` | SMTP username | No |
| `SMTP_PASSWORD` | SMTP password | No |
| `SMTP_FROM` | Sender email address | No |

*Use either `FIREBASE_SERVICE_ACCOUNT_PATH` OR the three individual `FIREBASE_*` variables.

### Frontend (`frontend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_FIREBASE_API_KEY` | Firebase web API key | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key | Yes |

---

## Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Ensure both frontend and backend build: `npm run build` in each
4. Test the full flow locally
5. Submit a pull request

### Code Standards

- **TypeScript** — Strict mode, no `any` types
- **Components** — Functional components with hooks
- **State** — Zustand for global state, Context for auth
- **Validation** — Zod schemas for all inputs (frontend + backend)
- **Security** — Never trust client input; validate everything server-side

### Commit Convention

```
feat: add product size management
fix: resolve checkout payment verification
docs: update architecture documentation
refactor: extract shipping provider abstraction
```

---

## License

Proprietary — All rights reserved.

---

Built with care by the SoleVault team.
