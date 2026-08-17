import { Router } from 'express';
import { getDashboardMetrics, createProduct, updateProduct, deleteProduct, getProducts, getProductById, getAuditLogs, updateOrderStatus, getCustomers, getCustomerById, getCoupons, createCoupon, updateCoupon, deleteCoupon, getSettings, updateSettings, getCodSettings, updateCodSettings, getCatalogSettings, updateCatalogSettings, getReturns, updateReturnStatus, getRefunds, updateRefund, getReviews, updateReviewStatus, getNotificationLogs, getInventory, getLowStockInventory, adjustStock, getInventoryHistory, getShipments, getPayments, getBanners, createBanner, updateBanner, deleteBanner, getSalesAnalytics, getProductAnalytics, getCustomerAnalytics, getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, addProductSize, updateProductSize, deleteProductSize, toggleProductFeatured, toggleProductNewArrival } from '../controllers/admin';
import { getOrders, getOrderById } from '../controllers/orders';
import { getShippingRates, bookShipment, cancelShipment, syncTracking, getShipmentLabel, bulkSyncTracking } from '../controllers/shipping';
import { verifyIdToken } from '../middleware/verifyIdToken';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

router.use(verifyIdToken);
router.use(requireAdmin);

router.get('/metrics', getDashboardMetrics);
router.get('/audit-logs', getAuditLogs);

// Product Management
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Order Management
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id/status', updateOrderStatus);

// Customer Management
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);

// Notification Logs
router.get('/notification-logs', getNotificationLogs);

// Coupon Management
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Settings Management
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// COD Settings
router.get('/cod-settings', getCodSettings);
router.put('/cod-settings', updateCodSettings);

// Catalog Settings (Categories & Brands)
router.get('/catalog-settings', getCatalogSettings);
router.put('/catalog-settings', updateCatalogSettings);

// Shipping Management
router.get('/shipments', getShipments);
router.get('/orders/:orderId/shipment/rates', getShippingRates);
router.post('/orders/:orderId/shipment', bookShipment);
router.post('/orders/:orderId/shipment/cancel', cancelShipment);
router.get('/orders/:orderId/shipment/sync', syncTracking);
router.get('/orders/:orderId/shipment/label', getShipmentLabel);
router.post('/shipments/bulk-sync', bulkSyncTracking);

// Returns & Refunds
router.get('/returns', getReturns);
router.put('/returns/:id/status', updateReturnStatus);
router.get('/refunds', getRefunds);
router.put('/refunds/:id', updateRefund);

// Reviews
router.get('/reviews', getReviews);
router.put('/reviews/:id/status', updateReviewStatus);

// Inventory
router.get('/inventory', getInventory);
router.get('/inventory/low-stock', getLowStockInventory);
router.post('/inventory/adjust', adjustStock);
router.get('/inventory/history', getInventoryHistory);

// Payments
router.get('/payments', getPayments);

// Marketing / Homepage
router.get('/marketing/banners', getBanners);
router.post('/marketing/banners', createBanner);
router.put('/marketing/banners/:id', updateBanner);
router.delete('/marketing/banners/:id', deleteBanner);

// Analytics
router.get('/analytics/sales', getSalesAnalytics);
router.get('/analytics/products', getProductAnalytics);
router.get('/analytics/customers', getCustomerAnalytics);

// Admin Users & Roles
router.get('/users', getAdminUsers);
router.post('/users', createAdminUser);
router.put('/users/:id', updateAdminUser);
router.delete('/users/:id', deleteAdminUser);

// Product Size CRUD
router.post('/products/:id/sizes', addProductSize);
router.put('/products/:id/sizes/:size', updateProductSize);
router.delete('/products/:id/sizes/:size', deleteProductSize);

// Product Toggles
router.put('/products/:id/featured', toggleProductFeatured);
router.put('/products/:id/new-arrival', toggleProductNewArrival);

export default router;

