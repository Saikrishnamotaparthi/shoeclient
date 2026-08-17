import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PageLayout from './layouts/PageLayout';
import { ProtectedRoute, AdminRoute } from './features/auth/RouteGuards';
import GoogleOnboarding from './features/auth/GoogleOnboarding';

// ── Eagerly loaded (above-the-fold critical pages) ──────────────────────────
import HomePage from './features/shop/HomePage';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';

// ── Lazily loaded customer pages ─────────────────────────────────────────────
const ShopPage = lazy(() => import('./features/shop/ShopPage'));
const ProductDetailPage = lazy(() => import('./features/shop/ProductDetailPage'));
const SearchPage = lazy(() => import('./features/shop/SearchPage'));
const OrderConfirmationPage = lazy(() => import('./features/shop/OrderConfirmationPage'));
const TrackOrderPage = lazy(() => import('./features/shop/TrackOrderPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const CartPage = lazy(() => import('./features/cart/CartPage'));
const CheckoutPage = lazy(() => import('./features/cart/CheckoutPage'));
const PaymentPage = lazy(() => import('./features/cart/PaymentPage'));

// Account
const AccountPage = lazy(() => import('./features/account/AccountPage'));
const AccountLayout = lazy(() => import('./features/account/AccountLayout'));
const ProfilePage = lazy(() => import('./features/account/ProfilePage'));
const AddressesPage = lazy(() => import('./features/account/AddressesPage'));
const OrdersPage = lazy(() => import('./features/account/OrdersPage'));
const OrderDetailPage = lazy(() => import('./features/account/OrderDetailPage'));
const WishlistPage = lazy(() => import('./features/account/WishlistPage').then(m => ({ default: m.WishlistPage })));
const ReviewsPage = lazy(() => import('./features/account/ReviewsPage'));
const ReturnsPage = lazy(() => import('./features/account/ReturnsPage'));
const NotificationsPage = lazy(() => import('./features/account/NotificationsPage'));

// Content pages
const AboutPage = lazy(() => import('./features/content/AboutPage'));
const ContactPage = lazy(() => import('./features/content/ContactPage'));
const FaqPage = lazy(() => import('./features/content/FaqPage'));
const PolicyPage = lazy(() => import('./features/content/PolicyPage'));

// 404
const NotFound = lazy(() => import('./components/ui/NotFound').then(m => ({ default: m.NotFound })));

// ── Admin pages (lazily loaded) ───────────────────────────────────────────────
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import('./features/admin/AdminProducts').then(m => ({ default: m.AdminProducts })));
const AdminProductForm = lazy(() => import('./features/admin/AdminProductForm'));
const AdminInventory = lazy(() => import('./features/admin/AdminInventory').then(m => ({ default: m.AdminInventory })));
const AdminOrders = lazy(() => import('./features/admin/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminOrderDetail = lazy(() => import('./features/admin/AdminOrderDetail').then(m => ({ default: m.AdminOrderDetail })));
const AdminShipments = lazy(() => import('./features/admin/AdminShipments').then(m => ({ default: m.AdminShipments })));
const AdminCustomers = lazy(() => import('./features/admin/AdminCustomers').then(m => ({ default: m.AdminCustomers })));
const AdminCustomerDetail = lazy(() => import('./features/admin/AdminCustomerDetail').then(m => ({ default: m.AdminCustomerDetail })));
const AdminPayments = lazy(() => import('./features/admin/AdminPayments').then(m => ({ default: m.AdminPayments })));
const AdminCoupons = lazy(() => import('./features/admin/AdminCoupons').then(m => ({ default: m.AdminCoupons })));
const AdminSettings = lazy(() => import('./features/admin/AdminSettings').then(m => ({ default: m.AdminSettings })));
const AdminAuditLogs = lazy(() => import('./features/admin/AdminAuditLogs').then(m => ({ default: m.AdminAuditLogs })));
const AdminReturns = lazy(() => import('./features/admin/AdminReturns').then(m => ({ default: m.AdminReturns })));
const AdminRefunds = lazy(() => import('./features/admin/AdminRefunds').then(m => ({ default: m.AdminRefunds })));
const AdminReviews = lazy(() => import('./features/admin/AdminReviews'));
const NotificationLogs = lazy(() => import('./features/admin/NotificationLogs').then(m => ({ default: m.NotificationLogs })));
const AdminMarketing = lazy(() => import('./features/admin/AdminMarketing').then(m => ({ default: m.AdminMarketing })));
const AdminAnalytics = lazy(() => import('./features/admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminCatalogSettings = lazy(() => import('./features/admin/AdminCatalogSettings').then(m => ({ default: m.AdminCatalogSettings })));
const AdminCodSettings = lazy(() => import('./features/admin/AdminCodSettings').then(m => ({ default: m.AdminCodSettings })));
const AdminUsers = lazy(() => import('./features/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));

// ── Suspense fallback ─────────────────────────────────────────────────────────
const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <>
      {/* Google onboarding modal — shown globally when user lacks phone */}
      <GoogleOnboarding />

      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* ── Customer routes (with Header/Footer) ── */}
          <Route element={<PageLayout />}>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:slug" element={<ProductDetailPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />

            {/* Content pages */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/shipping-policy" element={<PolicyPage policy="shipping" />} />
            <Route path="/return-policy" element={<PolicyPage policy="returns" />} />
            <Route path="/privacy-policy" element={<PolicyPage policy="privacy" />} />
            <Route path="/terms" element={<PolicyPage policy="terms" />} />

            {/* Protected customer routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/payment" element={<PaymentPage />} />

              {/* Account section (all under AccountLayout) */}
              <Route path="/account" element={<AccountLayout />}>
                <Route index element={<AccountPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="addresses" element={<AddressesPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="reviews" element={<ReviewsPage />} />
                <Route path="returns" element={<ReturnsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ── Admin routes (no Header/Footer) ── */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />

            {/* Catalog */}
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/products/add" element={<AdminProductForm />} />
            <Route path="/admin/products/:id/edit" element={<AdminProductForm />} />
            <Route path="/admin/inventory" element={<AdminInventory />} />
            <Route path="/admin/inventory/low-stock" element={<AdminInventory />} />
            <Route path="/admin/inventory/adjust" element={<AdminInventory />} />
            <Route path="/admin/inventory/history" element={<AdminInventory />} />
            <Route path="/admin/catalog-settings" element={<AdminCatalogSettings />} />

            {/* Sales */}
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
            <Route path="/admin/shipments" element={<AdminShipments />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
            <Route path="/admin/customers/:id" element={<AdminCustomerDetail />} />

            {/* Finance */}
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/coupons" element={<AdminCoupons />} />
            <Route path="/admin/refunds" element={<AdminRefunds />} />
            <Route path="/admin/cod-settings" element={<AdminCodSettings />} />

            {/* Customer Service */}
            <Route path="/admin/returns" element={<AdminReturns />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/notification-logs" element={<NotificationLogs />} />

            {/* Marketing */}
            <Route path="/admin/marketing" element={<AdminMarketing />} />

            {/* Analytics */}
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/reports" element={<AdminAnalytics />} />

            {/* System */}
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/admin-users" element={<AdminUsers />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
