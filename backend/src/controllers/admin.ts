import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { adminDb, adminAuth } from '../config/firebase';
import { getAuditLogs as fetchAuditLogs, logAdminAction } from '../services/auditService';
import { notificationService } from '../services/notification';
import { ReturnRequest, Order, Refund } from '../types';
import { createRazorpayRefund } from '../services/razorpay';

export const getDashboardMetrics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Run all counts in parallel
    const [
      productsSnap,
      usersSnap,
      allOrdersSnap,
      todayOrdersSnap,
      pendingOrdersSnap,
      returnRequestsSnap,
      refundsPendingSnap,
      recentOrdersSnap,
    ] = await Promise.all([
      adminDb.collection('products').count().get(),
      adminDb.collection('users').count().get(),
      adminDb.collection('orders').where('status', 'not-in', ['CANCELLED', 'PAYMENT_FAILED']).get(),
      adminDb.collection('orders').where('createdAt', '>=', todayStart).get(),
      adminDb.collection('orders').where('status', '==', 'PLACED').count().get(),
      adminDb.collection('returns').where('status', '==', 'REQUESTED').count().get(),
      adminDb.collection('refunds').where('status', 'in', ['REQUESTED', 'PROCESSING']).count().get(),
      adminDb.collection('orders').orderBy('createdAt', 'desc').limit(5).get(),
    ]);

    // Calculate revenue from all non-cancelled orders
    const allOrders = allOrdersSnap.docs.map(d => d.data() as any);
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Today's revenue
    const todayOrders = todayOrdersSnap.docs.map(d => d.data() as any);
    const todayRevenue = todayOrders
      .filter(o => !['CANCELLED', 'PAYMENT_FAILED'].includes(o.status))
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const todayOrderCount = todayOrders.length;

    // Month revenue — fetch by date only (adding status filter requires composite index)
    const monthOrdersSnap = await adminDb.collection('orders')
      .where('createdAt', '>=', monthStart)
      .get();
    const monthRevenue = monthOrdersSnap.docs
      .filter(d => !['CANCELLED', 'PAYMENT_FAILED'].includes((d.data() as any).status))
      .reduce((sum, d) => sum + ((d.data() as any).total || 0), 0);

    // Low stock: products with any size where stock <= reorderLevel
    const productsSnapshot = await adminDb.collection('products').where('isActive', '==', true).get();
    let lowStockCount = 0;
    let pendingShipmentsCount = 0;
    productsSnapshot.docs.forEach(doc => {
      const p = doc.data() as any;
      const haslowSize = (p.sizes || []).some((s: any) => (s.stock || 0) <= (s.reorderLevel || 5));
      if (haslowSize) lowStockCount++;
    });

    // Pending shipments: orders confirmed but no shipment
    const confirmedOrdersSnap = await adminDb.collection('orders')
      .where('status', 'in', ['CONFIRMED', 'PROCESSING', 'PACKED'])
      .get();
    const shipmentsSnap = await adminDb.collection('shipments').get();
    const shippedOrderIds = new Set(shipmentsSnap.docs.map(d => (d.data() as any).orderId));
    pendingShipmentsCount = confirmedOrdersSnap.docs.filter(d => !shippedOrderIds.has(d.id)).length;

    const recentOrders = recentOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({
      revenue: {
        total: Math.round(totalRevenue),
        today: Math.round(todayRevenue),
        month: Math.round(monthRevenue),
      },
      orders: {
        total: allOrdersSnap.size,
        today: todayOrderCount,
        pending: pendingOrdersSnap.data().count,
        pendingShipments: pendingShipmentsCount,
      },
      products: {
        total: productsSnap.data().count,
        lowStock: lowStockCount,
      },
      customers: {
        total: usersSnap.data().count,
      },
      returnRequests: returnRequestsSnap.data().count,
      refundsPending: refundsPendingSnap.data().count,
      recentOrders,
      alerts: [
        pendingShipmentsCount > 0 ? { type: 'orders', message: `${pendingShipmentsCount} order${pendingShipmentsCount > 1 ? 's' : ''} awaiting shipment`, link: '/admin/orders?status=CONFIRMED' } : null,
        lowStockCount > 0 ? { type: 'inventory', message: `${lowStockCount} product${lowStockCount > 1 ? 's' : ''} with low stock`, link: '/admin/inventory/low-stock' } : null,
        returnRequestsSnap.data().count > 0 ? { type: 'returns', message: `${returnRequestsSnap.data().count} return request${returnRequestsSnap.data().count > 1 ? 's' : ''} pending`, link: '/admin/returns' } : null,
        refundsPendingSnap.data().count > 0 ? { type: 'refunds', message: `${refundsPendingSnap.data().count} refund${refundsPendingSnap.data().count > 1 ? 's' : ''} pending`, link: '/admin/refunds' } : null,
        pendingOrdersSnap.data().count > 0 ? { type: 'orders', message: `${pendingOrdersSnap.data().count} new order${pendingOrdersSnap.data().count > 1 ? 's' : ''} to confirm`, link: '/admin/orders?status=PLACED' } : null,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error('getDashboardMetrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const pageToken = req.query.pageToken as string | undefined;
    
    const result = await fetchAuditLogs(limit, pageToken);
    res.json(result);
  } catch (error) {
    console.error('getAuditLogs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import * as productService from '../services/product';

export const getProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, category, status, featured } = req.query;
    let query: FirebaseFirestore.Query = adminDb.collection('products').orderBy('createdAt', 'desc');

    if (category) query = query.where('category', '==', category);
    if (featured === 'true') query = query.where('isFeatured', '==', true);
    if (status === 'active') query = query.where('isActive', '==', true);
    if (status === 'inactive') query = query.where('isActive', '==', false);

    const snapshot = await query.get();
    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    if (search) {
      const q = (search as string).toLowerCase();
      products = products.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    }

    res.json(products);
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = await adminDb.collection('products').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('getProductById error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Whitelist allowed fields to prevent injection of unexpected data
    const allowedFields = [
      'name', 'brand', 'category', 'description', 'price', 'salePrice', 'discountPrice',
      'images', 'sizes', 'isActive', 'isFeatured', 'isNewArrival', 'slug', 'fit',
      'productStatus', 'tags', 'specifications'
    ];
    const sanitized: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) sanitized[field] = req.body[field];
    }
    const product = await productService.createProduct(sanitized);
    await logAdminAction(req.user!.uid, 'CREATE_PRODUCT', 'product', product.id);
    res.status(201).json(product);
  } catch (error) {
    console.error('createProduct error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Whitelist allowed fields
    const allowedFields = [
      'name', 'brand', 'category', 'description', 'price', 'salePrice', 'discountPrice',
      'images', 'sizes', 'isActive', 'isFeatured', 'isNewArrival', 'slug', 'fit',
      'productStatus', 'tags', 'specifications'
    ];
    const sanitized: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) sanitized[field] = req.body[field];
    }
    const product = await productService.updateProduct(req.params.id as string, sanitized);
    await logAdminAction(req.user!.uid, 'UPDATE_PRODUCT', 'product', req.params.id as string);
    res.json(product);
  } catch (error) {
    console.error('updateProduct error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await productService.deleteProduct(req.params.id as string);
    await logAdminAction(req.user!.uid, 'DELETE_PRODUCT', 'product', req.params.id as string);
    res.json({ success: true });
  } catch (error) {
    console.error('deleteProduct error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, shipmentStatus, cancelReason, cancelledBy } = req.body;

    // Validate status against allowed enum values
    const validStatuses = [
      'PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPMENT_CREATED',
      'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
      'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED',
      'REFUND_PENDING', 'REFUNDED'
    ];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }
    const validShipmentStatuses = [
      'NOT_REQUIRED', 'PENDING', 'CREATING', 'CREATED', 'AWB_ASSIGNED',
      'READY_TO_SHIP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY',
      'DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED'
    ];
    if (shipmentStatus && !validShipmentStatuses.includes(shipmentStatus)) {
      return res.status(400).json({ error: 'Invalid shipment status' });
    }

    const orderRef = adminDb.collection('orders').doc(id);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (status) updateData.status = status;
    if (shipmentStatus) updateData.shipmentStatus = shipmentStatus;
    if (status === 'CANCELLED') {
      updateData.cancelReason = cancelReason || 'Cancelled by admin';
      updateData.cancelledBy = cancelledBy || 'admin';
    }

    // Deduct inventory when order is marked as PACKED
    if (status === 'PACKED' && !(orderData as any).inventoryDeducted) {
      updateData.inventoryDeducted = true;
      for (const item of orderData.items || []) {
        try {
          const productRef = adminDb.collection('products').doc(item.productId);
          const productDoc = await productRef.get();
          if (productDoc.exists) {
            const pData = productDoc.data();
            const sizes = pData?.sizes || [];
            const updatedSizes = sizes.map((s: any) => {
              if (String(s.size).trim() === String(item.size).trim()) {
                return { ...s, stock: Math.max(0, Number(s.stock || 0) - Number(item.quantity || 1)) };
              }
              return s;
            });
            const updatedTotalStock = updatedSizes.reduce((acc: number, cur: any) => acc + (Number(cur.stock) || 0), 0);

            await productRef.update({
              sizes: updatedSizes,
              stock: updatedTotalStock,
              updatedAt: new Date().toISOString()
            });

            // Record inventory adjustment log
            await adminDb.collection('inventoryHistory').add({
              productId: item.productId,
              productName: pData?.name || item.name,
              size: item.size,
              previousStock: sizes.find((s: any) => String(s.size).trim() === String(item.size).trim())?.stock || 0,
              newStock: updatedSizes.find((s: any) => String(s.size).trim() === String(item.size).trim())?.stock || 0,
              changeAmount: -Number(item.quantity || 1),
              reason: `Order #${id.slice(-8).toUpperCase()} packed`,
              adjustedBy: req.user!.uid,
              timestamp: new Date().toISOString()
            });
          }
        } catch (invErr) {
          console.error(`Failed to update stock for product ${item.productId}:`, invErr);
        }
      }
    }

    await orderRef.update(updateData);
    await logAdminAction(req.user!.uid, 'UPDATE_ORDER_STATUS', 'order', id, updateData);

    // Auto-create shipment is DISABLED — admin must manually book from Order Detail page
    // after entering package weight/dimensions and comparing rates

    // If order is CANCELLED, cancel any existing shipment
    if (status === 'CANCELLED') {
      const { shippingService } = await import('../services/shipping');
      shippingService.cancelShipment(id).catch(err => {
        console.error('Shipment cancellation failed:', err);
      });
    }

    // Trigger emails for admin status updates
    if (status && status !== orderData.status) {
      adminDb.collection('users').doc(orderData.customerId).get().then(userDoc => {
        const userData = userDoc.exists ? userDoc.data() : null;
        const email = userData?.email;
        const name = userData?.name || userData?.firstName || orderData.shippingAddress?.fullName || 'Customer';
        if (email) {
          if (status === 'CONFIRMED') {
            notificationService.sendOrderConfirmation(orderData, email, name).catch(console.error);
          } else if (status === 'SHIPPED') {
            notificationService.sendShipmentUpdate(id, orderData.customerId, email, name, 'SHIPPED', orderData.shipping?.trackingUrl).catch(console.error);
          } else if (status === 'DELIVERED') {
            notificationService.sendShipmentUpdate(id, orderData.customerId, email, name, 'DELIVERED', orderData.shipping?.trackingUrl).catch(console.error);
          }
        }
      }).catch(console.error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// NOTIFICATION LOGS
// ==========================================

export const getNotificationLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limitCount = parseInt(req.query.limit as string) || 100;
    const snapshot = await adminDb.collection('notificationEvents').orderBy('processedAt', 'desc').limit(limitCount).get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(logs);
  } catch (error) {
    console.error('getNotificationLogs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const snapshot = await adminDb.collection('users').orderBy('createdAt', 'desc').limit(limit).offset(offset).get();

    // Batch-fetch order counts
    const customerIds = snapshot.docs.map(doc => doc.id);
    const orderCounts: Record<string, number> = {};

    // Fetch all orders for these customers in one query per customer (unavoidable with Firestore)
    // But we parallelize them
    await Promise.all(customerIds.map(async (id) => {
      const countSnap = await adminDb.collection('orders').where('customerId', '==', id).count().get();
      orderCounts[id] = countSnap.data().count;
    }));

    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        name: data.name || data.displayName,
        phone: data.phone,
        createdAt: data.createdAt,
        lastLogin: data.lastLogin,
        totalOrders: orderCounts[doc.id] || 0,
      };
    });

    res.json({ users, total: users.length });
  } catch (error) {
    console.error('getCustomers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCoupons = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const snapshot = await adminDb.collection('coupons').orderBy('createdAt', 'desc').get();
    const coupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(coupons);
  } catch (error) {
    console.error('getCoupons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCoupon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, type, value, maxDiscount, minCartValue, firstOrderOnly, productRestrictions, categoryRestrictions, usageLimit, perCustomerLimit, startDate, endDate, status } = req.body;
    const couponRef = adminDb.collection('coupons').doc();
    const data = {
      code: String(code || '').toUpperCase().trim(),
      type: ['percentage', 'fixed', 'free_shipping'].includes(type) ? type : 'percentage',
      value: Number(value) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      minCartValue: Number(minCartValue) || 0,
      firstOrderOnly: Boolean(firstOrderOnly),
      productRestrictions: Array.isArray(productRestrictions) ? productRestrictions : [],
      categoryRestrictions: Array.isArray(categoryRestrictions) ? categoryRestrictions : [],
      usageLimit: usageLimit ? Number(usageLimit) : null,
      perCustomerLimit: perCustomerLimit ? Number(perCustomerLimit) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      status: ['active', 'paused', 'inactive'].includes(status) ? status : 'active',
      createdAt: new Date().toISOString(),
      usedCount: 0
    };
    await couponRef.set(data);
    await logAdminAction(req.user!.uid, 'CREATE_COUPON', 'coupon', couponRef.id, data);
    res.status(201).json({ id: couponRef.id, ...data });
  } catch (error) {
    console.error('createCoupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCoupon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { code, type, value, maxDiscount, minCartValue, firstOrderOnly, productRestrictions, categoryRestrictions, usageLimit, perCustomerLimit, startDate, endDate, status } = req.body;
    const data: any = { updatedAt: new Date().toISOString() };
    if (code !== undefined) data.code = String(code).toUpperCase().trim();
    if (type !== undefined) data.type = ['percentage', 'fixed', 'free_shipping'].includes(type) ? type : undefined;
    if (value !== undefined) data.value = Number(value);
    if (maxDiscount !== undefined) data.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    if (minCartValue !== undefined) data.minCartValue = Number(minCartValue);
    if (firstOrderOnly !== undefined) data.firstOrderOnly = Boolean(firstOrderOnly);
    if (productRestrictions !== undefined) data.productRestrictions = Array.isArray(productRestrictions) ? productRestrictions : [];
    if (categoryRestrictions !== undefined) data.categoryRestrictions = Array.isArray(categoryRestrictions) ? categoryRestrictions : [];
    if (usageLimit !== undefined) data.usageLimit = usageLimit ? Number(usageLimit) : null;
    if (perCustomerLimit !== undefined) data.perCustomerLimit = perCustomerLimit ? Number(perCustomerLimit) : null;
    if (startDate !== undefined) data.startDate = startDate;
    if (endDate !== undefined) data.endDate = endDate;
    if (status !== undefined) data.status = ['active', 'paused', 'inactive'].includes(status) ? status : undefined;
    // Remove undefined values
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    await adminDb.collection('coupons').doc(id as string).update(data);
    await logAdminAction(req.user!.uid, 'UPDATE_COUPON', 'coupon', id as string, data);
    res.json({ id, ...data });
  } catch (error) {
    console.error('updateCoupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCoupon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    // Soft-delete: set status to 'inactive' instead of hard deleting
    await adminDb.collection('coupons').doc(id).update({ status: 'inactive', deletedAt: new Date().toISOString() });
    await logAdminAction(req.user!.uid, 'DELETE_COUPON', 'coupon', id, {});
    res.json({ success: true });
  } catch (error) {
    console.error('deleteCoupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = await adminDb.collection('settings').doc('store').get();
    res.json(doc.exists ? doc.data() : {});
  } catch (error) {
    console.error('getSettings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { storeName, storeLogo, storeEmail, storePhone, storeAddress, currency, timezone, shippingProvider, freeShippingThreshold, defaultShippingFee, pickupAddress, taxRate, taxInclusive, seoTitle, seoDescription, ogImage, googleVerification } = req.body;
    const data: any = { updatedAt: new Date().toISOString() };
    if (storeName !== undefined) data.storeName = String(storeName);
    if (storeLogo !== undefined) data.storeLogo = String(storeLogo);
    if (storeEmail !== undefined) data.storeEmail = String(storeEmail);
    if (storePhone !== undefined) data.storePhone = String(storePhone);
    if (storeAddress !== undefined) data.storeAddress = String(storeAddress);
    if (currency !== undefined) data.currency = String(currency);
    if (timezone !== undefined) data.timezone = String(timezone);
    if (shippingProvider !== undefined) data.shippingProvider = String(shippingProvider);
    if (freeShippingThreshold !== undefined) data.freeShippingThreshold = Number(freeShippingThreshold);
    if (defaultShippingFee !== undefined) data.defaultShippingFee = Number(defaultShippingFee);
    if (pickupAddress !== undefined) data.pickupAddress = String(pickupAddress);
    if (taxRate !== undefined) data.taxRate = Number(taxRate);
    if (taxInclusive !== undefined) data.taxInclusive = Boolean(taxInclusive);
    if (seoTitle !== undefined) data.seoTitle = String(seoTitle);
    if (seoDescription !== undefined) data.seoDescription = String(seoDescription);
    if (ogImage !== undefined) data.ogImage = String(ogImage);
    if (googleVerification !== undefined) data.googleVerification = String(googleVerification);
    await adminDb.collection('settings').doc('store').set(data, { merge: true });
    await logAdminAction(req.user!.uid, 'UPDATE_SETTINGS', 'settings', 'store', data);
    res.json({ success: true });
  } catch (error) {
    console.error('updateSettings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// COD SETTINGS
// ==========================================

export const getCodSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = await adminDb.collection('settings').doc('cod').get();
    const defaults = { enabled: true, minAmount: 0, maxAmount: 10000, blockedPincodes: [] };
    res.json(doc.exists ? { ...defaults, ...doc.data() } : defaults);
  } catch (error) {
    console.error('getCodSettings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCodSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enabled, minAmount, maxAmount, blockedPincodes } = req.body;
    const data = {
      enabled: Boolean(enabled),
      minAmount: Number(minAmount) || 0,
      maxAmount: Number(maxAmount) || 0,
      blockedPincodes: Array.isArray(blockedPincodes) ? blockedPincodes.map(String) : [],
    };
    await adminDb.collection('settings').doc('cod').set(data, { merge: true });
    await logAdminAction(req.user!.uid, 'UPDATE_COD_SETTINGS', 'settings', 'cod', data);
    res.json({ success: true });
  } catch (error) {
    console.error('updateCodSettings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// ==========================================
// CATALOG SETTINGS (Categories & Brands)
// ==========================================

export const getCatalogSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = await adminDb.collection('settings').doc('catalog').get();
    res.json(doc.exists ? doc.data() : { categories: [], brands: [], sizes: [] });
  } catch (error) {
    console.error('getCatalogSettings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCatalogSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categories, brands, sizes } = req.body;
    const data = {
      categories: Array.isArray(categories) ? categories : [],
      brands: Array.isArray(brands) ? brands : [],
      sizes: Array.isArray(sizes) ? sizes : [],
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection('settings').doc('catalog').set(data, { merge: true });
    await logAdminAction(req.user!.uid, 'UPDATE_CATALOG_SETTINGS', 'settings', 'catalog', data);
    res.json({ success: true });
  } catch (error) {
    console.error('updateCatalogSettings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReturns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const snapshot = await adminDb.collection('returns').orderBy('createdAt', 'desc').get();
    const returns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(returns);
  } catch (error) {
    console.error('getReturns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReturnStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, condition } = req.body;
    
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const returnRef = adminDb.collection('returns').doc(id as string);
    const returnDoc = await returnRef.get();
    if (!returnDoc.exists) return res.status(404).json({ error: 'Return request not found' });
    
    const returnData = returnDoc.data() as ReturnRequest;
    
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    if (status === 'APPROVED' || status === 'REJECTED') {
      updateData.reviewedAt = new Date().toISOString();
      updateData.reviewedBy = req.user!.uid;
      if (status === 'APPROVED') updateData.approvedAt = new Date().toISOString();
      if (status === 'REJECTED') updateData.rejectedAt = new Date().toISOString();
    }
    
    if (status === 'RECEIVED') {
      updateData.completedAt = new Date().toISOString();
    }

    let refundCreated = false;
    let refundRef = null;
    let rzpRefundData = null;

    // We process refund immediately upon RECEIVED for simplicity in this flow, or if they manually trigger REFUND_PENDING
    if (status === 'RECEIVED' || status === 'REFUND_PENDING') {
      const orderRef = adminDb.collection('orders').doc(returnData.orderId);
      const orderDoc = await orderRef.get();
      if (orderDoc.exists) {
        const orderData = orderDoc.data() as Order;
        if (orderData.paymentStatus === 'captured' && orderData.paymentId) {
          // Calculate refundable amount. Simplistic approach: sum of returned items price * quantity
          const refundAmount = returnData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          if (refundAmount > 0) {
            rzpRefundData = await createRazorpayRefund(orderData.paymentId, refundAmount, returnData.orderId, { reason: returnData.reason });
            refundCreated = true;
            refundRef = adminDb.collection('refunds').doc();
          }
        }
      }
    }

    await adminDb.runTransaction(async (transaction) => {
      const txReturnDoc = await transaction.get(returnRef);
      if (!txReturnDoc.exists) return;
      const txReturn = txReturnDoc.data() as ReturnRequest;
      
      // Prevent double refunding
      if (txReturn.status === 'REFUNDED' || txReturn.status === 'RECEIVED') {
        return; 
      }

      transaction.update(returnRef, updateData);

      const orderRef = adminDb.collection('orders').doc(txReturn.orderId);

      // If condition is RESELLABLE, restore inventory
      if (status === 'RECEIVED' && condition === 'RESELLABLE') {
        for (const item of txReturn.items) {
          const productRef = adminDb.collection('products').doc(item.productId);
          const productDoc = await transaction.get(productRef);
          
          if (productDoc.exists) {
            const productData = productDoc.data();
            const sizes = productData?.sizes || [];
            const updatedSizes = sizes.map((s: any) => {
              if (s.size === item.size) {
                return { ...s, stock: s.stock + item.quantity };
              }
              return s;
            });
            transaction.update(productRef, { sizes: updatedSizes });
          }
        }
      }

      if (refundCreated && refundRef && rzpRefundData) {
        const orderDoc = await transaction.get(orderRef);
        const orderData = orderDoc.data() as Order;

        const refundObj: Refund = {
          id: refundRef.id,
          orderId: txReturn.orderId,
          paymentId: orderData.paymentId,
          customerId: txReturn.customerId,
          amount: returnData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          currency: 'INR',
          reason: txReturn.reason,
          status: 'PROCESSING',
          razorpayRefundId: rzpRefundData.id,
          initiatedBy: req.user!.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        transaction.set(refundRef, refundObj);
        
        transaction.update(returnRef, { refundId: refundRef.id });
      }

      if (status === 'APPROVED' || status === 'REJECTED' || status === 'RECEIVED' || status === 'REFUND_PENDING') {
         transaction.update(orderRef, {
           status: status === 'RECEIVED' || status === 'REFUND_PENDING' ? 'REFUND_PENDING' : `RETURN_${status}`,
           updatedAt: new Date().toISOString()
         });
      }
    });

    await logAdminAction(req.user!.uid, 'UPDATE_RETURN_STATUS', 'return', id as string, { status, condition });

    // Fire and forget notifications
    adminDb.collection('users').doc(returnData.customerId).get().then(userDoc => {
      if (userDoc.exists) {
        const userData = userDoc.data();
        const email = userData?.email;
        const name = userData?.name || userData?.firstName || 'Customer';
        if (email) {
          const typeMap: Record<string, 'RETURN_APPROVED' | 'RETURN_REJECTED' | 'RETURN_REQUESTED'> = {
            'APPROVED': 'RETURN_APPROVED',
            'REJECTED': 'RETURN_REJECTED'
          };
          const notifType = typeMap[status] || 'RETURN_REQUESTED';
          let statusText = status;
          if (status === 'APPROVED') statusText = 'Approved';
          if (status === 'REJECTED') statusText = 'Rejected';
          if (status === 'RECEIVED') statusText = 'Received';
          
          notificationService.sendReturnUpdate(returnData.orderId, returnData.customerId, email, name, statusText, notifType).catch(console.error);
        }
      }
    }).catch(console.error);

    res.json({ success: true });
  } catch (error) {
    console.error('updateReturnStatus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRefunds = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const snapshot = await adminDb.collection('refunds').orderBy('createdAt', 'desc').limit(limit).get();

    // Batch-fetch related orders
    const orderIds = [...new Set(snapshot.docs.map(d => (d.data() as any).orderId).filter(Boolean))];
    const ordersMap = new Map<string, any>();
    await Promise.all(orderIds.map(async (oid) => {
      const doc = await adminDb.collection('orders').doc(oid).get();
      if (doc.exists) ordersMap.set(oid, doc.data());
    }));

    // Batch-fetch related users
    const customerIds = [...new Set([...ordersMap.values()].map(o => o?.customerId).filter(Boolean))];
    const usersMap = new Map<string, any>();
    await Promise.all(customerIds.map(async (uid) => {
      const doc = await adminDb.collection('users').doc(uid).get();
      if (doc.exists) usersMap.set(uid, doc.data());
    }));

    const refunds = snapshot.docs.map(doc => {
      const r = { id: doc.id, ...doc.data() } as any;
      const order = ordersMap.get(r.orderId);
      if (order) {
        const user = usersMap.get(order.customerId);
        if (user) {
          r.customerName = user.name || user.displayName;
          r.customerEmail = user.email;
        }
      }
      return r;
    });
    res.json(refunds);
  } catch (error) {
    console.error('getRefunds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRefund = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, notes } = req.body;
    const data: any = { updatedAt: new Date().toISOString() };
    if (status !== undefined) data.status = ['REQUESTED', 'PROCESSING', 'PROCESSED', 'FAILED'].includes(status) ? status : undefined;
    if (notes !== undefined) data.notes = String(notes);
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    await adminDb.collection('refunds').doc(id).update(data);
    await logAdminAction(req.user!.uid, 'UPDATE_REFUND', 'refund', id, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('updateRefund error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// ==========================================
// REVIEWS
// ==========================================

export const getReviews = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    
    let query: FirebaseFirestore.Query = adminDb.collection('reviews');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    
    const reviews: any[] = [];
    snapshot.forEach(doc => {
      reviews.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort in memory to avoid Firestore composite index requirement
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Apply limit after sorting
    const paginatedReviews = reviews.slice(0, limit);
    
    res.json(paginatedReviews);
  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

export const updateReviewStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body; // 'APPROVED' | 'REJECTED' | 'HIDDEN' | 'PENDING'
    
    if (!['APPROVED', 'REJECTED', 'HIDDEN', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const reviewRef = adminDb.collection('reviews').doc(id);
    const reviewDoc = await reviewRef.get();
    
    if (!reviewDoc.exists) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    const reviewData = reviewDoc.data() as any;
    const previousStatus = reviewData.status;
    
    // Perform transaction to update product aggregates if status changes involving APPROVED
    await adminDb.runTransaction(async (transaction) => {
      const productRef = adminDb.collection('products').doc(reviewData.productId);
      const productDoc = await transaction.get(productRef);
      
      let newAverage = 0;
      let newCount = 0;
      
      if (productDoc.exists) {
        const productData = productDoc.data() as any;
        let currentAverage = productData.ratings?.average || 0;
        let currentCount = productData.ratings?.count || 0;
        
        // Calculate the sum
        let currentSum = currentAverage * currentCount;
        
        // If it WAS approved, remove its rating from the sum
        if (previousStatus === 'APPROVED' && status !== 'APPROVED') {
          currentSum -= reviewData.rating;
          currentCount -= 1;
        }
        
        // If it is NOW approved, add its rating to the sum
        if (previousStatus !== 'APPROVED' && status === 'APPROVED') {
          currentSum += reviewData.rating;
          currentCount += 1;
        }
        
        // Recalculate average
        newCount = Math.max(0, currentCount);
        newAverage = newCount === 0 ? 0 : currentSum / newCount;
        
        transaction.update(productRef, {
          ratings: {
            average: parseFloat(newAverage.toFixed(1)),
            count: newCount
          }
        });
      }
      
      transaction.update(reviewRef, { 
        status, 
        updatedAt: new Date().toISOString() 
      });
    });
    
    await logAdminAction(req.user!.uid, 'UPDATE_REVIEW', 'review', id, {
      previousStatus,
      newStatus: status
    });
    
    res.json({ message: 'Review status updated successfully', id, status });
  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({ error: 'Failed to update review status' });
  }
};

// ==========================================
// CUSTOMER 360
// ==========================================

export const getCustomerById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const userDoc = await adminDb.collection('users').doc(id).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Customer not found' });

    const [ordersSnap, returnsSnap, refundsSnap, reviewsSnap] = await Promise.all([
      adminDb.collection('orders').where('customerId', '==', id).get(),
      adminDb.collection('returns').where('customerId', '==', id).get(),
      adminDb.collection('refunds').where('customerId', '==', id).get(),
      adminDb.collection('reviews').where('customerId', '==', id).get(),
    ]);

    const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const totalSpent = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    const returns = returnsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    returns.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const refunds = refundsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    refunds.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const reviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    reviews.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    res.json({
      id: userDoc.id,
      ...userDoc.data(),
      totalSpent,
      orders,
      returns,
      refunds,
      reviews,
    });
  } catch (error) {
    console.error('getCustomerById error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// INVENTORY
// ==========================================

export const getInventory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const snapshot = await adminDb.collection('products').where('isActive', '==', true).get();
    const rows: any[] = [];

    let totalSKUs = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let estimatedValue = 0;

    snapshot.docs.forEach(doc => {
      const p = { id: doc.id, ...doc.data() } as any;
      const sizes = p.sizes || [];
      sizes.forEach((s: any) => {
        const reorderLevel = s.reorderLevel || 5;
        const stock = s.stock || 0;
        totalSKUs++;
        if (stock === 0) outOfStockCount++;
        else if (stock <= reorderLevel) lowStockCount++;
        estimatedValue += stock * (s.price || p.price || 0);
        rows.push({
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          image: p.images?.[0],
          size: s.size,
          sku: s.sku || `${p.id}-${s.size}`,
          stock,
          reorderLevel,
          status: stock === 0 ? 'OUT_OF_STOCK' : stock <= reorderLevel ? 'LOW_STOCK' : 'IN_STOCK',
          updatedAt: p.updatedAt,
        });
      });
    });

    const overview = { totalSKUs, lowStockCount, outOfStockCount, estimatedValue };
    res.json({ items: rows, overview });
  } catch (error) {
    console.error('getInventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLowStockInventory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const snapshot = await adminDb.collection('products').where('isActive', '==', true).get();
    const rows: any[] = [];

    let totalSKUs = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let estimatedValue = 0;

    snapshot.docs.forEach(doc => {
      const p = { id: doc.id, ...doc.data() } as any;
      (p.sizes || []).forEach((s: any) => {
        const reorderLevel = s.reorderLevel || 5;
        const stock = s.stock || 0;
        totalSKUs++;
        if (stock === 0) outOfStockCount++;
        else if (stock <= reorderLevel) lowStockCount++;
        estimatedValue += stock * (s.price || p.price || 0);
        if (stock <= reorderLevel) {
          rows.push({
            productId: p.id,
            productName: p.name,
            brand: p.brand,
            image: p.images?.[0],
            size: s.size,
            sku: s.sku || `${p.id}-${s.size}`,
            stock,
            reorderLevel,
            status: stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            updatedAt: p.updatedAt,
          });
        }
      });
    });

    const overview = { totalSKUs, lowStockCount, outOfStockCount, estimatedValue };
    res.json({ items: rows, overview });
  } catch (error) {
    console.error('getLowStockInventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const adjustStock = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, size, adjustment, reason, notes } = req.body;
    if (!productId || !size || adjustment === undefined || !reason) {
      return res.status(400).json({ error: 'productId, size, adjustment and reason are required' });
    }

    const productRef = adminDb.collection('products').doc(productId as string);
    const productDoc = await productRef.get();
    if (!productDoc.exists) return res.status(404).json({ error: 'Product not found' });

    const product = productDoc.data() as any;
    const sizes = product.sizes || [];
    const sizeIdx = sizes.findIndex((s: any) => s.size === size);
    if (sizeIdx === -1) return res.status(404).json({ error: 'Size not found on product' });

    const oldQty = sizes[sizeIdx].stock || 0;
    const newQty = Math.max(0, oldQty + Number(adjustment));
    sizes[sizeIdx] = { ...sizes[sizeIdx], stock: newQty };

    await productRef.update({ sizes, updatedAt: new Date().toISOString() });

    // Write history record
    const historyRef = adminDb.collection('inventoryHistory').doc();
    await historyRef.set({
      productId,
      productName: product.name,
      size,
      oldQty,
      newQty,
      adjustment: Number(adjustment),
      reason,
      notes: notes || '',
      adminUserId: req.user!.uid,
      createdAt: new Date().toISOString(),
    });

    await logAdminAction(req.user!.uid, 'STOCK_ADJUSTMENT', 'product', productId as string, { size, oldQty, newQty, reason });

    res.json({ success: true, oldQty, newQty });
  } catch (error) {
    console.error('adjustStock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInventoryHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const snapshot = await adminDb.collection('inventoryHistory').orderBy('createdAt', 'desc').limit(limit).get();
    const history = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(history);
  } catch (error) {
    console.error('getInventoryHistory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// SHIPMENTS
// ==========================================

export const getShipments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const snapshot = await adminDb.collection('shipments').orderBy('createdAt', 'desc').limit(limit).get();

    // Batch-fetch related orders
    const orderIds = [...new Set(snapshot.docs.map(d => (d.data() as any).orderId).filter(Boolean))];
    const ordersMap = new Map<string, any>();
    await Promise.all(orderIds.map(async (oid) => {
      const doc = await adminDb.collection('orders').doc(oid).get();
      if (doc.exists) ordersMap.set(oid, doc.data());
    }));

    // Batch-fetch related users
    const customerIds = [...new Set([...ordersMap.values()].map(o => o?.customerId).filter(Boolean))];
    const usersMap = new Map<string, any>();
    await Promise.all(customerIds.map(async (uid) => {
      const doc = await adminDb.collection('users').doc(uid).get();
      if (doc.exists) usersMap.set(uid, doc.data());
    }));

    const shipments = snapshot.docs.map(doc => {
      const s = { id: doc.id, ...doc.data() } as any;
      const order = ordersMap.get(s.orderId);
      if (order) {
        s.orderTotal = order.total;
        const user = usersMap.get(order.customerId);
        if (user) {
          s.customerName = user.name || user.displayName;
          s.customerEmail = user.email;
        }
      }
      return s;
    });
    res.json(shipments);
  } catch (error) {
    console.error('getShipments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// PAYMENTS
// ==========================================

export const getPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const snapshot = await adminDb.collection('payments').orderBy('createdAt', 'desc').limit(limit).get();

    // Batch-fetch related orders
    const orderIds = [...new Set(snapshot.docs.map(d => (d.data() as any).orderId).filter(Boolean))];
    const ordersMap = new Map<string, any>();
    await Promise.all(orderIds.map(async (oid) => {
      const doc = await adminDb.collection('orders').doc(oid).get();
      if (doc.exists) ordersMap.set(oid, doc.data());
    }));

    // Batch-fetch related users
    const customerIds = [...new Set([...ordersMap.values()].map(o => o?.customerId).filter(Boolean))];
    const usersMap = new Map<string, any>();
    await Promise.all(customerIds.map(async (uid) => {
      const doc = await adminDb.collection('users').doc(uid).get();
      if (doc.exists) usersMap.set(uid, doc.data());
    }));

    const payments = snapshot.docs.map(doc => {
      const p = { id: doc.id, ...doc.data() } as any;
      const order = ordersMap.get(p.orderId);
      if (order) {
        p.orderTotal = order.total;
        const user = usersMap.get(order.customerId);
        if (user) {
          p.customerName = user.name || user.displayName;
          p.customerEmail = user.email;
        }
      }
      return p;
    });
    res.json(payments);
  } catch (error) {
    console.error('getPayments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// MARKETING — BANNERS
// ==========================================

export const getBanners = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const snap = await adminDb.collection('banners').orderBy('order', 'asc').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (error) {
    console.error('getBanners error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBanner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, subtitle, imageUrl, mobileImageUrl, ctaText, ctaLink, order, active, startDate, endDate } = req.body;
    const doc = await adminDb.collection('banners').add({
      title: String(title || ''),
      subtitle: String(subtitle || ''),
      imageUrl: String(imageUrl || ''),
      mobileImageUrl: String(mobileImageUrl || ''),
      ctaText: String(ctaText || ''),
      ctaLink: String(ctaLink || ''),
      order: Number(order) || 0,
      active: active !== false,
      startDate: startDate || null,
      endDate: endDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    res.status(201).json({ id: doc.id });
  } catch (error) {
    console.error('createBanner error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBanner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, subtitle, imageUrl, mobileImageUrl, ctaText, ctaLink, order, active, startDate, endDate } = req.body;
    const data: any = { updatedAt: new Date().toISOString() };
    if (title !== undefined) data.title = String(title);
    if (subtitle !== undefined) data.subtitle = String(subtitle);
    if (imageUrl !== undefined) data.imageUrl = String(imageUrl);
    if (mobileImageUrl !== undefined) data.mobileImageUrl = String(mobileImageUrl);
    if (ctaText !== undefined) data.ctaText = String(ctaText);
    if (ctaLink !== undefined) data.ctaLink = String(ctaLink);
    if (order !== undefined) data.order = Number(order);
    if (active !== undefined) data.active = Boolean(active);
    if (startDate !== undefined) data.startDate = startDate;
    if (endDate !== undefined) data.endDate = endDate;
    await adminDb.collection('banners').doc(id).update(data);
    res.json({ success: true });
  } catch (error) {
    console.error('updateBanner error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteBanner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await adminDb.collection('banners').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('deleteBanner error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// ANALYTICS
// ==========================================

const getDateRange = (range: string): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case 'today': start.setHours(0, 0, 0, 0); break;
    case '7d': start.setDate(start.getDate() - 7); break;
    case '90d': start.setDate(start.getDate() - 90); break;
    default: start.setDate(start.getDate() - 30); // 30d default
  }
  return { start, end };
};

export const getSalesAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';
    const { start } = getDateRange(range);

    const snap = await adminDb.collection('orders').where('createdAt', '>=', start.toISOString()).get();
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    const validOrders = orders.filter(o => !['CANCELLED', 'PAYMENT_FAILED'].includes(o.status));
    const totalRevenue = validOrders.reduce((s, o) => s + (o.total || 0), 0);
    const avgOrderValue = validOrders.length ? totalRevenue / validOrders.length : 0;
    const cancellationRate = orders.length ? ((orders.filter(o => o.status === 'CANCELLED').length / orders.length) * 100).toFixed(1) : '0';

    // Group by status
    const byStatus: Record<string, { count: number; revenue: number }> = {};
    orders.forEach(o => {
      if (!byStatus[o.status]) byStatus[o.status] = { count: 0, revenue: 0 };
      byStatus[o.status].count++;
      if (!['CANCELLED', 'PAYMENT_FAILED'].includes(o.status)) byStatus[o.status].revenue += o.total || 0;
    });

    // Group by day
    const byDayMap: Record<string, { orders: number; revenue: number }> = {};
    validOrders.forEach(o => {
      const day = o.createdAt?.split('T')[0] || 'unknown';
      if (!byDayMap[day]) byDayMap[day] = { orders: 0, revenue: 0 };
      byDayMap[day].orders++;
      byDayMap[day].revenue += o.total || 0;
    });
    const byDay = Object.entries(byDayMap)
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      totalRevenue: Math.round(totalRevenue),
      totalOrders: orders.length,
      avgOrderValue: Math.round(avgOrderValue),
      cancellationRate,
      byStatus,
      byDay,
    });
  } catch (error) {
    console.error('getSalesAnalytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';
    const { start } = getDateRange(range);

    const snap = await adminDb.collection('orders')
      .where('createdAt', '>=', start.toISOString())
      .where('status', 'not-in', ['CANCELLED', 'PAYMENT_FAILED'])
      .get();
    const orders = snap.docs.map(d => d.data() as any);

    // Aggregate units + revenue by product
    const productMap: Record<string, { name: string; brand: string; unitsSold: number; revenue: number }> = {};
    const categoryMap: Record<string, { orders: number; revenue: number }> = {};

    orders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        const pid = item.productId;
        if (!productMap[pid]) productMap[pid] = { name: item.name, brand: item.brand || '', unitsSold: 0, revenue: 0 };
        productMap[pid].unitsSold += item.quantity || 1;
        productMap[pid].revenue += (item.price || 0) * (item.quantity || 1);

        const cat = item.category || 'Other';
        if (!categoryMap[cat]) categoryMap[cat] = { orders: 0, revenue: 0 };
        categoryMap[cat].orders++;
        categoryMap[cat].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });

    const topSelling = Object.entries(productMap)
      .map(([, v]) => v)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 20);

    const topCategories = Object.entries(categoryMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({ topSelling, topCategories });
  } catch (error) {
    console.error('getProductAnalytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomerAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';
    const { start } = getDateRange(range);

    const allOrders = await adminDb.collection('orders')
      .where('status', 'not-in', ['CANCELLED', 'PAYMENT_FAILED'])
      .get();

    const periodOrders = await adminDb.collection('orders')
      .where('createdAt', '>=', start.toISOString())
      .where('status', 'not-in', ['CANCELLED', 'PAYMENT_FAILED'])
      .get();

    // Customers with their order history
    const customerMap: Record<string, { orderCount: number; totalSpent: number; firstOrderDate: string }> = {};
    allOrders.docs.forEach(doc => {
      const o = doc.data() as any;
      const cid = o.customerId;
      if (!cid) return;
      if (!customerMap[cid]) customerMap[cid] = { orderCount: 0, totalSpent: 0, firstOrderDate: o.createdAt };
      customerMap[cid].orderCount++;
      customerMap[cid].totalSpent += o.total || 0;
      if (o.createdAt < customerMap[cid].firstOrderDate) customerMap[cid].firstOrderDate = o.createdAt;
    });

    const customerIds = Object.keys(customerMap);
    const newCustomers = customerIds.filter(id => customerMap[id].firstOrderDate >= start.toISOString()).length;
    const returningCustomers = customerIds.filter(id => customerMap[id].orderCount > 1).length;
    const avgLTV = customerIds.length ? Object.values(customerMap).reduce((s, c) => s + c.totalSpent, 0) / customerIds.length : 0;

    // Top customers by spend — fetch their user docs
    const topCustomerIds = Object.entries(customerMap)
      .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
      .slice(0, 10)
      .map(([id]) => id);

    const topCustomers = await Promise.all(topCustomerIds.map(async id => {
      const userDoc = await adminDb.collection('users').doc(id).get();
      const u = userDoc.exists ? userDoc.data()! : {};
      return {
        id,
        name: (u as any).displayName || (u as any).name || 'N/A',
        email: (u as any).email || '',
        orderCount: customerMap[id].orderCount,
        totalSpent: Math.round(customerMap[id].totalSpent),
      };
    }));

    res.json({
      newCustomers,
      returningCustomers,
      avgLTV: Math.round(avgLTV),
      topCustomers,
    });
  } catch (error) {
    console.error('getCustomerAnalytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// ADMIN USERS & ROLES
// ==========================================

export const getAdminUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const snapshot = await adminDb.collection('users').where('isAdmin', '==', true).get();
    const admins = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        name: data.name || data.displayName,
        role: data.role || 'ADMIN',
        createdAt: data.createdAt,
        lastLogin: data.lastLogin,
      };
    });
    res.json(admins);
  } catch (error) {
    console.error('getAdminUsers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAdminUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, name, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'INVENTORY_MANAGER', 'CONTENT_MANAGER', 'SUPPORT'];
    const assignedRole = validRoles.includes(role) ? role : 'ADMIN';

    // Check if user exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch {
      return res.status(404).json({ error: 'User not found. They must sign up first.' });
    }

    // Set admin claim
    await adminAuth.setCustomUserClaims(userRecord.uid, { admin: true });

    // Update Firestore profile
    await adminDb.collection('users').doc(userRecord.uid).update({
      isAdmin: true,
      role: assignedRole,
      updatedAt: new Date().toISOString(),
    });

    await logAdminAction(req.user!.uid, 'CREATE_ADMIN_USER', 'user', userRecord.uid, { email, role: assignedRole });
    res.status(201).json({ id: userRecord.uid, email, name, role: assignedRole });
  } catch (error) {
    console.error('createAdminUser error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAdminUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { role, name } = req.body;

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'INVENTORY_MANAGER', 'CONTENT_MANAGER', 'SUPPORT'];
    const updateData: any = { updatedAt: new Date().toISOString() };
    if (role && validRoles.includes(role)) updateData.role = role;
    if (name) updateData.name = String(name);

    await adminDb.collection('users').doc(id).update(updateData);
    await logAdminAction(req.user!.uid, 'UPDATE_ADMIN_USER', 'user', id, updateData);
    res.json({ success: true });
  } catch (error) {
    console.error('updateAdminUser error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAdminUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    // Remove admin claim
    await adminAuth.setCustomUserClaims(id, { admin: false });

    // Update Firestore
    await adminDb.collection('users').doc(id).update({
      isAdmin: false,
      role: null,
      updatedAt: new Date().toISOString(),
    });

    await logAdminAction(req.user!.uid, 'DELETE_ADMIN_USER', 'user', id);
    res.json({ success: true });
  } catch (error) {
    console.error('deleteAdminUser error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// PRODUCT SIZE CRUD
// ==========================================

export const addProductSize = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { size, sku, stock, reorderLevel } = req.body;

    if (!size) return res.status(400).json({ error: 'Size is required' });

    const productRef = adminDb.collection('products').doc(id);
    const productDoc = await productRef.get();
    if (!productDoc.exists) return res.status(404).json({ error: 'Product not found' });

    const product = productDoc.data() as any;
    const sizes = product.sizes || [];

    // Check for duplicate size
    if (sizes.some((s: any) => String(s.size).trim() === String(size).trim())) {
      return res.status(400).json({ error: 'Size already exists on this product' });
    }

    const newSize = {
      size: String(size).trim(),
      sku: sku || `${id}-${size}`,
      stock: Number(stock) || 0,
      reorderLevel: Number(reorderLevel) || 5,
    };
    sizes.push(newSize);

    const totalStock = sizes.reduce((acc: number, cur: any) => acc + (Number(cur.stock) || 0), 0);
    await productRef.update({ sizes, stock: totalStock, updatedAt: new Date().toISOString() });

    await logAdminAction(req.user!.uid, 'ADD_PRODUCT_SIZE', 'product', id, newSize);
    res.status(201).json(newSize);
  } catch (error) {
    console.error('addProductSize error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProductSize = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const size = String(req.params.size);
    const { sku, stock, reorderLevel } = req.body;

    const productRef = adminDb.collection('products').doc(id);
    const productDoc = await productRef.get();
    if (!productDoc.exists) return res.status(404).json({ error: 'Product not found' });

    const product = productDoc.data() as any;
    const sizes = product.sizes || [];
    const sizeIdx = sizes.findIndex((s: any) => String(s.size).trim() === String(size).trim());
    if (sizeIdx === -1) return res.status(404).json({ error: 'Size not found' });

    if (sku !== undefined) sizes[sizeIdx].sku = String(sku);
    if (stock !== undefined) sizes[sizeIdx].stock = Number(stock);
    if (reorderLevel !== undefined) sizes[sizeIdx].reorderLevel = Number(reorderLevel);

    const totalStock = sizes.reduce((acc: number, cur: any) => acc + (Number(cur.stock) || 0), 0);
    await productRef.update({ sizes, stock: totalStock, updatedAt: new Date().toISOString() });

    await logAdminAction(req.user!.uid, 'UPDATE_PRODUCT_SIZE', 'product', id, { size, sku, stock, reorderLevel });
    res.json(sizes[sizeIdx]);
  } catch (error) {
    console.error('updateProductSize error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProductSize = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const size = String(req.params.size);

    const productRef = adminDb.collection('products').doc(id);
    const productDoc = await productRef.get();
    if (!productDoc.exists) return res.status(404).json({ error: 'Product not found' });

    const product = productDoc.data() as any;
    const sizes = (product.sizes || []).filter((s: any) => String(s.size).trim() !== String(size).trim());

    if (sizes.length === (product.sizes || []).length) {
      return res.status(404).json({ error: 'Size not found' });
    }

    const totalStock = sizes.reduce((acc: number, cur: any) => acc + (Number(cur.stock) || 0), 0);
    await productRef.update({ sizes, stock: totalStock, updatedAt: new Date().toISOString() });

    await logAdminAction(req.user!.uid, 'DELETE_PRODUCT_SIZE', 'product', id, { size });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteProductSize error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==========================================
// FEATURED / NEW ARRIVALS MANAGEMENT
// ==========================================

export const toggleProductFeatured = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { isFeatured } = req.body;

    await adminDb.collection('products').doc(id).update({
      isFeatured: Boolean(isFeatured),
      updatedAt: new Date().toISOString(),
    });

    await logAdminAction(req.user!.uid, 'TOGGLE_PRODUCT_FEATURED', 'product', id, { isFeatured });
    res.json({ success: true, isFeatured: Boolean(isFeatured) });
  } catch (error) {
    console.error('toggleProductFeatured error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleProductNewArrival = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { isNewArrival } = req.body;

    await adminDb.collection('products').doc(id).update({
      isNewArrival: Boolean(isNewArrival),
      updatedAt: new Date().toISOString(),
    });

    await logAdminAction(req.user!.uid, 'TOGGLE_PRODUCT_NEW_ARRIVAL', 'product', id, { isNewArrival });
    res.json({ success: true, isNewArrival: Boolean(isNewArrival) });
  } catch (error) {
    console.error('toggleProductNewArrival error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

