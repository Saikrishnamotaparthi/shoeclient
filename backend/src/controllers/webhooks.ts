import { Request, Response } from 'express';
import { adminDb } from '../config/firebase';
import { shippingService } from '../services/shipping';
import { notificationService } from '../services/notification';
import { verifyWebhookSignature } from '../services/razorpay';
import { WebhookEvent, Order, Refund } from '../types';
import { FieldValue } from 'firebase-admin/firestore';

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    
    if (!signature) {
      return res.status(400).send('Missing signature');
    }

    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error('Webhook failed: RAZORPAY_WEBHOOK_SECRET is not set');
      return res.status(500).send('Server configuration error');
    }

    // req.body should be a Buffer because we used express.raw()
    const isValid = verifyWebhookSignature(req.body, signature, RAZORPAY_WEBHOOK_SECRET);
    
    if (!isValid) {
      return res.status(400).send('Invalid signature');
    }

    // Parse the raw body into JSON
    const event = JSON.parse(req.body.toString('utf8'));
    
    const eventId = event.id;
    const eventType = event.event;
    const payload = event.payload;

    console.log(`Received Razorpay webhook: ${eventType} (${eventId})`);

    // 1. Check Idempotency
    const eventRef = adminDb.collection('paymentEvents').doc(eventId);
    const eventDoc = await eventRef.get();
    
    if (eventDoc.exists) {
      console.log(`Event ${eventId} already processed, ignoring.`);
      return res.status(200).send('OK');
    }

    // let processed = false;

    // 2. Process the event based on its type
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payment?.entity || payload.order?.entity;
      const razorpayOrderId = paymentEntity?.order_id || event.payload.order?.entity?.id;
      
      if (!razorpayOrderId) {
        throw new Error('No order_id found in webhook payload');
      }

      // We need to fetch the preliminary order by razorpayOrderId
      const orderQuery = await adminDb.collection('orders')
        .where('razorpayOrderId', '==', razorpayOrderId)
        .limit(1)
        .get();

      if (orderQuery.empty) {
        console.error(`Webhook: Order with razorpayOrderId ${razorpayOrderId} not found.`);
        // We still return 200 to acknowledge receipt to Razorpay, but record failure
        await eventRef.set({
          id: eventId,
          type: eventType,
          processedAt: new Date().toISOString(),
          status: 'failed',
          error: 'Order not found'
        });

        return res.status(200).send('OK');
      }

      const orderRef = orderQuery.docs[0].ref;
      const orderData = orderQuery.docs[0].data() as Order;
      
      // Update the order in a transaction
      await adminDb.runTransaction(async (transaction) => {
        const txOrderDoc = await transaction.get(orderRef);
        const txOrderData = txOrderDoc.data() as Order;

        if (txOrderData.paymentStatus === 'captured') {
           // Already handled by client-side verification
           return;
        }

        // Update Inventory
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

        // Increment coupon usage
        if (txOrderData.couponCode) {
          const couponsQuery = await transaction.get(
            adminDb.collection('coupons').where('code', '==', txOrderData.couponCode).limit(1)
          );
          if (!couponsQuery.empty) {
            const couponRef = couponsQuery.docs[0].ref;
            transaction.update(couponRef, { usedCount: FieldValue.increment(1) });
          }
        }

        // Update order status
        transaction.update(orderRef, {
          status: 'CONFIRMED',
          paymentStatus: 'captured',
          shipmentStatus: 'PENDING',
          paymentId: paymentEntity?.id || txOrderData.paymentId,
          updatedAt: new Date().toISOString()
        });

        // Update payment document
        const paymentQuery = await transaction.get(
          adminDb.collection('payments').where('razorpayOrderId', '==', razorpayOrderId).limit(1)
        );
        if (!paymentQuery.empty) {
          transaction.update(paymentQuery.docs[0].ref, {
            status: 'captured',
            id: paymentEntity?.id || 'unknown',
            updatedAt: new Date().toISOString()
          });
        }
      });

      // Auto-shipment DISABLED — admin must manually book from Order Detail page

      // Fire and forget notifications
      adminDb.collection('users').doc(orderData.customerId).get().then(userDoc => {
        if (userDoc.exists) {
          const userData = userDoc.data();
          const email = userData?.email;
          const name = userData?.name || userData?.firstName || 'Customer';
          if (email) {
            notificationService.sendPaymentSuccess(orderData, email, name).catch(console.error);
            notificationService.sendOrderConfirmation(orderData, email, name).catch(console.error);
          }
        }
      }).catch(console.error);

      // processed = true;
    } else if (eventType === 'refund.processed' || eventType === 'refund.failed') {
      const refundEntity = payload.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      const razorpayRefundId = refundEntity?.id;

      if (!paymentId || !razorpayRefundId) {
        throw new Error('No payment_id or refund id found in webhook payload');
      }

      const refundQuery = await adminDb.collection('refunds')
        .where('razorpayRefundId', '==', razorpayRefundId)
        .limit(1)
        .get();

      if (refundQuery.empty) {
        console.error(`Webhook: Refund with razorpayRefundId ${razorpayRefundId} not found.`);
        await eventRef.set({
          id: eventId,
          type: eventType,
          processedAt: new Date().toISOString(),
          status: 'failed',
          error: 'Refund not found'
        });
        return res.status(200).send('OK');
      }

      const refundRef = refundQuery.docs[0].ref;
      const refundData = refundQuery.docs[0].data() as Refund;

      if (refundData.status !== 'PROCESSED' && refundData.status !== 'FAILED') {
        const newStatus = eventType === 'refund.processed' ? 'PROCESSED' : 'FAILED';
        
        await adminDb.runTransaction(async (transaction) => {
          transaction.update(refundRef, {
            status: newStatus,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          // Update order status if the refund was PROCESSED and tied to a returned order
          if (newStatus === 'PROCESSED') {
            const orderRef = adminDb.collection('orders').doc(refundData.orderId);
            const orderDoc = await transaction.get(orderRef);
            if (orderDoc.exists) {
              const orderData = orderDoc.data() as Order;
              if (orderData.status === 'REFUND_PENDING' || orderData.status === 'RETURN_APPROVED' || orderData.status === 'RETURN_REQUESTED') {
                 transaction.update(orderRef, {
                   status: 'REFUNDED',
                   paymentStatus: 'refunded',
                   updatedAt: new Date().toISOString()
                 });
              } else if (orderData.status === 'CANCELLED') {
                 transaction.update(orderRef, {
                   paymentStatus: 'refunded',
                   updatedAt: new Date().toISOString()
                 });
              }
            }
          }
        });

        // Fire and forget notifications
        adminDb.collection('users').doc(refundData.customerId).get().then(userDoc => {
          if (userDoc.exists) {
            const userData = userDoc.data();
            const email = userData?.email;
            const name = userData?.name || userData?.firstName || 'Customer';
            if (email) {
              const notifType = newStatus === 'PROCESSED' ? 'REFUND_PROCESSED' : 'REFUND_FAILED';
              const statusText = newStatus === 'PROCESSED' ? 'Processed' : 'Failed';
              notificationService.sendRefundUpdate(refundData.orderId, refundData.customerId, email, name, statusText, notifType).catch(console.error);
            }
          }
        }).catch(console.error);
      }

      // processed = true;
    }

    // 3. Mark event as processed
    const newEvent: WebhookEvent = {
      id: eventId,
      type: eventType,
      processedAt: new Date().toISOString(),
      status: 'processed'
    };
    await eventRef.set(newEvent);

    res.status(200).send('OK');
  } catch (error) {
    console.error('handleRazorpayWebhook error:', error);
    // Even if we fail internally, sometimes it's better to return 500 so Razorpay retries,
    // or 200 so they don't block. Usually 500 is preferred for actual errors so we get retries.
    res.status(500).send('Webhook error');
  }
};
