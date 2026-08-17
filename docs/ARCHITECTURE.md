# SoleVault — System Architecture

> **Version**: 2.0  
> **Last Updated**: August 2026  
> **Purpose**: Definitive architecture reference for the SoleVault shoe e-commerce platform. This is the single source of truth for system design decisions.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Schema (Firestore)](#5-database-schema-firestore)
6. [Payment Flow — Razorpay Custom Checkout](#6-payment-flow--razorpay-custom-checkout)
7. [Shipping Flow — Delhivery & Shadowfax](#7-shipping-flow--delhivery--shadowfax)
8. [Authentication Flow](#8-authentication-flow)
9. [Admin Architecture](#9-admin-architecture)
10. [Customer Architecture](#10-customer-architecture)
11. [Security Architecture](#11-security-architecture)
12. [Order Lifecycle State Machine](#12-order-lifecycle-state-machine)
13. [Implementation Status](#13-implementation-status)

---

## 1. System Overview

SoleVault is a production-grade shoe e-commerce platform built as a TypeScript monorepo. The system follows a **server-authoritative** architecture where the backend is the sole security boundary for pricing, payments, inventory, and business logic.

### Core Tenets

- **Backend is authoritative** — the frontend is an untrusted client. Prices, discounts, inventory, and payment amounts are always recalculated server-side.
- **Secrets stay server-side** — Razorpay keys, shipping API tokens, Firebase Admin credentials never touch the browser.
- **Size-level inventory** — stock is tracked per product + size combination, not per product.
- **Append-only audit trail** — every sensitive admin action creates an immutable audit record.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| **Routing** | React Router v7 |
| **State** | Zustand (cart, wishlist), React Context (auth) |
| **Forms** | React Hook Form + Zod validation |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Authentication |
| **Payments** | Razorpay (Custom Checkout) |
| **Shipping** | Delhivery + Shadowfax |
| **Email** | Nodemailer (SMTP) |
| **Security** | Helmet, CORS, Rate Limiting, HMAC |

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BROWSER (Client)                              │
│  ┌─────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │   CUSTOMER STOREFRONT       │  │   ADMIN PANEL                    │  │
│  │   React 19 + Vite + Tailwind│  │   React 19 + Vite + Tailwind    │  │
│  │   React Router v7           │  │   React Router v7                │  │
│  │                             │  │                                  │  │
│  │   State: Zustand (cart,     │  │   Protected by Firebase custom   │  │
│  │   wishlist), Context (auth) │  │   claims (admin: true)           │  │
│  │   Forms: RHF + Zod          │  │                                  │  │
│  └──────────────┬──────────────┘  └──────────────────┬───────────────┘  │
│                 │                                     │                 │
└─────────────────┼─────────────────────────────────────┼─────────────────┘
                  │ HTTP/HTTPS (Axios)                  │
                  ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS.JS BACKEND (Node.js)                        │
│                                                                         │
│  ┌───────────┐ ┌─────────────┐ ┌──────────────┐ ┌───────────────────┐  │
│  │Middleware  │ │ Controllers │ │   Services   │ │     Routes        │  │
│  │           │ │             │ │              │ │                   │  │
│  │• verifyId │ │ • admin     │ │ • checkout   │ │ • /api/admin/*    │  │
│  │  Token    │ │ • products  │ │ • email      │ │ • /api/products/* │  │
│  │• require  │ │ • checkout  │ │ • notification│ │ • /api/checkout/*│  │
│  │  Admin    │ │ • orders    │ │ • razorpay   │ │ • /api/orders/*   │  │
│  │• rateLimit│ │ • reviews   │ │ • product    │ │ • /api/reviews/*  │  │
│  │• error    │ │ • webhooks  │ │ • audit      │ │ • /api/wishlist/* │  │
│  │  Handler  │ │ • shipping  │ │ • shipping   │ │ • /api/auth/*     │  │
│  │           │ │ • coupons   │ │              │ │ • /api/webhooks/* │  │
│  │           │ │ • wishlist  │ │              │ │ • /api/coupons/*  │  │
│  │           │ │ • auth      │ │              │ │ • /api/addresses/*│  │
│  └───────────┘ └─────────────┘ └──────────────┘ └───────────────────┘  │
│                                                                         │
└────────┬──────────────┬──────────────┬──────────────┬───────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│  FIREBASE    │ │  RAZORPAY    │ │  DELHIVERY   │ │  SMTP /          │
│  Firestore   │ │  Payments    │ │  SHADOWFAX   │ │  NODEMAILER      │
│  Auth        │ │  Webhooks    │ │  Shipping    │ │  Email Service   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘
```

---

## 3. Frontend Architecture

### 3.1 Directory Structure

```
frontend/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component with routes
│   │
│   ├── components/
│   │   └── ui/                     # Reusable UI primitives
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── ProductCard.tsx
│   │       ├── StarRating.tsx
│   │       ├── Breadcrumb.tsx
│   │       ├── SearchModal.tsx
│   │       ├── NotFound.tsx
│   │       └── RecentlyViewed.tsx
│   │
│   ├── features/                   # Feature-based modules
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── GoogleOnboarding.tsx
│   │   │   └── RouteGuards.tsx
│   │   │
│   │   ├── shop/
│   │   │   ├── HomePage.tsx
│   │   │   ├── ShopPage.tsx
│   │   │   ├── ProductDetailPage.tsx
│   │   │   ├── ProductReviews.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   ├── TrackOrderPage.tsx
│   │   │   └── OrderConfirmationPage.tsx
│   │   │
│   │   ├── cart/
│   │   │   ├── CartPage.tsx
│   │   │   ├── CartDrawer.tsx
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── PaymentPage.tsx
│   │   │   └── OrderSuccessPage.tsx
│   │   │
│   │   ├── account/
│   │   │   ├── AccountPage.tsx
│   │   │   ├── AccountLayout.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── AddressesPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── OrderDetailPage.tsx
│   │   │   ├── WishlistPage.tsx
│   │   │   ├── ReviewsPage.tsx
│   │   │   ├── ReturnsPage.tsx
│   │   │   ├── NotificationsPage.tsx
│   │   │   └── NotificationCenter.tsx
│   │   │
│   │   ├── content/
│   │   │   ├── AboutPage.tsx
│   │   │   ├── ContactPage.tsx
│   │   │   ├── FaqPage.tsx
│   │   │   └── PolicyPage.tsx
│   │   │
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       ├── AdminProducts.tsx
│   │       ├── AdminProductForm.tsx
│   │       ├── AdminInventory.tsx
│   │       ├── AdminOrders.tsx
│   │       ├── AdminOrderDetail.tsx
│   │       ├── AdminShipments.tsx
│   │       ├── AdminCustomers.tsx
│   │       ├── AdminCustomerDetail.tsx
│   │       ├── AdminCoupons.tsx
│   │       ├── AdminReturns.tsx
│   │       ├── AdminRefunds.tsx
│   │       ├── AdminReviews.tsx
│   │       ├── AdminPayments.tsx
│   │       ├── AdminMarketing.tsx
│   │       ├── AdminAnalytics.tsx
│   │       ├── AdminSettings.tsx
│   │       ├── AdminAuditLogs.tsx
│   │       ├── AdminUsers.tsx
│   │       ├── AdminCatalogSettings.tsx
│   │       ├── AdminCodSettings.tsx
│   │       └── NotificationLogs.tsx
│   │
│   ├── layouts/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── PageLayout.tsx
│   │   └── AdminLayout.tsx
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx          # Firebase auth state
│   │
│   ├── store/
│   │   ├── cartStore.ts             # Zustand cart store
│   │   └── wishlistStore.ts         # Zustand wishlist store
│   │
│   ├── services/                    # API client layer
│   │   ├── api.ts                   # Axios instance
│   │   ├── auth.ts
│   │   ├── productService.ts
│   │   ├── orderService.ts
│   │   ├── checkoutService.ts
│   │   ├── reviewService.ts
│   │   ├── wishlistService.ts
│   │   └── notificationService.ts
│   │
│   ├── hooks/
│   │   └── useRecentlyViewed.ts
│   │
│   ├── lib/
│   │   └── firebase.ts              # Firebase client config
│   │
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript types
│   │
│   └── utils/
│       └── cn.ts                    # clsx + tailwind-merge utility
│
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── robots.txt
│   └── sitemap.xml
│
├── .env.example
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── package.json
```

### 3.2 State Management

| Store | Purpose | Persistence |
|-------|---------|-------------|
| **Zustand Cart** (`cartStore.ts`) | Cart items, quantities, totals | `localStorage` |
| **Zustand Wishlist** (`wishlistStore.ts`) | Wishlist product IDs | `localStorage` |
| **Auth Context** (`AuthContext.tsx`) | Firebase auth state, user profile | Firebase SDK |

### 3.3 Routing Architecture

```
PUBLIC ROUTES
  /                          → HomePage
  /shop                      → ShopPage (filters, sort, pagination)
  /shop/:slug                → ProductDetailPage
  /search?q=                 → SearchPage
  /login                     → LoginPage
  /signup                    → SignupPage
  /forgot-password           → ForgotPasswordPage
  /about, /contact, /faq     → Content pages
  /shipping-policy, etc.     → PolicyPage
  /track-order               → TrackOrderPage

PROTECTED ROUTES (Auth Required)
  /cart                      → CartPage
  /checkout                  → CheckoutPage
  /order-confirmation/:id    → OrderConfirmationPage
  /account/*                 → AccountLayout
    /account                 → AccountPage (overview)
    /account/profile         → ProfilePage
    /account/addresses       → AddressesPage
    /account/orders          → OrdersPage
    /account/orders/:id      → OrderDetailPage
    /account/wishlist        → WishlistPage
    /account/reviews         → ReviewsPage
    /account/returns         → ReturnsPage
    /account/notifications   → NotificationsPage

ADMIN ROUTES (Admin Claim Required)
  /admin                     → AdminDashboard
  /admin/products            → AdminProducts
  /admin/products/add        → AdminProductForm
  /admin/inventory           → AdminInventory
  /admin/orders              → AdminOrders
  /admin/orders/:id          → AdminOrderDetail
  /admin/shipments           → AdminShipments
  /admin/customers           → AdminCustomers
  /admin/customers/:id       → AdminCustomerDetail
  /admin/coupons             → AdminCoupons
  /admin/returns             → AdminReturns
  /admin/refunds             → AdminRefunds
  /admin/reviews             → AdminReviews
  /admin/payments            → AdminPayments
  /admin/marketing           → AdminMarketing
  /admin/analytics           → AdminAnalytics
  /admin/settings            → AdminSettings
  /admin/audit-logs          → AdminAuditLogs
  /admin/notification-logs   → NotificationLogs
  /admin/catalog-settings    → AdminCatalogSettings
```

---

## 4. Backend Architecture

### 4.1 Directory Structure

```
backend/
├── src/
│   ├── index.ts                  # Express app entry point
│   │
│   ├── config/
│   │   └── firebase.ts           # Firebase Admin SDK init
│   │
│   ├── middleware/
│   │   ├── verifyIdToken.ts      # Firebase ID token verification
│   │   ├── requireAdmin.ts       # Admin custom claims check
│   │   ├── rateLimiter.ts        # API + Admin rate limiting
│   │   └── errorHandler.ts       # Global error handler
│   │
│   ├── routes/
│   │   ├── auth.ts               # /api/auth/*
│   │   ├── products.ts           # /api/products/*
│   │   ├── checkout.ts           # /api/checkout/*
│   │   ├── orders.ts             # /api/orders/*
│   │   ├── reviews.ts            # /api/reviews/*
│   │   ├── wishlist.ts           # /api/wishlist/*
│   │   ├── coupons.ts            # /api/coupons/*
│   │   ├── notifications.ts      # /api/notifications/*
│   │   ├── addresses.ts          # /api/addresses/*
│   │   ├── webhooks.ts           # /api/webhooks/*
│   │   └── admin.ts              # /api/admin/*
│   │
│   ├── controllers/
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   ├── checkout.ts
│   │   ├── orders.ts
│   │   ├── reviews.ts
│   │   ├── wishlist.ts
│   │   ├── coupons.ts
│   │   ├── notifications.ts
│   │   ├── addresses.ts
│   │   ├── webhooks.ts
│   │   ├── shipping.ts
│   │   └── admin.ts
│   │
│   ├── services/
│   │   ├── checkout.ts           # Checkout orchestration
│   │   ├── razorpay.ts           # Razorpay API client
│   │   ├── email.ts              # Nodemailer email service
│   │   ├── notification.ts       # Notification dispatch
│   │   ├── auditService.ts       # Audit log writer
│   │   ├── product.ts            # Product business logic
│   │   └── shipping/
│   │       ├── index.ts          # Shipping provider abstraction
│   │       ├── types.ts          # Shipping interfaces
│   │       ├── delhiveryProvider.ts
│   │       └── shadowfaxProvider.ts
│   │
│   ├── scripts/
│   │   ├── seedProducts.ts       # Database seeder
│   │   └── setAdmin.ts           # Admin claim setter
│   │
│   ├── types/
│   │   ├── index.ts              # Shared types
│   │   └── auth.ts               # Auth types
│   │
│   └── utils/
│       └── adminClaim.ts         # Admin claim utilities
│
├── dist/                          # Compiled output
├── tsconfig.json
└── package.json
```

### 4.2 API Routes Map

#### Public Routes
```
GET    /api/health                     — Health check
GET    /api/products                   — List products (filters, sort, pagination)
GET    /api/products/:slug             — Single product by slug
GET    /api/products/featured          — Featured products
GET    /api/products/new-arrivals      — New arrivals
GET    /api/products/search            — Search products
POST   /api/auth/register              — Create user profile
POST   /api/auth/google-signin         — Google auth + profile
GET    /api/auth/me                    — Current user profile
POST   /api/webhooks                   — Razorpay webhook (raw body)
```

#### Protected Routes (Auth Required)
```
POST   /api/checkout/validate          — Validate cart
POST   /api/checkout/create-order      — Create Razorpay order
POST   /api/checkout/verify            — Verify payment signature
GET    /api/orders                     — User's orders
GET    /api/orders/:id                 — Order detail
POST   /api/orders/:id/cancel          — Cancel order
GET    /api/reviews/product/:productId — Product reviews
POST   /api/reviews                    — Submit review
PUT    /api/reviews/:id                — Edit review
DELETE /api/reviews/:id                — Delete review
GET    /api/wishlist                   — User's wishlist
POST   /api/wishlist                   — Add to wishlist
DELETE /api/wishlist/:productId        — Remove from wishlist
POST   /api/coupons/apply              — Apply coupon
GET    /api/coupons/validate/:code     — Validate coupon
GET    /api/notifications              — User's notifications
PUT    /api/notifications/:id/read     — Mark as read
PUT    /api/notifications/read-all     — Mark all as read
GET    /api/addresses                  — User's addresses
POST   /api/addresses                  — Add address
PUT    /api/addresses/:id              — Update address
DELETE /api/addresses/:id              — Delete address
```

#### Admin Routes (Admin Claim Required)
```
GET    /api/admin/metrics              — Dashboard KPIs
GET    /api/admin/audit-logs           — Audit trail
GET    /api/admin/products             — All products
POST   /api/admin/products             — Create product
PUT    /api/admin/products/:id         — Update product
DELETE /api/admin/products/:id         — Delete product
GET    /api/admin/orders               — All orders
PUT    /api/admin/orders/:id/status    — Update order status
POST   /api/admin/orders/:orderId/shipment     — Create shipment
GET    /api/admin/orders/:orderId/shipment/sync — Sync tracking
GET    /api/admin/customers            — All customers
GET    /api/admin/coupons              — All coupons
POST   /api/admin/coupons              — Create coupon
PUT    /api/admin/coupons/:id          — Update coupon
GET    /api/admin/returns              — All returns
PUT    /api/admin/returns/:id/status   — Update return status
GET    /api/admin/refunds              — All refunds
GET    /api/admin/reviews              — All reviews
PUT    /api/admin/reviews/:id/status   — Approve/reject review
GET    /api/admin/settings             — Store settings
PUT    /api/admin/settings             — Update settings
GET    /api/admin/notification-logs    — Notification logs
```

### 4.3 Middleware Pipeline

```
Request → Helmet (CSP, headers) → CORS → Rate Limiter
  → [Webhook routes: raw body parser]
  → JSON body parser (1mb limit)
  → Morgan (logging)
  → Route matching
  → verifyIdToken (protected routes)
  → requireAdmin (admin routes)
  → Controller → Service → Firestore
  → errorHandler (catch-all)
```

---

## 5. Database Schema (Firestore)

### Collections

```
Firestore
├── users/{userId}
│   ├── displayName, email, phone, photoURL
│   ├── addresses[]
│   ├── role: customer | admin
│   └── createdAt, updatedAt
│
├── products/{productId}
│   ├── name, slug, brand, sku
│   ├── shortDescription, fullDescription
│   ├── sellingPrice, discountPrice, taxPercent
│   ├── images[]
│   ├── category, collection, tags[]
│   ├── sizes[]                          ← Per-size stock tracking
│   │   └── { size, sku, stock, reorderLevel, status }
│   ├── material, careInstructions, fit
│   ├── seoTitle, seoDescription
│   ├── isFeatured, isNewArrival, isActive
│   ├── rating, reviewCount
│   └── createdAt, updatedAt
│
├── orders/{orderId}
│   ├── orderNumber (SV-XXXXX)
│   ├── userId, customerInfo{}
│   ├── items[] (snapshot at order time)
│   ├── shippingAddress{}
│   ├── subtotal, shippingFee, tax, discount, total
│   ├── couponCode, couponDiscount
│   ├── paymentId, paymentStatus
│   ├── status (PLACED → DELIVERED flow)
│   ├── shipmentId, awb, courier, trackingUrl
│   ├── timeline[] (status + timestamp events)
│   └── createdAt, updatedAt
│
├── payments/{paymentId}
│   ├── orderId, userId
│   ├── razorpayOrderId, razorpayPaymentId
│   ├── amount, method, currency
│   ├── status (CREATED → CAPTURED → REFUNDED)
│   └── createdAt
│
├── shipments/{shipmentId}
│   ├── orderId
│   ├── provider (delhivery | shadowfax)
│   ├── awb, courier, trackingUrl
│   ├── status (PENDING → DELIVERED)
│   ├── weight, dimensions
│   └── createdAt, updatedAt
│
├── returns/{returnId}
│   ├── orderId, userId
│   ├── items[] (product, size, quantity, reason)
│   ├── status (REQUESTED → COMPLETED flow)
│   ├── inspectionNotes, condition
│   └── createdAt, updatedAt
│
├── refunds/{refundId}
│   ├── orderId, paymentId, userId
│   ├── amount, reason
│   ├── status (REQUESTED → PROCESSED)
│   ├── initiatedBy (admin uid)
│   └── createdAt, processedAt
│
├── reviews/{reviewId}
│   ├── productId, userId
│   ├── rating (1-5), title, body, imageUrl
│   ├── isVerifiedPurchase
│   ├── status (PENDING → APPROVED / REJECTED)
│   └── createdAt, updatedAt
│
├── wishlists/{userId}
│   └── items[] (productId, addedAt)
│
├── notifications/{notificationId}
│   ├── userId, event, channel (email/sms/push)
│   ├── status (SUCCESS / FAILED)
│   ├── orderId (if applicable)
│   └── createdAt
│
├── coupons/{couponId}
│   ├── code, type (percentage | fixed | free_shipping)
│   ├── value, maxDiscount
│   ├── minCartValue, firstOrderOnly
│   ├── productRestrictions[], categoryRestrictions[]
│   ├── usageLimit, perCustomerLimit, usedCount
│   ├── startDate, endDate
│   ├── status (ACTIVE | PAUSED | INACTIVE)
│   └── createdAt, updatedAt
│
├── settings/{settingId}
│   ├── store{}, shipping{}, payments{}, tax{}
│   ├── notifications{}, seo{}
│   └── updatedAt
│
├── auditLogs/{logId}
│   ├── adminUid, adminName, action
│   ├── entityType, entityId
│   ├── oldValue{}, newValue{}
│   ├── ipAddress, timestamp, result
│   └── createdAt
│
└── catalogSettings/{settingId}
    ├── categories[]
    ├── collections[]
    ├── brands[]
    └── updatedAt
```

---

## 6. Payment Flow — Razorpay Custom Checkout

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Customer │     │ Frontend │     │ Backend  │     │ Razorpay │
│ Browser  │     │ React    │     │ Express  │     │ API      │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Click Checkout │                │                │
     │ ──────────────>│                │                │
     │                │ POST /validate │                │
     │                │ ──────────────>│                │
     │                │                │ Validate cart  │
     │                │ <──────────────│                │
     │                │                │                │
     │                │ POST /create-order              │
     │                │ ──────────────>│                │
     │                │                │ Calculate total│
     │                │                │ Create order   │
     │                │                │ ──────────────>│
     │                │                │ <──────────────│
     │                │ <──────────────│ order_id       │
     │                │                │                │
     │ Razorpay Modal │                │                │
     │ <──────────────│                │                │
     │                │                │                │
     │ Enter Payment  │                │                │
     │ ────────────────────────────────────────────────>│
     │                │                │                │
     │ Payment OK     │                │                │
     │ <────────────────────────────────────────────────│
     │                │                │                │
     │ Send Signature │                │                │
     │ ──────────────>│                │                │
     │                │ POST /verify   │                │
     │                │ ──────────────>│                │
     │                │                │ HMAC verify    │
     │                │                │                │
     │                │                │ Create order   │
     │                │                │ Deduct stock   │
     │                │                │ Send email     │
     │                │                │ Create shipment│
     │                │ <──────────────│                │
     │ <──────────────│ orderId        │                │
     │                │                │                │
     └────────────────┘                └────────────────┘
                                           │
                               ┌───────────▼───────────┐
                               │ RAZORPAY WEBHOOK      │
                               │ POST /api/webhooks    │
                               │ • payment.captured    │
                               │ • order.paid          │
                               │ • refund.processed    │
                               │ • refund.failed       │
                               │                       │
                               │ Idempotency check     │
                               │ HMAC verification     │
                               │ Firestore transaction │
                               └───────────────────────┘
```

### Key Security Rules
- Backend **recalculates** the total — never trusts the client amount
- HMAC signature verification on `/verify` endpoint
- Webhook HMAC verification with idempotency checks
- Razorpay secret keys are **never** exposed to the frontend

---

## 7. Shipping Flow — Delhivery & Shadowfax

### Provider Abstraction

The backend uses a **shipping provider abstraction** pattern:

```typescript
// services/shipping/index.ts
interface ShippingProvider {
  createShipment(order: Order): Promise<ShipmentResult>;
  trackShipment(awb: string): Promise<TrackingResult>;
  cancelShipment(awb: string): Promise<void>;
}
```

### Providers
- **Delhivery** (`delhiveryProvider.ts`) — Primary provider for standard deliveries
- **Shadowfax** (`shadowfaxProvider.ts`) — Secondary provider for express/hyperlocal

### Flow

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ Admin    │     │ Backend  │     │  Delhivery   │     │  Shadowfax   │
│ Panel    │     │ Express  │     │  API         │     │  API         │
└────┬─────┘     └────┬─────┘     └──────┬───────┘     └──────┬───────┘
     │                │                  │                    │
     │ Create         │                  │                    │
     │ Shipment       │                  │                    │
     │ ──────────────>│                  │                    │
     │                │ Select Provider  │                    │
     │                │ ─────────────────┤                    │
     │                │                  │                    │
     │                │ AWB Generated    │                    │
     │                │ <────────────────┤                    │
     │                │                  │                    │
     │ <──────────────│ AWB + Courier    │                    │
     │                │                  │                    │
     │ Sync Tracking  │                  │                    │
     │ ──────────────>│                  │                    │
     │                │ Get Status       │                    │
     │                │ ─────────────────┤                    │
     │                │ <────────────────┤                    │
     │ <──────────────│ Updated Status   │                    │
     └────────────────┘                  └────────────────────┘
```

---

## 8. Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Browser  │     │ Frontend │     │ Backend  │     │ Firebase │
│          │     │ React    │     │ Express  │     │ Auth     │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Email/Password │                │                │
     │ ──────────────>│                │                │
     │                │ signInWith...  │                │
     │                │ ───────────────────────────────>│
     │                │ <───────────────────────────────│
     │                │ ID Token       │                │
     │                │                │                │
     │                │ GET /auth/me   │                │
     │                │ ──────────────>│                │
     │                │                │ verifyIdToken  │
     │                │                │ ──────────────>│
     │                │                │ <──────────────│
     │                │                │ uid + claims   │
     │                │ User Profile   │                │
     │                │ <──────────────│                │
     │ <──────────────│ Session        │                │
     └────────────────┘                └────────────────┘
```

### Auth Methods
- **Email/Password** — standard Firebase auth
- **Google Sign-In** — OAuth flow with profile creation

### Admin Access
- Frontend sends Firebase ID token in `Authorization: Bearer <token>` header
- Backend `verifyIdToken` middleware verifies the token against Firebase Admin SDK
- `requireAdmin` middleware checks for custom claim `admin: true`
- Admin routes protected by `RouteGuards` component on frontend

---

## 9. Admin Architecture

### Admin Panel Sections

| Section | Purpose |
|---------|---------|
| **Dashboard** | KPIs, revenue charts, operational alerts |
| **Products** | CRUD with size/variant management |
| **Inventory** | Stock overview, low stock alerts, adjustments |
| **Orders** | List, detail, status management, timeline |
| **Shipments** | Create, track, sync with providers |
| **Customers** | List, 360° customer view |
| **Payments** | Transaction history, reconciliation |
| **Coupons** | Builder, analytics, scheduling |
| **Returns** | Request management, inspection workflow |
| **Refunds** | Initiation, tracking |
| **Reviews** | Moderation (approve/reject) |
| **Marketing** | Homepage banners, featured products |
| **Analytics** | Sales, products, customers, shipping reports |
| **Settings** | Store, shipping, payments, tax, notifications, SEO |
| **Admin Users** | Role-based access control |
| **Audit Logs** | Immutable action trail |

### Admin Roles

| Role | Permissions |
|------|-------------|
| SUPER_ADMIN | Everything |
| ADMIN | Everything except Admin Users |
| ORDER_MANAGER | Orders, Shipments, Returns, Refunds |
| INVENTORY_MANAGER | Products, Inventory |
| CONTENT_MANAGER | Marketing, Content, SEO |
| SUPPORT | Customers, Orders (view), Returns |

---

## 10. Customer Architecture

### Customer Journey

```
Browse → Product → Add to Cart → Cart → Login (if not)
  → Address → Shipping → Coupon (optional)
  → Server Validation → Razorpay Order Created
  → Razorpay Checkout → Payment
  → HMAC Signature Verification
  → Webhook → Order Confirmed
  → Inventory Deducted → Shipment Created
  → Delhivery / Shadowfax → AWB
  → Tracking Updates → Out for Delivery → Delivered
  → Review Option → (Potential Return → Refund)
```

### Customer Account Sections
- Overview (stats)
- Profile management
- Order history + detail
- Address book
- Wishlist
- Reviews
- Returns
- Notifications

---

## 11. Security Architecture

```
Browser → HTTPS → CORS → Helmet/CSP → Rate Limiting
  → Firebase ID Token → Authorization → Controller → Service → Firestore
```

### Security Layers

1. **Transport** — HTTPS enforced
2. **Headers** — Helmet.js (CSP, HSTS, X-Frame-Options)
3. **CORS** — Restricted to `FRONTEND_URL`
4. **Rate Limiting** — Separate limits for API and Admin routes
5. **Authentication** — Firebase ID tokens verified server-side
6. **Authorization** — Custom claims for admin access
7. **Input Validation** — Zod schemas on all inputs
8. **Webhook Security** — HMAC signature verification, timing-safe comparison
9. **Data Isolation** — Customer A cannot access Customer B's data
10. **Secret Management** — All secrets in environment variables, never in code

---

## 12. Order Lifecycle State Machine

```
                              ┌─────────────┐
                              │   PLACED     │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                 ┌────────────│  CONFIRMED   │────────────┐
                 │            └──────┬──────┘            │
                 │                   │                   │
          ┌──────▼──────┐     ┌──────▼──────┐    ┌──────▼──────┐
          │  CANCELLED   │     │ PROCESSING  │    │PAYMENT_     │
          └─────────────┘     └──────┬──────┘    │FAILED       │
                                     │           └─────────────┘
                              ┌──────▼──────┐
                              │   PACKED     │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │ SHIPMENT_    │
                              │ CREATED      │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │  SHIPPED     │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │OUT_FOR_      │
                              │DELIVERY      │
                              └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
             ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
             │ DELIVERED    │ │  RETURN_    │ │    RTO      │
             └──────┬──────┘ │  REQUESTED  │ └─────────────┘
                    │        └──────┬──────┘
             ┌──────▼──────┐ ┌──────▼──────┐
             │  RETURN_    │ │ RETURN_     │
             │  REQUESTED  │ │ APPROVED    │
             └─────────────┘ └──────┬──────┘
                                    │
                             ┌──────▼──────┐
                             │ PICKUP_     │
                             │ PENDING     │
                             └──────┬──────┘
                                    │
                             ┌──────▼──────┐
                             │  RECEIVED   │
                             └──────┬──────┘
                                    │
                             ┌──────▼──────┐
                             │  INSPECTED  │
                             └──────┬──────┘
                                    │
                    ┌────────────────┼────────────────┐
                    │                                 │
             ┌──────▼──────┐                   ┌──────▼──────┐
             │ REFUND_     │                   │  RETURN_    │
             │ PENDING     │                   │  REJECTED   │
             └──────┬──────┘                   └─────────────┘
                    │
             ┌──────▼──────┐
             │  REFUNDED   │
             └──────┬──────┘
                    │
             ┌──────▼──────┐
             │  COMPLETED  │
             └─────────────┘
```

---

## 13. Implementation Status

| Feature Area | Backend | Frontend | Status |
|-------------|---------|----------|--------|
| Dashboard | ✅ Basic | ✅ Basic | ⚠ Improve |
| Products — List | ✅ | ✅ | ⚠ Filters |
| Products — Add | ✅ | ✅ Basic | ⚠ Size form |
| Products — Edit | ✅ | ✅ | ✅ Done |
| Products — Sizes | ❌ | ❌ | 🔴 Critical |
| Inventory | ❌ | ❌ | 🔴 Critical |
| Orders — List | ✅ | ✅ | ⚠ Filters |
| Orders — Detail | ❌ | ✅ | ⚠ Backend |
| Shipments | ✅ Part | ✅ | ⚠ Complete |
| Customers — List | ✅ | ✅ | ⚠ Detail |
| Customers — Detail | ❌ | ✅ | ⚠ Backend |
| Payments | ❌ | ✅ | ⚠ Backend |
| Coupons | ✅ | ✅ | ✅ Working |
| Returns | ✅ | ✅ | ✅ Working |
| Refunds | ✅ Part | ✅ | ⚠ Complete |
| Reviews | ✅ | ✅ | ✅ Working |
| Notifications | ✅ | ✅ | ✅ Working |
| Marketing | ❌ | ✅ | ⚠ Backend |
| Analytics | ❌ | ✅ | ⚠ Backend |
| Settings | ✅ | ✅ | ✅ Working |
| Admin Users / Roles | ❌ | ❌ | 🔴 Missing |
| Audit Logs | ✅ | ✅ | ✅ Working |
| Catalog Settings | ❌ | ✅ | ⚠ Backend |

---

*This document is the single source of truth for system architecture. Update when architecture changes.*
