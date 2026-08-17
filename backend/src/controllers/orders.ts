import { Response } from 'express';
import { adminDb } from '../config/firebase';
import { createRazorpayOrder } from '../services/razorpay';
import { validateCart } from '../services/checkout';
import { Order } from '../types';
import { Query } from 'firebase-admin/firestore';
import { AuthenticatedRequest } from '../types/auth';
import { shippingService } from '../services/shipping';
import { notificationService } from '../services/notification';

export const getOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requestedUserId = req.query.userId as string;
    if (requestedUserId && requestedUserId !== userId && !req.user?.admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const targetUserId = req.user?.admin ? (requestedUserId || null) : userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const status = req.query.status as string;

    let query: Query = adminDb.collection('orders');
    if (targetUserId) query = query.where('customerId', '==', targetUserId);
    if (status) query = query.where('status', '==', status);

    const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();
    const orders = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    res.json({ orders, total: orders.length });
  } catch (error) {
    console.error('getOrders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { verifyPaymentSignature } from '../services/razorpay';
import { FieldValue } from 'firebase-admin/firestore';
import { Payment } from '../types';

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { items, shippingAddress, couponCode, paymentMethod = 'RAZORPAY' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain items' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Idempotency: check for a recent pending order from same user (within 5 min)
    // Use only customerId filter to avoid composite index requirement
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const recentOrdersSnap = await adminDb.collection('orders')
      .where('customerId', '==', userId)
      .limit(10)
      .get();

    for (const doc of recentOrdersSnap.docs) {
      const data = doc.data() as any;
      if (data.paymentStatus === 'created' && data.razorpayOrderId) {
        const createdAt = new Date(data.createdAt).getTime();
        if (createdAt >= fiveMinAgo) {
          // Return existing order instead of creating a new one
          return res.status(201).json({
            orderId: doc.id,
            razorpayOrderId: data.razorpayOrderId,
            amount: Math.round(data.total * 100),
            currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID,
          });
        }
      }
    }

    // 1. Validate cart and calculate authoritative total
    const validationResult = await validateCart({ items, couponCode });

    const orderRef = adminDb.collection('orders').doc();
    const orderId = orderRef.id;

    const sanitizedItems = validationResult.items.map(item => ({
      productId: item.productId,
      name: item.name,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
      image: item.image || ''
    }));

    // Validate and sanitize shipping address
    if (!shippingAddress || typeof shippingAddress !== 'object') {
      return res.status(400).json({ error: 'Shipping address is required' });
    }
    const addr = shippingAddress as any;
    if (!addr.fullName || !addr.phone || !addr.street || !addr.city || !addr.state || !addr.pincode) {
      return res.status(400).json({ error: 'Shipping address missing required fields' });
    }
    // Sanitize: coerce to strings and limit lengths
    const cleanAddress = {
      id: String(addr.id || '').slice(0, 100),
      fullName: String(addr.fullName).slice(0, 200),
      phone: String(addr.phone).replace(/\D/g, '').slice(0, 13),
      street: String(addr.street).slice(0, 500),
      landmark: String(addr.landmark || '').slice(0, 200),
      city: String(addr.city).slice(0, 100),
      state: String(addr.state).slice(0, 100),
      pincode: String(addr.pincode).replace(/\D/g, '').slice(0, 6),
      isDefault: Boolean(addr.isDefault),
    };

    if (paymentMethod === 'COD') {
      const newOrder: any = {
        id: orderId,
        customerId: userId,
        items: sanitizedItems,
        subtotal: validationResult.subtotal,
        shippingFee: validationResult.shipping,
        discount: validationResult.discount || 0,
        total: validationResult.total,
        shippingAddress: cleanAddress,
        status: 'PLACED',
        paymentStatus: 'created',
        shipmentStatus: 'PENDING',
        paymentMethod: 'COD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (validationResult.couponApplied?.code) {
        newOrder.couponCode = validationResult.couponApplied.code;
      }

      const paymentRef = adminDb.collection('payments').doc();
      const newPayment: Payment = {
        id: paymentRef.id,
        orderId: orderId,
        amount: validationResult.total,
        currency: 'INR',
        method: 'COD',
        status: 'created',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const batch = adminDb.batch();
      batch.set(orderRef, newOrder);
      batch.set(paymentRef, newPayment);
      await batch.commit();

      // Send Order Placement Confirmation Email to customer
      adminDb.collection('users').doc(userId).get().then(userDoc => {
        const userData = userDoc.exists ? userDoc.data() : null;
        const email = userData?.email;
        const name = userData?.name || userData?.firstName || cleanAddress?.fullName || 'Customer';
        if (email) {
          notificationService.sendOrderConfirmation(newOrder, email, name).catch(console.error);
        }
      }).catch(console.error);

      return res.status(201).json({
        orderId,
        success: true,
        paymentMethod: 'COD'
      });
    }

    // 2. Create Razorpay order (with authoritative total)
    let rzpOrder;
    try {
      rzpOrder = await createRazorpayOrder(validationResult.total, orderId);
    } catch (rzpErr: any) {
      console.error('Razorpay order creation failed:', rzpErr);
      return res.status(400).json({ error: rzpErr.error?.description || rzpErr.message || 'Payment gateway failed to initialize. Please check Razorpay keys.' });
    }

    // 3. Prepare full order object
    const newOrder: any = {
      id: orderId,
      customerId: userId,
      items: sanitizedItems,
      subtotal: validationResult.subtotal,
      shippingFee: validationResult.shipping,
      discount: validationResult.discount || 0,
      total: validationResult.total,
      shippingAddress: cleanAddress,
      status: 'PLACED',
      paymentStatus: 'created',
      shipmentStatus: 'NOT_REQUIRED',
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: rzpOrder.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (validationResult.couponApplied?.code) {
      newOrder.couponCode = validationResult.couponApplied.code;
    }

    // 4. Prepare payment record
    const paymentRef = adminDb.collection('payments').doc();
    const newPayment: Payment = {
      id: paymentRef.id,
      orderId: orderId,
      razorpayOrderId: rzpOrder.id,
      amount: validationResult.total,
      currency: 'INR',
      method: 'RAZORPAY',
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save preliminary order and payment to Firestore
    const batch = adminDb.batch();
    batch.set(orderRef, newOrder);
    batch.set(paymentRef, newPayment);
    await batch.commit();

    // Return the razorpay order id to the frontend to complete payment
    res.status(201).json({
      orderId,
      razorpayOrderId: rzpOrder.id,
      amount: Math.round(validationResult.total * 100),
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error: any) {
    console.error('createOrder error:', error);
    res.status(400).json({ error: 'Failed to create order' });
  }
};

export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // 1. Verify cryptographic signature
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // 2. Fetch the order and verify ownership
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = orderDoc.data() as Order;
    
    if (orderData.customerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 3. Check Idempotency
    if (orderData.paymentStatus === 'captured' || orderData.status === 'CONFIRMED') {
      // Already processed, safely return success
      return res.json({ success: true, message: 'Payment already verified' });
    }

    if (orderData.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ error: 'Order mismatch' });
    }

    // 4. Process updates transactionally to deduct inventory and finalize order
    await adminDb.runTransaction(async (transaction) => {
      // Re-read order in transaction to ensure concurrency safety
      const txOrderDoc = await transaction.get(orderRef);
      const txOrderData = txOrderDoc.data() as Order;
      
      if (txOrderData.paymentStatus === 'captured') {
        return; // Already processed
      }

      // Fetch payment doc to update its status
      const paymentQuery = await transaction.get(
        adminDb.collection('payments').where('razorpayOrderId', '==', razorpayOrderId).limit(1)
      );
      
      let paymentRef = null;
      if (!paymentQuery.empty) {
        paymentRef = paymentQuery.docs[0].ref;
      }

      // Decrement inventory for each item
      for (const item of txOrderData.items) {
        const productRef = adminDb.collection('products').doc(item.productId);
        const productDoc = await transaction.get(productRef);
        
        if (productDoc.exists) {
          const productData = productDoc.data();
          const sizes = productData?.sizes || [];
          const updatedSizes = sizes.map((s: any) => {
            if (s.size === item.size) {
              return { ...s, stock: Math.max(0, s.stock - item.quantity) };
            }
            return s;
          });
          transaction.update(productRef, { sizes: updatedSizes });
        }
      }

      // Increment coupon usage if a coupon was used
      if (txOrderData.couponCode) {
        const couponsQuery = await transaction.get(
          adminDb.collection('coupons').where('code', '==', txOrderData.couponCode).limit(1)
        );
        if (!couponsQuery.empty) {
          const couponRef = couponsQuery.docs[0].ref;
          transaction.update(couponRef, { usedCount: FieldValue.increment(1) });
        }
      }

      // Update Order status
      transaction.update(orderRef, {
        status: 'CONFIRMED',
        paymentStatus: 'captured',
        shipmentStatus: 'PENDING',
        paymentId: razorpayPaymentId,
        updatedAt: new Date().toISOString()
      });

      // Update Payment status
      if (paymentRef) {
        transaction.update(paymentRef, {
          status: 'captured',
          id: razorpayPaymentId, // Using razorpay payment id as record id if needed, or just update doc
          updatedAt: new Date().toISOString()
        });
      } else {
        // If payment doc wasn't found (fallback), create one
        const newPaymentRef = adminDb.collection('payments').doc(razorpayPaymentId);
        transaction.set(newPaymentRef, {
          id: razorpayPaymentId,
          orderId: orderId,
          razorpayOrderId: razorpayOrderId,
          amount: txOrderData.total,
          currency: 'INR',
          method: 'RAZORPAY',
          status: 'captured',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    // Send Payment Success and Order Confirmation Emails to customer
    const verifiedOrderDoc = await orderRef.get();
    const verifiedOrderData = verifiedOrderDoc.data() as Order;
    adminDb.collection('users').doc(userId).get().then(userDoc => {
      const userData = userDoc.exists ? userDoc.data() : null;
      const email = userData?.email;
      const name = userData?.name || userData?.firstName || 'Customer';
      if (email) {
        notificationService.sendPaymentSuccess({ ...verifiedOrderData, id: orderId } as any, email, name).catch(console.error);
        notificationService.sendOrderConfirmation({ ...verifiedOrderData, id: orderId } as any, email, name).catch(console.error);
      }
    }).catch(console.error);

    res.json({ success: true, message: 'Payment verified and order is confirmed' });
  } catch (error) {
    console.error('verifyPayment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { createRazorpayRefund } from '../services/razorpay';
import { logCustomerAction } from '../services/auditService';
import { Refund, ReturnRequest } from '../types';

export const cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const orderId = req.params.id as string;
    const { reason, note } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const orderRef = adminDb.collection('orders').doc(orderId);
    
    await adminDb.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) throw new Error('Order not found');

      const orderData = orderDoc.data() as Order;
      if (orderData.customerId !== userId) throw new Error('Forbidden');

      // Check allowed states (PACKED also allowed since shipment may not be booked yet)
      if (!['PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(orderData.status)) {
        throw new Error('Order cannot be cancelled in its current state');
      }

      // Try cancelling shipment (outside transaction mostly, but we can do it here if it's safe or pre-transaction)
      // Note: In Firestore, it's not ideal to do external API calls inside a transaction, but for this simplified flow, we'll verify it first
    });

    // We do external ops outside transaction
    const orderDoc = await orderRef.get();
    const orderData = orderDoc.data() as Order;
    
    const shipmentCancelled = await shippingService.cancelShipment(orderId);
    if (!shipmentCancelled && !['NOT_REQUIRED', 'PENDING'].includes(orderData.shipmentStatus)) {
       return res.status(400).json({ error: 'Cannot cancel order as shipment is already in progress' });
    }

    // Determine refund
    let refundCreated = false;
    let refundRef = null;
    let rzpRefundData = null;

    if (orderData.paymentStatus === 'captured' && orderData.paymentId && orderData.total > 0) {
       // Create razorpay refund (outside transaction)
       rzpRefundData = await createRazorpayRefund(orderData.paymentId, orderData.total, orderId, { reason });
       refundCreated = true;
       refundRef = adminDb.collection('refunds').doc();
    }

    // Now final transaction
    await adminDb.runTransaction(async (transaction) => {
      // Re-read inside tx
      const txOrderDoc = await transaction.get(orderRef);
      const txOrder = txOrderDoc.data() as Order;

      if (txOrder.status === 'CANCELLED') return; // already cancelled

      transaction.update(orderRef, {
        status: 'CANCELLED',
        cancelReason: reason || 'Customer request',
        cancelledBy: 'customer',
        updatedAt: new Date().toISOString()
      });

      if (refundCreated && refundRef && rzpRefundData) {
        const refundObj: Refund = {
          id: refundRef.id,
          orderId,
          paymentId: txOrder.paymentId,
          customerId: userId,
          amount: txOrder.total,
          currency: 'INR',
          reason: reason || 'Customer Cancellation',
          status: 'PROCESSING', // will update via webhook
          razorpayRefundId: rzpRefundData.id,
          initiatedBy: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        transaction.set(refundRef, refundObj);
      }

      // Restore inventory
      for (const item of txOrder.items) {
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
    });

    await logCustomerAction(userId, 'CANCEL_ORDER', 'order', orderId, { reason, note });

    // Fire and forget notifications
    adminDb.collection('users').doc(userId).get().then(userDoc => {
      if (userDoc.exists) {
        const userData = userDoc.data();
        const email = userData?.email;
        const name = userData?.name || userData?.firstName || 'Customer';
        if (email) {
          notificationService.sendOrderCancelled(orderData, email, name, reason).catch(console.error);
        }
      }
    }).catch(console.error);

    res.json({ success: true });
  } catch (error: any) {
    console.error('cancelOrder error:', error);
    res.status(400).json({ error: 'Failed to cancel order' });
  }
};

export const requestReturn = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const orderId = req.params.id as string;
    const { items, reason, note } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const orderRef = adminDb.collection('orders').doc(orderId);
    
    await adminDb.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) throw new Error('Order not found');

      const orderData = orderDoc.data() as Order;
      if (orderData.customerId !== userId) throw new Error('Forbidden');

      if (orderData.status !== 'DELIVERED') {
        throw new Error('Order must be delivered to request a return');
      }

      // Check for existing return requests for this order
      const existingReturns = await transaction.get(
        adminDb.collection('returns').where('orderId', '==', orderId).limit(1)
      );

      if (!existingReturns.empty) {
         throw new Error('Return request already exists for this order');
      }

      // Validate items
      const requestedItems = [];
      for (const reqItem of items) {
        const orderItem = orderData.items.find(i => i.productId === reqItem.productId && i.size === reqItem.size);
        if (!orderItem) throw new Error('Invalid item requested for return');
        if (reqItem.quantity > orderItem.quantity) throw new Error('Invalid quantity for return');
        
        requestedItems.push({
          productId: orderItem.productId,
          size: orderItem.size,
          quantity: reqItem.quantity,
          price: orderItem.price // Secure pricing
        });
      }

      const returnRef = adminDb.collection('returns').doc();
      const returnReq: ReturnRequest = {
        id: returnRef.id,
        orderId,
        customerId: userId,
        items: requestedItems,
        reason,
        customerNote: note,
        status: 'REQUESTED',
        requestedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transaction.set(returnRef, returnReq);
      transaction.update(orderRef, {
        status: 'RETURN_REQUESTED',
        updatedAt: new Date().toISOString()
      });
    });

    await logCustomerAction(userId, 'REQUEST_RETURN', 'order', orderId, { reason, note });

    // Fire and forget notifications
    adminDb.collection('users').doc(userId).get().then(userDoc => {
      if (userDoc.exists) {
        const userData = userDoc.data();
        const email = userData?.email;
        const name = userData?.name || userData?.firstName || 'Customer';
        if (email) {
          notificationService.sendReturnUpdate(orderId, userId, email, name, 'Return requested', 'RETURN_REQUESTED').catch(console.error);
        }
      }
    }).catch(console.error);

    res.json({ success: true });
  } catch (error: any) {
    console.error('requestReturn error:', error);
    res.status(400).json({ error: 'Failed to request return' });
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const orderDoc = await adminDb.collection('orders').doc(id as string).get();
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });

    const order = { id: orderDoc.id, ...orderDoc.data() } as any;

    // Check ownership unless admin
    const isAdmin = req.user?.admin === true;
    if (!isAdmin && order.customerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch customer info
    if (order.customerId) {
      const userDoc = await adminDb.collection('users').doc(order.customerId).get();
      if (userDoc.exists) {
        const u = userDoc.data()!;
        order.customer = { name: u.name || u.displayName, email: u.email, phone: u.phone };
      }
    }

    // Fetch shipment info
    const shipmentSnap = await adminDb.collection('shipments').where('orderId', '==', id).limit(1).get();
    if (!shipmentSnap.empty) {
      order.shipment = { id: shipmentSnap.docs[0].id, ...shipmentSnap.docs[0].data() };
    }

    res.json(order);
  } catch (error) {
    console.error('getOrderById error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

