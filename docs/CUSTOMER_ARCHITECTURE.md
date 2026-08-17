# SHOE E-COMMERCE PLATFORM — CUSTOMER-FACING ARCHITECTURE

## 1. WEBSITE STRUCTURE

```
/
├── Home                            /
├── Shop
│   ├── All Products                /shop
│   ├── Category                    /shop?category=
│   ├── Collections                 /shop?collection=
│   ├── New Arrivals                /shop?type=new-arrivals
│   ├── Featured                    /shop?type=featured
│   └── Sale                        /shop?type=sale
├── Product                         /shop/:slug
├── Search                          /search?q=
├── Cart                            /cart
├── Wishlist                        /account/wishlist
├── Checkout                        /checkout
├── Order
│   ├── Order Confirmation          /order-confirmation/:orderId
│   ├── Order History               /account/orders
│   ├── Order Detail                /account/orders/:id
│   └── Public Tracking             /track-order
├── Authentication
│   ├── Login                       /login
│   ├── Signup                      /signup
│   ├── Forgot Password             /forgot-password
│   ├── Reset Password              /reset-password
│   └── Verify Email                /verify-email
├── Account
│   ├── Overview                    /account
│   ├── Profile                     /account/profile
│   ├── Addresses                   /account/addresses
│   ├── Orders                      /account/orders
│   ├── Order Detail                /account/orders/:id
│   ├── Wishlist                    /account/wishlist
│   ├── Reviews                     /account/reviews
│   ├── Returns                     /account/returns
│   └── Notifications               /account/notifications
├── Content
│   ├── About                       /about
│   ├── Contact                     /contact
│   ├── FAQ                         /faq
│   ├── Shipping Policy             /shipping-policy
│   ├── Return Policy               /return-policy
│   ├── Privacy Policy              /privacy-policy
│   └── Terms                       /terms
└── Error
    ├── 404                         *
    └── Error Boundary
```

---

## 2. GLOBAL WEBSITE LAYOUT

- **Header**: Logo, Shop nav, Categories, Collections dropdown, Search (modal), Account icon, Wishlist icon, Cart (count badge), Notifications bell (unread count), Mobile hamburger menu
- **Footer**: Navigation links, Policy links, Contact info, Social links, Newsletter subscription
- **Mobile-first responsive layout** across all breakpoints: 320px → 1440px+

---

## 3. HOMEPAGE

### Sections (all API-driven)
1. **Hero** — full-screen image/video, primary CTA (Shop Collection), secondary CTA (New Arrivals)
2. **Featured Products** — from `GET /products?isFeatured=true`
3. **New Arrivals** — from `GET /products?isNewArrival=true`
4. **Collections Grid** — Running, Casual, Sports, Lifestyle, Premium
5. **Promotional Banners** — from `GET /admin/marketing/banners`
6. **Brand Story** — static content section
7. **Benefits Bar** — Secure Payments, Easy Returns, Fast Delivery, Authenticity
8. **Newsletter** — email subscription form

---

## 4. SHOP / PRODUCT CATALOG

**Route:** `/shop`

### Product Card
- Image (with lazy loading)
- Badge (Sale / New / Featured)
- Wishlist toggle button
- Product name
- Brand
- Star rating + review count
- Selling price (₹)
- MRP (strikethrough)
- Discount % badge

### Filters (sidebar, collapsible on mobile)
- Category (checkbox, from catalog-settings API)
- Size (toggle buttons)
- Price range (min/max slider)
- Brand (checkbox, from catalog-settings API)
- Availability (In Stock only toggle)
- Collection (checkbox)

### Sorting
- Featured (default)
- Newest First
- Price: Low to High
- Price: High to Low
- Name: A–Z
- Highest Rated

### Search
- Live search by product name, brand, category, tags, SKU
- URL: `/search?q=`
- Suggestions dropdown
- Redirect to search results page

### Pagination
- Server-driven, 12 products per page

---

## 5. PRODUCT DETAIL PAGE

**Route:** `/shop/:slug`

### Image Gallery
- Multiple images, thumbnails strip
- Previous / Next navigation
- Full-screen lightbox viewer
- Zoom on hover (desktop)
- Swipe gestures (mobile)
- Keyboard navigation (← →, Esc)

### Product Information
- Brand name (linked to brand filter)
- Product name (h1)
- Star rating + review count (anchor to reviews section)
- Selling price (₹)
- MRP / strikethrough + discount % badge
- Short description
- Full description (expandable)

### Size Selector
- Available sizes as buttons
- Low stock indicator (≤ reorder level)
- Out of stock = disabled button
- Size guide link

### Actions
- **Add to Cart** — validates stock via backend
- **Buy Now** — add to cart + redirect to checkout
- **Wishlist toggle** (heart icon)

### Product Tabs
- Description
- Materials & Care
- Specifications (fit, material)
- Shipping & Returns info

### Related Products
- Same category, different products

---

## 6. REVIEWS & RATINGS

**Embedded in Product Detail Page**

- Overall rating (stars + count)
- Rating breakdown (5★ → 1★ bar chart)
- Customer reviews list (paginated)
- Verified purchase badge
- Helpful / Report buttons
- **Submit review form** (authenticated only, purchased product only)
  - Star rating
  - Title
  - Body
  - Optional image URL
- Backend moderation: admin approves/rejects
- Ownership enforced: one review per customer per product

---

## 7. WISHLIST

**Route:** `/account/wishlist` (protected)

- Product image, name, price, availability status
- Move to Cart button
- Remove from Wishlist button
- Empty state with Shop CTA
- User-owned data only (Firestore: `wishlists/{userId}`)

---

## 8. CART

**Route:** `/cart` (also accessible as side drawer)

### Cart Item
- Product image
- Product name + brand
- Size
- Quantity (+ / − controls)
- Line price (₹)
- Remove button

### Order Summary
- Subtotal
- Coupon discount (if applied)
- Shipping estimate
- Tax
- **Grand Total**

### Coupon
- Code input + Apply button
- Backend validates: existence, active, expiry, min order, max discount, usage limits, per-customer usage, restrictions
- **Frontend never calculates discounts**

> **Security:** Backend is authoritative for all prices, discounts, inventory checks, and final payable amount.

---

## 9. CHECKOUT

**Route:** `/checkout` (protected — must be logged in)

### Steps
1. **Address** — select saved or add new
2. **Delivery** — shipping options (backend-calculated)
3. **Order Summary** — authoritative values from backend
4. **Payment** — Razorpay integration
5. **Confirmation** — redirect to `/order-confirmation/:orderId`

---

## 10. ADDRESS MANAGEMENT

**Route:** `/account/addresses` (protected)

### Operations
- List saved addresses
- Add new address
- Edit existing address
- Delete address
- Set as default

### Address Fields
- Name, Phone
- House / Flat No.
- Street, Area
- City, State, PIN
- Landmark (optional)
- Address Type (Home / Work / Other)

---

## 11. DELIVERY / SHIPPING

- Backend determines delivery options, shipping fee, estimated delivery date
- Supports: Shiprocket, Delhivery
- Frontend never communicates with shipping providers directly
- Shipping fee shown in order summary only after backend calculation

---

## 12. COUPONS

Server validates:
- Coupon existence and active status
- Expiry date
- Minimum order amount
- Maximum discount cap
- Total usage limit
- Per-customer usage limit
- Product / category restrictions

**Never trust browser-supplied discount values.**

---

## 13. RAZORPAY PAYMENT FLOW

```
Frontend
  → POST /checkout/validate (backend validates cart)
  → POST /checkout/create-order (server calculates total, creates Razorpay order)
  → Razorpay Checkout modal opens
  → Customer completes payment
  → POST /checkout/verify (backend HMAC signature validation)
  → Redirect to /order-confirmation/:orderId
```

**Never trust client-provided payment amounts.**

---

## 14. RAZORPAY WEBHOOK

```
Razorpay → Public HTTPS /webhook/razorpay
  → Verify HMAC signature
  → Idempotency check (paymentEventId)
  → Firestore transaction:
      → Update payment status
      → Update order status
      → Deduct inventory (atomic)
      → Create shipment
      → Send notification
```

Webhook must be publicly reachable in production.

---

## 15. ORDER CONFIRMATION

**Route:** `/order-confirmation/:orderId` (protected)

- Success message + order number
- Expected delivery date
- Order items summary
- Actions: Track Order, View Order Details, Continue Shopping

---

## 16. ORDER HISTORY

**Route:** `/account/orders` (protected)

- List orders: number, date, items thumbnail, amount (₹), status badge
- Filter tabs: All / Processing / Shipped / Delivered / Cancelled
- Click → Order Detail

---

## 17. ORDER DETAIL

**Route:** `/account/orders/:id` (protected)

- Order information (number, date, status)
- Product items (snapshot at order time)
- Payment info (method, amount, status)
- Delivery address (snapshot)
- Shipment info (AWB, courier, tracking)
- Order timeline

---

## 18. ORDER TIMELINE

```
Order Placed → Payment Confirmed → Processing → Packed
  → Shipment Created → Shipped → Out for Delivery → Delivered
```

Timeline reflects actual backend events with timestamps.

---

## 19. PUBLIC ORDER TRACKING

**Route:** `/track-order`

- Order number + phone input (no auth required)
- Shows: order status, shipment status, AWB, courier, expected delivery, timeline
- Never exposes private payment or customer info

---

## 20. SHIPMENT TRACKING STATES

```
PENDING → READY_TO_SHIP → SHIPPED → IN_TRANSIT
  → OUT_FOR_DELIVERY → DELIVERED → FAILED / RTO / CANCELLED
```

Synchronized from Shiprocket / Delhivery via backend.

---

## 21. CUSTOMER ACCOUNT

**Route:** `/account` (protected)

### Sections
- Overview (stats: orders, wishlist, returns)
- Profile (`/account/profile`)
- Orders (`/account/orders`)
- Addresses (`/account/addresses`)
- Wishlist (`/account/wishlist`)
- Reviews (`/account/reviews`)
- Returns (`/account/returns`)
- Notifications (`/account/notifications`)

---

## 22. PROFILE

**Route:** `/account/profile`

- Display name, email, phone
- Profile image
- Edit form (name, phone, image URL)
- Firebase Authentication remains authoritative for auth credentials

---

## 23. NOTIFICATIONS

**Route:** `/account/notifications`

- Notification center with unread count badge in header
- Types: Order Confirmed, Shipped, Out for Delivery, Delivered, Refund, Return updates
- Read / Unread state
- Timestamps

---

## 24. RETURNS

**Route:** `/account/returns`

### Customer Flow
```
Account → Orders → Delivered Order → Request Return
```

### Return Form
- Product selector
- Quantity
- Reason dropdown: Wrong Size, Wrong Product, Damaged, Defective, Not as Expected, Other
- Additional comments

### Return Status Flow
```
REQUESTED → APPROVED → PICKUP → RECEIVED → INSPECTED → REFUND → COMPLETED
```

Customer can view status but cannot modify.

---

## 25. CANCELLATION

| Order State  | Can Cancel |
|-------------|------------|
| PLACED       | ✅ Yes     |
| CONFIRMED    | ✅ Yes     |
| PROCESSING   | ✅ Yes     |
| SHIPPED      | ❌ No      |
| DELIVERED    | ❌ No      |

Backend enforces all transitions. Cancellation may trigger: shipment cancellation, inventory restoration, refund, notification.

---

## 26. REFUNDS

Customer sees:
- Refund Requested
- Refund Processing
- Refund Completed

Payment provider details never exposed to frontend.

---

## 27. GLOBAL SEARCH

**Route:** `/search?q=`

- Search by: product name, brand, category, tags
- Live suggestions dropdown (debounced)
- Full search results page with filters
- Clicking suggestion → product detail or filtered shop

---

## 28. CONTENT PAGES

| Route              | Content                                   |
|-------------------|-------------------------------------------|
| `/about`           | Brand story, team, values                |
| `/contact`         | Contact form + info                       |
| `/faq`             | Accordion FAQ                             |
| `/shipping-policy` | Shipping policy text                      |
| `/return-policy`   | Return & refund policy                    |
| `/privacy-policy`  | Privacy policy                            |
| `/terms`           | Terms & conditions                        |

---

## 29. SEO

Every public product page has:
- `<title>` — product name + brand
- `<meta name="description">` — short description
- Canonical URL
- OpenGraph tags (og:title, og:image, og:description)
- Twitter Card
- Product JSON-LD (schema.org/Product with Offer, AggregateRating)

---

## 30. STRUCTURED DATA

```json
{
  "@type": "Product",
  "name": "...",
  "brand": { "@type": "Brand", "name": "..." },
  "offers": { "@type": "Offer", "price": "...", "priceCurrency": "INR" },
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "...", "reviewCount": "..." }
}
```

Additional: Organization, WebSite, BreadcrumbList schemas.

---

## 31. SITEMAP & ROBOTS

**robots.txt** — Allow:
- `/`, `/shop`, `/shop/*`, `/search`, `/about`, `/contact`, `/faq`, `/shipping-policy`, `/return-policy`, `/privacy-policy`, `/terms`

**Disallow:**
- `/account`, `/cart`, `/checkout`, `/login`, `/signup`, `/admin`

**sitemap.xml** — includes all public routes + product URLs.

---

## 32. PERFORMANCE

- Route-level code splitting (React.lazy + Suspense)
- Image lazy loading + `loading="lazy"` attribute
- WebP images preferred
- Debounced search input
- Pagination (server-driven)
- API response caching where appropriate
- Skeleton loaders for all async content

---

## 33. ACCESSIBILITY

- Keyboard navigation for all interactive elements
- Visible focus states
- ARIA labels on icon buttons
- Semantic HTML (nav, main, article, section, h1–h6 hierarchy)
- Form labels linked to inputs
- Error announcements via aria-live
- Accessible modals (focus trap, Esc to close)
- Color contrast ≥ 4.5:1

---

## 34. RESPONSIVE DESIGN

Test breakpoints: 320px, 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px+

- Mobile: single column, bottom nav or hamburger
- Tablet: 2-column grids, collapsible sidebar
- Desktop: 3–4 column product grid, sidebar filters

---

## 35. AUTHENTICATION

**Provider:** Firebase Authentication

**Methods:** Email + Password, Google Sign-In

**New Customer Flow:**
```
Signup → Firebase Auth → Email Verification → Firestore Profile → Session
```

**New Google Sign-In Flow:**
```
Google Auth → Check if profile exists → If not: prompt for name/phone → Firestore Profile → Session
```

**Protected routes:** /account/*, /checkout, /cart (checkout action only)

---

## 36. SECURITY

```
Browser → HTTPS → CORS → Helmet/CSP → Rate Limiting
  → Firebase ID Token → Authorization → Controller → Service → Firestore
```

- Customer A can never access Customer B's data (orders, addresses, wishlist, returns, refunds, notifications, profile)
- All price/inventory/payment logic on backend
- HMAC verification for Razorpay webhook
- Timing-safe signature comparison

---

## 37. FIRESTORE COLLECTIONS (Customer-Relevant)

| Collection             | Description                        |
|------------------------|------------------------------------|
| `users/{userId}`       | Profile, addresses                 |
| `products/{productId}` | Products with inventory            |
| `orders/{orderId}`     | Order snapshots                    |
| `payments/{paymentId}` | Payment records                    |
| `shipments/{shipmentId}` | Shipment + tracking              |
| `returns/{returnId}`   | Return requests                    |
| `refunds/{refundId}`   | Refund records                     |
| `reviews/{reviewId}`   | Product reviews                    |
| `wishlists/{userId}`   | Wishlist items                     |
| `notifications/{id}`   | Notification events                |
| `coupons/{couponId}`   | Coupon definitions                 |

---

## 38. TECHNOLOGY STACK

| Layer         | Technology                            |
|--------------|---------------------------------------|
| Frontend     | React, TypeScript, Vite, Tailwind CSS |
| Routing      | React Router v6                       |
| Forms        | React Hook Form + Zod                 |
| State        | Zustand (cart, wishlist), Context (auth) |
| Backend      | Node.js, Express, TypeScript          |
| Database     | Firebase Firestore                    |
| Auth         | Firebase Authentication               |
| Payments     | Razorpay                              |
| Shipping     | Shiprocket, Delhivery                 |
| Email        | SMTP / Nodemailer                     |
| Maps         | Google Maps API (optional)            |
| Security     | Helmet, CSP, CORS, Rate Limiting, HMAC |
| SEO          | Meta tags, OG tags, JSON-LD, Sitemap  |

---

## 39. COMPLETE ORDER LIFECYCLE

```
Browse → Product → Add to Cart → Cart → Login (if not)
  → Address → Shipping → Coupon (optional)
  → Server Validation → Razorpay Order Created
  → Razorpay Checkout → Payment
  → HMAC Signature Verification
  → Webhook → Order Confirmed
  → Inventory Deducted → Shipment Created
  → Shiprocket / Delhivery → AWB
  → Tracking Updates → Out for Delivery → Delivered
  → Review Option → (Potential Return → Refund)
```

---

*Last updated: 2026-08-13*
*Document: CUSTOMER_ARCHITECTURE.md*
