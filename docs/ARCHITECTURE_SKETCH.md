# SoleVault — Architecture Sketch & System Overview

> **Generated**: August 2026
> **Purpose**: Visual system map of the entire SoleVault shoe e-commerce platform

---

## 1. HIGH-LEVEL SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BROWSER (Client)                                  │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │   CUSTOMER STOREFRONT        │  │   ADMIN PANEL                        │ │
│  │   React 19 + Vite + Tailwind │  │   React 19 + Vite + Tailwind        │ │
│  │   React Router v7            │  │   React Router v7                    │ │
│  │                              │  │                                      │ │
│  │   Pages:                     │  │   Pages:                             │ │
│  │   • Home                     │  │   • Dashboard                        │ │
│  │   • Shop / Search            │  │   • Products (CRUD + Sizes)          │ │
│  │   • Product Detail           │  │   • Inventory (Stock Management)     │ │
│  │   • Cart / Checkout          │  │   • Orders (List + Detail)           │ │
│  │   • Auth (Login/Signup)      │  │   • Shipments                        │ │
│  │   • Account (Orders, etc.)   │  │   • Customers (360 View)             │ │
│  │   • Wishlist                 │  │   • Coupons                          │ │
│  │   • Content Pages            │  │   • Returns / Refunds                │ │
│  │                              │  │   • Reviews                          │ │
│  │   State: Zustand (cart,      │  │   • Payments                         │ │
│  │   wishlist), Context (auth)  │  │   • Marketing / Analytics            │ │
│  │   Forms: React Hook Form+Zod │  │   • Settings / Audit Logs            │ │
│  └──────────────┬───────────────┘  └──────────────────┬───────────────────┘ │
│                 │                                      │                    │
└─────────────────┼──────────────────────────────────────┼────────────────────┘
                  │ HTTP/HTTPS (Axios)                   │
                  ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS.JS BACKEND (Node.js)                         │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │ Middleware   │ │ Controllers │ │   Services   │ │     Routes          │  │
│  │             │ │             │ │              │ │                     │  │
│  │ • verifyId  │ │ • admin     │ │ • checkout   │ │ • /api/admin/*      │  │
│  │   Token     │ │ • products  │ │ • email      │ │ • /api/products/*   │  │
│  │ • require   │ │ • checkout  │ │ • notification│ │ • /api/checkout/*   │  │
│  │   Admin     │ │ • orders    │ │ • razorpay   │ │ • /api/orders/*     │  │
│  │ • rateLimit │ │ • reviews   │ │ • product    │ │ • /api/reviews/*    │  │
│  │ • errorHandler│ │ • webhooks │ │ • audit      │ │ • /api/wishlist/*   │  │
│  │             │ │ • shipping  │ │ • shipping   │ │ • /api/auth/*       │  │
│  │             │ │ • coupons   │ │              │ │ • /api/webhooks/*   │  │
│  │             │ │ • wishlist  │ │              │ │ • /api/notifications│  │
│  │             │ │ • auth      │ │              │ │ • /api/coupons/*    │  │
│  └─────────────┘ └─────────────┘ └──────────────┘ └─────────────────────┘  │
│                                                                             │
└─────────┬──────────────┬──────────────┬──────────────┬──────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│  FIREBASE    │ │  RAZORPAY    │ │  SHIPROCKET  │ │  SMTP / NODEMAILER  │
│  Firestore   │ │  Payments    │ │  DELHIVERY   │ │  Email Service      │
│  Auth        │ │  Webhooks    │ │  Shipping    │ │                     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────┘
```

---

## 2. FRONTEND COMPONENT TREE

```
App.tsx
├── AuthProvider (Context)
│   ├── Header (Logo, Nav, Search, Account, Wishlist, Cart Badge, Notifications)
│   ├── Routes
│   │   ├── PUBLIC ROUTES
│   │   │   ├── / → HomePage
│   │   │   │   ├── Hero Section
│   │   │   │   ├── Featured Products (ProductCard[])
│   │   │   │   ├── New Arrivals (ProductCard[])
│   │   │   │   ├── Collections Grid
│   │   │   │   ├── Promotional Banners
│   │   │   │   ├── Brand Story
│   │   │   │   └── Newsletter
│   │   │   │
│   │   │   ├── /shop → ShopPage
│   │   │   │   ├── Filters Sidebar (Category, Size, Price, Brand, Availability)
│   │   │   │   ├── Sort Dropdown
│   │   │   │   ├── ProductCard Grid
│   │   │   │   └── Pagination
│   │   │   │
│   │   │   ├── /shop/:slug → ProductDetailPage
│   │   │   │   ├── Image Gallery (Lightbox, Zoom, Swipe)
│   │   │   │   ├── Size Selector
│   │   │   │   ├── Add to Cart / Buy Now / Wishlist
│   │   │   │   ├── Product Tabs (Description, Materials, Shipping)
│   │   │   │   ├── Reviews Section (ProductReviews)
│   │   │   │   └── Related Products
│   │   │   │
│   │   │   ├── /search?q= → SearchPage
│   │   │   ├── /login → LoginPage
│   │   │   ├── /signup → SignupPage
│   │   │   ├── /forgot-password → ForgotPasswordPage
│   │   │   ├── /about → AboutPage
│   │   │   ├── /contact → ContactPage
│   │   │   ├── /faq → FaqPage
│   │   │   ├── /shipping-policy → PolicyPage
│   │   │   ├── /return-policy → PolicyPage
│   │   │   ├── /privacy-policy → PolicyPage
│   │   │   ├── /terms → PolicyPage
│   │   │   └── /track-order → TrackOrderPage
│   │   │
│   │   ├── PROTECTED ROUTES (Auth Required)
│   │   │   ├── /cart → CartPage
│   │   │   ├── /checkout → CheckoutPage
│   │   │   ├── /order-confirmation/:id → OrderConfirmationPage
│   │   │   ├── /account → AccountLayout
│   │   │   │   ├── /account → AccountPage (Overview)
│   │   │   │   ├── /account/profile → ProfilePage
│   │   │   │   ├── /account/addresses → AddressesPage
│   │   │   │   ├── /account/orders → OrdersPage
│   │   │   │   ├── /account/orders/:id → OrderDetailPage
│   │   │   │   ├── /account/wishlist → WishlistPage
│   │   │   │   ├── /account/reviews → ReviewsPage
│   │   │   │   ├── /account/returns → ReturnsPage
│   │   │   │   └── /account/notifications → NotificationsPage
│   │   │   └── /order-success → OrderSuccessPage
│   │   │
│   │   └── ADMIN ROUTES (Admin Claim Required)
│   │       ├── /admin → AdminDashboard
│   │       ├── /admin/products → AdminProducts
│   │       ├── /admin/products/add → AdminProductForm
│   │       ├── /admin/inventory → AdminInventory
│   │       ├── /admin/orders → AdminOrders
│   │       ├── /admin/orders/:id → AdminOrderDetail
│   │       ├── /admin/shipments → AdminShipments
│   │       ├── /admin/customers → AdminCustomers
│   │       ├── /admin/customers/:id → AdminCustomerDetail
│   │       ├── /admin/coupons → AdminCoupons
│   │       ├── /admin/returns → AdminReturns
│   │       ├── /admin/refunds → AdminRefunds
│   │       ├── /admin/reviews → AdminReviews
│   │       ├── /admin/payments → AdminPayments
│   │       ├── /admin/marketing → AdminMarketing
│   │       ├── /admin/analytics → AdminAnalytics
│   │       ├── /admin/settings → AdminSettings
│   │       ├── /admin/audit-logs → AdminAuditLogs
│   │       ├── /admin/notification-logs → NotificationLogs
│   │       └── /admin/catalog-settings → AdminCatalogSettings
│   │
│   └── Footer
│
├── CartDrawer (Side Drawer Overlay)
├── SearchModal (Search Overlay)
└── NotFound (404 Page)
```

---

## 3. BACKEND API ROUTES MAP

```
/api
├── /auth
│   ├── POST /register          — Create user profile in Firestore
│   ├── POST /google-signin     — Handle Google auth + profile creation
│   └── GET  /me                — Get current user profile
│
├── /products
│   ├── GET  /                  — List products (with filters, sort, pagination)
│   ├── GET  /:slug             — Get single product by slug
│   ├── GET  /featured          — Featured products
│   ├── GET  /new-arrivals      — New arrivals
│   └── GET  /search            — Search products
│
├── /checkout
│   ├── POST /validate          — Validate cart before checkout
│   ├── POST /create-order      — Create Razorpay order
│   └── POST /verify            — Verify Razorpay payment signature
│
├── /orders
│   ├── GET  /                  — Get user's orders
│   ├── GET  /:id               — Get single order detail
│   └── POST /:id/cancel        — Cancel order
│
├── /reviews
│   ├── GET  /product/:productId — Get reviews for product
│   ├── POST /                  — Submit review (auth required)
│   ├── PUT  /:id               — Edit review
│   └── DELETE /:id             — Delete review
│
├── /wishlist
│   ├── GET  /                  — Get user's wishlist
│   ├── POST /                  — Add to wishlist
│   └── DELETE /:productId      — Remove from wishlist
│
├── /coupons
│   ├── POST /apply             — Apply coupon to cart
│   └── GET  /validate/:code    — Validate coupon code
│
├── /notifications
│   ├── GET  /                  — Get user's notifications
│   ├── PUT  /:id/read          — Mark as read
│   └── PUT  /read-all          — Mark all as read
│
├── /webhooks
│   └── POST /razorpay          — Razorpay webhook handler
│
└── /admin
    ├── GET  /metrics            — Dashboard KPIs
    ├── GET  /audit-logs         — Audit trail
    │
    ├── /products
    │   ├── GET  /               — List all products
    │   ├── POST /               — Create product
    │   ├── PUT  /:id            — Update product
    │   └── DELETE /:id          — Delete product
    │
    ├── /orders
    │   ├── GET  /               — List all orders
    │   ├── PUT  /:id/status     — Update order status
    │   ├── POST /:orderId/shipment — Create shipment
    │   └── GET  /:orderId/shipment/sync — Sync tracking
    │
    ├── /customers
    │   ├── GET  /               — List customers
    │   └── GET  /:id            — Customer 360 view
    │
    ├── /coupons
    │   ├── GET  /               — List coupons
    │   ├── POST /               — Create coupon
    │   └── PUT  /:id            — Update coupon
    │
    ├── /returns
    │   ├── GET  /               — List returns
    │   └── PUT  /:id/status     — Update return status
    │
    ├── /refunds
    │   ├── GET  /               — List refunds
    │   └── POST /               — Initiate refund
    │
    ├── /reviews
    │   ├── GET  /               — List all reviews
    │   └── PUT  /:id/status     — Approve/reject review
    │
    ├── /settings
    │   ├── GET  /               — Get store settings
    │   └── PUT  /               — Update settings
    │
    ├── /notification-logs
    │   └── GET  /               — Notification delivery logs
    │
    ├── /inventory ❌ (NOT YET)
    │   ├── GET  /               — All SKU-level stock
    │   ├── GET  /low-stock      — Low stock items
    │   ├── POST /adjust         — Stock adjustment
    │   └── GET  /history        — Adjustment history
    │
    ├── /payments ❌ (NOT YET)
    │   └── GET  /               — Payment transactions
    │
    ├── /marketing ❌ (NOT YET)
    │   ├── /banners             — CRUD banners
    │   └── /featured            — Featured products
    │
    ├── /analytics ❌ (NOT YET)
    │   ├── /sales               — Sales reports
    │   ├── /products            — Product analytics
    │   └── /customers           — Customer analytics
    │
    └── /users ❌ (NOT YET)
        ├── GET  /               — Admin users list
        ├── POST /               — Create admin user
        ├── PUT  /:id            — Update admin user
        └── DELETE /:id          — Delete admin user
```

---

## 4. DATABASE SCHEMA (Firestore Collections)

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
│   ├── sizes[] ← CRITICAL: Per-size stock tracking
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
│   ├── provider (shiprocket | delhivery)
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

## 5. ORDER LIFECYCLE STATE MACHINE

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
                    │               │
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

## 6. PAYMENT FLOW (Razorpay Integration)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Customer │     │ Frontend │     │ Backend  │     │ Razorpay │
│ Browser  │     │ React    │     │ Express  │     │ API      │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Add to Cart    │                │                │
     │ ──────────────>│                │                │
     │                │                │                │
     │ Click Checkout │                │                │
     │ ──────────────>│                │                │
     │                │ POST /validate │                │
     │                │ ──────────────>│                │
     │                │                │ Validate Cart  │
     │                │                │ ──────────────>│
     │                │                │ <──────────────│
     │                │ <──────────────│                │
     │                │                │                │
     │                │ POST /create-order              │
     │                │ ──────────────>│                │
     │                │                │ Create Order   │
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
     │                │                │ HMAC Verify    │
     │                │                │ ──────────────>│
     │                │                │ <──────────────│
     │                │                │                │
     │                │                │ Create Order   │
     │                │                │ Deduct Stock   │
     │                │                │ Send Email     │
     │                │                │ Create Shipmnt │
     │                │ <──────────────│                │
     │ <──────────────│ orderId        │                │
     │                │                │                │
     │ Order Confirmed│                │                │
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

---

## 7. SHIPPING INTEGRATION FLOW

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ Admin    │     │ Backend  │     │  Shiprocket  │     │  Delhivery   │
│ Panel    │     │ Express  │     │  API         │     │  API         │
└────┬─────┘     └────┬─────┘     └──────┬───────┘     └──────┬───────┘
     │                │                  │                    │
     │ Create         │                  │                    │
     │ Shipment       │                  │                    │
     │ ──────────────>│                  │                    │
     │                │                  │                    │
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
     │                │                  │                    │
     └────────────────┘                  └────────────────────┘
```

---

## 8. AUTHENTICATION FLOW

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
     │                │                │                │
     └────────────────┘                └────────────────┘

ADMIN ACCESS:
  ─ Frontend sends ID token in Authorization header
  ─ Backend middleware verifies token
  ─ requireAdmin middleware checks custom claims (admin: true)
  ─ Admin panel routes protected by RouteGuards component
```

---

## 9. IMPLEMENTATION STATUS MATRIX

| Feature Area           | Backend | Frontend | Status     |
|------------------------|---------|----------|------------|
| Dashboard              | ✅ Basic| ✅ Basic | ⚠ Improve  |
| Products — List        | ✅      | ✅       | ⚠ Filters  |
| Products — Add         | ✅      | ✅ Basic | ⚠ Size form|
| Products — Edit        | ✅      | ✅       | ✅ Done     |
| Products — Sizes       | ❌      | ❌       | 🔴 Critical|
| Inventory              | ❌      | ❌       | 🔴 Critical|
| Orders — List          | ✅      | ✅       | ⚠ Filters  |
| Orders — Detail        | ❌      | ✅       | ⚠ Backend  |
| Shipments              | ✅ Part | ✅       | ⚠ Complete |
| Customers — List       | ✅      | ✅       | ⚠ Detail   |
| Customers — Detail     | ❌      | ✅       | ⚠ Backend  |
| Payments               | ❌      | ✅       | ⚠ Backend  |
| Coupons                | ✅      | ✅       | ✅ Working  |
| Returns                | ✅      | ✅       | ✅ Working  |
| Refunds                | ✅ Part | ✅       | ⚠ Complete |
| Reviews                | ✅      | ✅       | ✅ Working  |
| Notifications          | ✅      | ✅       | ✅ Working  |
| Marketing              | ❌      | ✅       | ⚠ Backend  |
| Analytics              | ❌      | ✅       | ⚠ Backend  |
| Settings               | ✅      | ✅       | ✅ Working  |
| Admin Users / Roles    | ❌      | ❌       | 🔴 Missing |
| Audit Logs             | ✅      | ✅       | ✅ Working  |
| Catalog Settings       | ❌      | ✅       | ⚠ Backend  |

---

## 10. TECHNOLOGY STACK SUMMARY

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND STACK                        │
├─────────────────────────────────────────────────────────┤
│ React 19.2.8         │ TypeScript 6.0                  │
│ Vite 8.2.0           │ Tailwind CSS 4.3.3              │
│ React Router 7.18    │ Zustand 5.0 (state)             │
│ React Hook Form 7.85 │ Zod 4.4 (validation)            │
│ Axios 1.19           │ Firebase 12.17 (auth)            │
│ Framer Motion 13.1   │ Lucide React 1.31 (icons)        │
│ React Icons 5.7      │ date-fns 4.4                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     BACKEND STACK                        │
├─────────────────────────────────────────────────────────┤
│ Node.js              │ Express 5.2.1                    │
│ TypeScript 7.0       │ Firebase Admin 14.2              │
│ Razorpay 2.9.8       │ Nodemailer 9.0                   │
│ Helmet 8.3           │ express-rate-limit 8.6           │
│ CORS 2.8             │ Morgan 1.11 (logging)            │
│ Zod 4.4 (validation) │ Axios 1.19                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE                          │
├─────────────────────────────────────────────────────────┤
│ Firebase Firestore   │ Firebase Authentication          │
│ Razorpay (Payments)  │ Shiprocket (Shipping)            │
│ Delhivery (Shipping) │ SMTP/Nodemailer (Email)          │
│ Google Maps API      │                                  │
└─────────────────────────────────────────────────────────┘
```

---

*This sketch is auto-generated from codebase analysis. Update when architecture changes.*
