# SoleVault Admin Panel — Architecture Document

> **Version**: 1.0  
> **Last Updated**: August 2026  
> **Purpose**: Definitive architecture reference for the SoleVault Admin Panel. All development must align with this document.

---

## Table of Contents
1. [Sidebar Navigation Structure](#sidebar-navigation)
2. [Section Specifications](#section-specifications)
3. [Backend Routes Map](#backend-routes-map)
4. [Frontend Routes Map](#frontend-routes-map)
5. [Current Implementation Status](#current-implementation-status)
6. [Key Design Principles](#key-design-principles)

---

## Sidebar Navigation

```
┌──────────────────────────────┐
│  SOLEVAULT ADMIN             │
│                              │
│  ▣ Dashboard                 │
│                              │
│  CATALOG                     │
│  ▾ Products                  │
│    • All Products            │
│    • Add Product             │
│    • Categories              │
│    • Collections             │
│                              │
│  ▾ Inventory                 │
│    • Stock Overview          │
│    • Low Stock               │
│    • Stock Adjustment        │
│    • Inventory History       │
│                              │
│  SALES                       │
│  ▾ Orders                    │
│    • All Orders              │
│    • Pending                 │
│    • Processing              │
│    • Shipped                 │
│    • Delivered               │
│    • Cancelled               │
│                              │
│  ▾ Shipments                 │
│    • All Shipments           │
│    • Create Shipment         │
│    • Tracking                │
│                              │
│  ▾ Customers                 │
│    • All Customers           │
│    • Customer Detail         │
│                              │
│  FINANCE                     │
│  ▾ Payments                  │
│    • Transactions            │
│    • Reconciliation          │
│                              │
│  ▾ Coupons                   │
│    • All Coupons             │
│    • Create Coupon           │
│    • Coupon Analytics        │
│                              │
│  ▾ Refunds                   │
│    • All Refunds             │
│    • Pending                 │
│                              │
│  CUSTOMER SERVICE            │
│  ▾ Returns                   │
│    • Return Requests         │
│    • Approved                │
│    • Rejected                │
│                              │
│  ▾ Reviews                   │
│    • All Reviews             │
│    • Pending Approval        │
│    • Reported                │
│                              │
│  ▾ Notifications             │
│    • Notification Logs       │
│    • Email Logs              │
│    • Failed                  │
│                              │
│  MARKETING                   │
│  ▾ Homepage                  │
│    • Hero Banners            │
│    • Featured Products       │
│    • New Arrivals            │
│                              │
│  ▾ Collections               │
│  ▾ SEO                       │
│                              │
│  ANALYTICS                   │
│  ▾ Reports                   │
│    • Sales                   │
│    • Products                │
│    • Customers               │
│    • Inventory               │
│    • Shipping                │
│    • Returns                 │
│                              │
│  SYSTEM                      │
│  ▾ Settings                  │
│    • Store                   │
│    • Shipping                │
│    • Payments                │
│    • Tax                     │
│    • Notifications           │
│    • SEO                     │
│                              │
│  ▾ Admin Users               │
│  ▾ Audit Logs                │
│  ▾ Security Events           │
└──────────────────────────────┘
```

---

## Section Specifications

### 1. Dashboard

**Purpose**: Answer "What needs my attention right now?"

**Top KPI Cards**:
| Card | Data Source |
|------|------------|
| Today's Sales | Orders collection, `createdAt = today`, sum `total` |
| Today's Orders | Orders collection, `createdAt = today`, count |
| Pending Orders | Orders where `status = PLACED` |
| Pending Shipments | Orders confirmed but no shipment created |
| Low Stock | Products where any size `stock < reorderLevel` |
| Return Requests | Returns where `status = REQUESTED` |
| Refunds Pending | Refunds where `status = REQUESTED OR PROCESSING` |
| Total Customers | Users collection count |

**Revenue Chart** (filters: Today / 7 Days / 30 Days / 90 Days / This Year / Custom):
- Revenue
- Order count
- Average Order Value

**Operational Alerts** (clickable, routes to relevant page):
- ⚠ `N` orders awaiting shipment → `/admin/shipments`
- ⚠ `N` products low on stock → `/admin/inventory/low-stock`
- ⚠ `N` return requests pending → `/admin/returns`
- ⚠ `N` refunds pending → `/admin/refunds`
- ⚠ `N` shipment failures → `/admin/shipments`

---

### 2. Products

**All Products Table**:
| Column | Notes |
|--------|-------|
| Image | Thumbnail of `images[0]` |
| Product Name + SKU | |
| Category | |
| Price | Selling price + MRP if different |
| Sizes/Stock | Summary e.g. "6 sizes, 42 units" |
| Status | Active / Inactive badge |
| Featured | Toggle |
| New Arrival | Toggle |
| Updated | Relative time |
| Actions | View, Edit, Duplicate, Deactivate, Delete |

**Filters**: Search, Category, Collection, Status, Stock level, Featured, New Arrival, Price range

**Add/Edit Product Form** (structured sections):

```
BASIC INFORMATION
  Product Name *
  Slug * (auto-generated, editable)
  Brand *
  SKU *
  Short Description
  Full Description

PRICING
  Selling Price (MRP) *
  Discount Price
  Tax (%)

IMAGES
  Upload Image  |  Add Image URL
  [thumb] [thumb] [thumb] [+]
   ↑ Primary (drag to reorder)

CATEGORY
  Category *  (dropdown)
  Collection  (dropdown)
  Tags        (comma-separated)

SIZES / VARIANTS  ← Critical for footwear
  Size  |  SKU          |  Stock  |  Reorder Level  |  Status
  ------+--------------+---------+-----------------+--------
  6     |  SH-001-6    |  12     |  5              |  In Stock
  7     |  SH-001-7    |  8      |  5              |  In Stock
  8     |  SH-001-8    |  3      |  5              |  Low Stock
  9     |  SH-001-9    |  0      |  5              |  Out of Stock
  [+ Add Size]

ADDITIONAL DETAILS
  Material
  Care Instructions
  Fit

SEO
  SEO Title
  SEO Description

SETTINGS
  ☐ Featured
  ☐ New Arrival
  ☐ Active
```

> **Rule**: Never use a single stock number per product. Stock is tracked per size/variant.

---

### 3. Inventory

**Stock Overview Dashboard**:
- Total SKUs
- Low Stock count
- Out of Stock count
- Estimated Inventory Value

**Inventory Table**:
| Column | Notes |
|--------|-------|
| Product + Image | |
| SKU | Size-level SKU |
| Size | |
| Current Stock | |
| Reserved | In open orders |
| Available | Current - Reserved |
| Reorder Level | Alert threshold |
| Status | In Stock / Low / Out |
| Last Updated | |

**Stock Adjustment Form**:
- Select Product
- Select Size
- Adjustment Amount (+/-)
- Reason: `Stock Received | Damaged | Lost | Manual Correction | Customer Return | Exchange | Inventory Count | Other`
- Notes (free text)

**Inventory History** (append-only log):
| Field | |
|-------|-|
| Who | Admin UID + name |
| Product | |
| Size | |
| Old Quantity | |
| New Quantity | |
| Change | |
| Reason | |
| Notes | |
| Timestamp | |

---

### 4. Orders

**Order List Table**:
| Column | |
|--------|-|
| Order # | e.g. SV-12345 |
| Customer | Name + email |
| Date | |
| Items | Count |
| Amount | |
| Payment | Status badge |
| Fulfillment | Status badge |
| Shipment | Courier + AWB |
| Status | |
| Actions | View, Update Status |

**Filters**: Search order #, Customer, Date range, Payment status, Order status, Courier

**Order Detail Page** — must include:
```
ORDER #SV-12345              [Print Invoice] [Print Label]

CUSTOMER                     SHIPPING ADDRESS
Name                         Full Name
Email                        Street, Landmark
Phone                        City, State - PIN
                             Phone

ITEMS
 Image | Product | Size | Qty | Price | Discount | Total

PAYMENT
 Payment ID:        Razorpay PYID
 Razorpay Order:    order_xxx
 Amount:            ₹X,XXX
 Status:            Captured
 Date:              DD MMM YYYY

SHIPMENT
 Provider:          Shiprocket
 AWB:               XXXXXXXXXX
 Courier:           Blue Dart
 Tracking URL:      [Link]
 Status:            In Transit
 Expected:          DD MMM YYYY

ORDER TIMELINE
 ○ Order Placed     13 Aug 2026, 10:30
 ○ Payment          13 Aug 2026, 10:31
 ○ Confirmed        13 Aug 2026, 11:00
 ○ Packed           14 Aug 2026, 09:00
 ○ Shipment         14 Aug 2026, 14:00
 ○ Shipped          15 Aug 2026
 ● Out for Delivery 16 Aug 2026
 ○ Delivered        —

ADMIN ACTIONS  (state-dependent)
 [Confirm] [Pack] [Create Shipment] [Sync Tracking]
 [Cancel Order] [Refund] [Print Invoice] [Print Label]
```

**Status Flow**:
`PLACED → CONFIRMED → PROCESSING → PACKED → SHIPMENT_CREATED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED`

Also: `PAYMENT_FAILED | CANCELLED | RETURN_REQUESTED | RETURN_APPROVED | RETURNED | REFUND_PENDING | REFUNDED`

---

### 5. Shipments

**Shipment List**:
| Column | |
|--------|-|
| Order # | |
| Customer | |
| Provider | Shiprocket / Delhivery |
| AWB | |
| Courier | |
| Status | |
| Created | |
| Expected Delivery | |

**Create Shipment**:
```
Provider:  ○ Shiprocket  ○ Delhivery  ○ Automatic
           ↓
Package Weight (kg):
Package Dimensions (L x W x H):
           ↓
[Create Shipment]
           ↓
AWB: XXXXXXXXX
Courier: Blue Dart
Label: [Download PDF]
```

**Actions per shipment**: Create, Retry, Sync Tracking, Cancel, View Tracking, Print Label

---

### 6. Customers

**Customer Table**:
| Column | |
|--------|-|
| Customer (avatar + name) | |
| Email | |
| Phone | |
| Orders | Count |
| Total Spent | |
| Last Order | |
| Status | Active / Blocked |
| Created | |

**Customer Detail — 360 View**:
- Profile (name, email, phone, DOB)
- Addresses (all saved)
- Orders (full history with status)
- Wishlist (products)
- Reviews (submitted)
- Returns (all requests)
- Refunds (issued)
- Notifications (sent history)
- Activity Log (login events)

---

### 7. Coupons

**Coupon Builder**:
```
BASICS
  Code *          (e.g. WELCOME10 — auto uppercase)
  Type *          ○ Percentage  ○ Fixed Amount  ○ Free Shipping

DISCOUNT
  Value *         (% or ₹ depending on type)
  Max Discount    (for percentage type — cap at ₹X)

CONDITIONS
  Minimum Cart Value
  ☐ First Order Only
  ☐ Specific Products    → [Product Selector]
  ☐ Specific Categories  → [Category Selector]
  ☐ Specific Customers   → [Customer Selector]

USAGE
  Total Usage Limit   (blank = unlimited)
  Per Customer Limit  (blank = unlimited)

SCHEDULE
  Start Date
  End Date (expiry)

STATUS
  ○ Active  ○ Paused  ○ Inactive
```

**Coupon Analytics** (per coupon):
- Times Used
- Revenue Generated
- Discount Given
- Average Order Value with coupon

---

### 8. Returns & Refunds

**Return Requests Table**:
| Column | |
|--------|-|
| Return # | |
| Order # | |
| Customer | |
| Product(s) | |
| Reason | |
| Requested At | |
| Status | |

**Return Status Flow**:
`REQUESTED → APPROVED / REJECTED → PICKUP_PENDING → RECEIVED → INSPECTED → COMPLETED`

**Return Inspection**:
```
Condition:  ○ Resellable  ○ Damaged  ○ Used  ○ Wrong Product
Restock?    ○ Yes  ○ No
Refund?     ○ Yes  ○ No
Notes:
[Approve] [Reject]
```

**Refund Table**:
| Column | |
|--------|-|
| Refund ID | |
| Order # | |
| Payment ID | |
| Amount | |
| Reason | |
| Status | REQUESTED / PROCESSING / PROCESSED / FAILED |
| Initiated By | |
| Created | |
| Processed At | |

> **Rule**: Backend validates all refund amounts. Admin UI cannot dictate arbitrary refund amounts without backend authorization.

---

### 9. Reviews

**Review Table**:
| Column | |
|--------|-|
| Product | |
| Customer | |
| Rating | ★★★★☆ |
| Review | Excerpt |
| Verified Purchase | ✓ / ✗ |
| Status | Pending / Approved / Rejected / Hidden |
| Date | |

**Actions**: Approve, Reject, Report, Delete

**Filters**: Pending, Approved, Rejected, Reported, Rating, Product

---

### 10. Payments

**Transaction Table**:
| Column | |
|--------|-|
| Payment ID | |
| Order # | |
| Customer | |
| Amount | |
| Method | Razorpay / COD |
| Status | Created / Authorized / Captured / Failed / Refunded |
| Razorpay Order ID | |
| Razorpay Payment ID | |
| Created | |

**Reconciliation View** (per order):
```
Order Total:      ₹2,499
Payment Captured: ₹2,499  ✓ Match
Refunded:         ₹0
Net:              ₹2,499
```

---

### 11. Notifications

**Notification Log Table**:
| Column | |
|--------|-|
| Time | |
| Customer | |
| Event | Order Confirmed / Shipped / Refund etc. |
| Channel | Email / SMS / Push |
| Status | SUCCESS / FAILED |
| Order # | |

**Filters**: Channel, Status, Event type, Date range

---

### 12. Marketing

**Homepage Manager**:
- Hero Banners (Desktop Image, Mobile Image, Headline, Subtitle, CTA Text, CTA Link, Active, Start/End Date)
- Featured Products (admin selects products by search)
- New Arrivals (auto or manual)
- Promotional Banners

**Collections Manager**:
- Collection Name, Description, Image, Products (multi-select), SEO Title, SEO Description

---

### 13. Analytics & Reports

All reports have date range filters (Today / 7D / 30D / 90D / Custom).

| Report | Metrics |
|--------|---------|
| Sales | Revenue, Orders, AOV, Units Sold |
| Products | Best Sellers, Worst Sellers, Most Viewed, Most Wishlisted |
| Customers | New vs Returning, Top Customers, Avg Customer Value |
| Inventory | Low Stock, Out of Stock, Fast Moving, Slow Moving |
| Shipping | Delivered %, Delayed %, RTO %, Avg Delivery Time, Courier Performance |
| Returns | Return Rate, Top Return Products, Return Reasons, Refund Value |
| Coupons | Times Used, Revenue Generated, Discount Given |

---

### 14. Settings

| Section | Fields |
|---------|--------|
| Store | Name, Logo URL, Email, Phone, Address, Currency, Timezone |
| Shipping | Default Provider, Free Shipping Threshold, Default Fee, Package Defaults, Pickup Address |
| Payments | Razorpay Mode (Test/Live) — keys stored server-side only |
| Tax | GST %, Tax-inclusive pricing toggle |
| Notifications | Toggle per event: Order Confirmed, Shipped, Delivered, Cancelled, Refund |
| SEO | Site Title, Meta Description, OG Image URL, Google Verification |

> **Security Rule**: Razorpay secret keys are NEVER stored in Firestore or surfaced in the Admin UI.

---

### 15. Admin Users & Roles

**Roles**:
| Role | Permissions |
|------|-------------|
| SUPER_ADMIN | Everything |
| ADMIN | Everything except Admin Users, Roles |
| ORDER_MANAGER | Orders, Shipments, Returns, Refunds |
| INVENTORY_MANAGER | Products, Inventory |
| CONTENT_MANAGER | Marketing, Content, SEO |
| SUPPORT | Customers, Orders (view only), Returns |

---

### 16. Audit Logs

Every sensitive action is recorded:

| Field | |
|-------|-|
| Admin | UID + name |
| Action | e.g. PRODUCT_PRICE_UPDATED |
| Entity Type | product / order / coupon / refund etc. |
| Entity ID | |
| Old Value | JSON snapshot |
| New Value | JSON snapshot |
| IP Address | |
| Timestamp | |
| Result | SUCCESS / FAILED |

**Tracked actions**: Product changes, Price changes, Inventory adjustments, Order status changes, Refunds, Return approvals, Coupon changes, Settings updates, Admin user changes, Shipping settings.

---

## Backend Routes Map

### Currently Implemented ✅

```
GET    /api/admin/metrics
GET    /api/admin/audit-logs
GET    /api/admin/products
POST   /api/admin/products
PUT    /api/admin/products/:id
DELETE /api/admin/products/:id
GET    /api/admin/orders
PUT    /api/admin/orders/:id/status
POST   /api/admin/orders/:orderId/shipment
GET    /api/admin/orders/:orderId/shipment/sync
GET    /api/admin/customers
GET    /api/admin/notification-logs
GET    /api/admin/coupons
POST   /api/admin/coupons
PUT    /api/admin/coupons/:id
GET    /api/admin/settings
PUT    /api/admin/settings
GET    /api/admin/returns
PUT    /api/admin/returns/:id/status
GET    /api/admin/refunds
GET    /api/admin/reviews
PUT    /api/admin/reviews/:id/status
```

### Missing / To Be Added ❌

```
# Inventory
GET    /api/admin/inventory                  — all SKU-level stock
GET    /api/admin/inventory/low-stock
POST   /api/admin/inventory/adjust          — stock adjustment with reason
GET    /api/admin/inventory/history

# Product Variants (size-level)
POST   /api/admin/products/:id/sizes        — add size to product
PUT    /api/admin/products/:id/sizes/:size  — update size stock
DELETE /api/admin/products/:id/sizes/:size

# Orders — detail
GET    /api/admin/orders/:id                — single order with full timeline

# Payments
GET    /api/admin/payments                  — all transactions
GET    /api/admin/payments/:id

# Refunds
POST   /api/admin/refunds                   — initiate refund
PUT    /api/admin/refunds/:id               — update refund status

# Customers — detail
GET    /api/admin/customers/:id             — full customer 360

# Marketing
GET    /api/admin/marketing/banners
POST   /api/admin/marketing/banners
PUT    /api/admin/marketing/banners/:id
DELETE /api/admin/marketing/banners/:id
GET    /api/admin/marketing/featured
PUT    /api/admin/marketing/featured

# Analytics
GET    /api/admin/analytics/sales
GET    /api/admin/analytics/products
GET    /api/admin/analytics/customers
GET    /api/admin/analytics/inventory
GET    /api/admin/analytics/shipping
GET    /api/admin/analytics/returns

# Admin Users
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id

# Categories
GET    /api/admin/categories
POST   /api/admin/categories
PUT    /api/admin/categories/:id
DELETE /api/admin/categories/:id
```

---

## Frontend Routes Map

### Currently Implemented ✅

```
/admin                    — Dashboard
/admin/products           — All Products (basic)
/admin/orders             — All Orders
/admin/customers          — Customer list
/admin/coupons            — Coupon management
/admin/settings           — Settings
/admin/audit-logs         — Audit logs
/admin/notification-logs  — Notification logs
/admin/returns            — Returns
/admin/refunds            — Refunds
/admin/reviews            — Reviews
```

### Missing / To Be Added ❌

```
/admin/products/add          — Full add product form (with sizes)
/admin/products/:id/edit     — Edit product
/admin/inventory             — Inventory overview
/admin/inventory/low-stock   — Low stock view
/admin/inventory/adjust      — Stock adjustment form
/admin/orders/:id            — Order detail page (timeline + actions)
/admin/shipments             — Shipments list
/admin/customers/:id         — Customer 360 view
/admin/payments              — Payment transactions
/admin/analytics             — Reports hub
/admin/marketing/banners     — Hero banner manager
/admin/marketing/featured    — Featured products
/admin/admin-users           — Admin user management
```

---

## Current Implementation Status

| Section | Backend | Frontend | Priority |
|---------|---------|----------|----------|
| Dashboard | ✅ Basic | ✅ Basic | 🔴 Improve alerts |
| Products — List | ✅ | ✅ | 🟡 Add filters |
| Products — Add | ✅ | ✅ Basic | 🔴 Add size/variant form |
| Products — Edit | ✅ | ❌ | 🔴 High |
| Products — Sizes | ❌ | ❌ | 🔴 Critical for footwear |
| Inventory | ❌ | ❌ | 🔴 High |
| Orders — List | ✅ | ✅ | 🟡 Add filters |
| Orders — Detail | ❌ | ❌ | 🔴 High |
| Shipments | ✅ Partial | ❌ | 🔴 High |
| Customers — List | ✅ | ✅ Basic | 🟡 |
| Customers — Detail | ❌ | ❌ | 🟡 |
| Payments | ❌ | ❌ | 🟡 |
| Coupons | ✅ | ✅ | 🟢 Working |
| Returns | ✅ | ✅ | 🟢 Working |
| Refunds | ✅ Partial | ✅ Basic | 🟡 |
| Reviews | ✅ | ✅ | 🟢 Working |
| Notifications | ✅ | ✅ | 🟢 Working |
| Marketing | ❌ | ❌ | 🟡 |
| Analytics | ❌ | ❌ | 🟡 |
| Settings | ✅ | ✅ | 🟢 Working |
| Admin Users / Roles | ❌ | ❌ | 🟡 |
| Audit Logs | ✅ | ✅ | 🟢 Working |

---

## Key Design Principles

1. **Server-authoritative**: Prices, coupons, inventory, payments and refunds are never trusted from browser input alone. Backend validates everything.

2. **Size-level inventory**: Especially critical for footwear. Never use a single stock number per product. Stock is tracked at the `product + size` level.

3. **Append-only audit trail**: No silently overwriting historical data. Every sensitive change creates an audit record with old/new values, admin identity, and timestamp.

4. **Unified order timeline**: A single order view shows payment, inventory reservation, fulfillment, shipping, tracking, notifications, returns and refunds — not separate isolated records.

5. **Operational-first dashboard**: The dashboard surfaces what needs attention (alerts, counts) rather than decorative charts. Charts are in the dedicated Analytics section.

6. **Safe coupon operations**: Coupons can be Paused — admins never need to delete active promotions to stop them.

7. **Shipping abstraction**: Admin selects provider (Shiprocket / Delhivery / Automatic). AWB, tracking and labels are fetched from the provider API, never manually copied.

8. **Customer 360**: Customer support can resolve issues by viewing a single customer page: orders, returns, refunds, reviews, wishlist, notifications.

9. **Role-based access**: When multiple staff use the panel, roles (ORDER_MANAGER, INVENTORY_MANAGER, etc.) restrict what each person can see and do.

10. **Notification visibility**: Admin can determine whether any order confirmation, shipping, or refund email actually succeeded or failed.

---

*This document is the single source of truth for admin panel development. Update this file when requirements change, not after implementation.*
