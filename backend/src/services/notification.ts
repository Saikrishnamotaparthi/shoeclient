import { adminDb } from '../config/firebase';
import { emailService } from './email';
import { Order } from '../types';

export type NotificationType = 
  | 'ORDER_PLACED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_CANCELLED'
  | 'SHIPMENT_CREATED'
  | 'SHIPMENT_SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'REFUND_PROCESSING'
  | 'REFUND_PROCESSED'
  | 'REFUND_FAILED';

export interface NotificationEvent {
  id: string; // The idempotency key (e.g. orderId_type)
  type: NotificationType;
  recipient: string;
  status: 'sent' | 'failed';
  sentAt?: string;
  createdAt: string;
  error?: string;
}

const checkIdempotency = async (eventId: string): Promise<boolean> => {
  const doc = await adminDb.collection('notificationEvents').doc(eventId).get();
  return doc.exists;
};

const recordEvent = async (event: NotificationEvent) => {
  await adminDb.collection('notificationEvents').doc(event.id).set(event);
  
  // Create an admin log
  await adminDb.collection('adminNotificationLogs').add(event);
};

const createCustomerNotification = async (
  customerId: string, 
  type: NotificationType, 
  title: string, 
  message: string, 
  orderId?: string
) => {
  const notificationRef = adminDb.collection('users').doc(customerId).collection('notifications').doc();
  await notificationRef.set({
    id: notificationRef.id,
    customerId,
    type,
    title,
    message,
    orderId,
    read: false,
    createdAt: new Date().toISOString()
  });
};

export const notificationService = {
  sendOrderConfirmation: async (order: Order, customerEmail: string, customerName: string) => {
    const eventId = `order_confirmed_${order.id}`;
    if (await checkIdempotency(eventId)) return;

    const success = await emailService.sendOrderConfirmation(customerEmail, customerName, order);
    
    await recordEvent({
      id: eventId,
      type: 'ORDER_CONFIRMED',
      recipient: customerEmail,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    });

    await createCustomerNotification(
      order.customerId, 
      'ORDER_CONFIRMED', 
      'Order Confirmed', 
      `Your order #${order.id} has been confirmed.`,
      order.id
    );
  },

  sendPaymentSuccess: async (order: Order, customerEmail: string, customerName: string) => {
    const eventId = `payment_success_${order.id}`;
    if (await checkIdempotency(eventId)) return;

    const success = await emailService.sendPaymentSuccess(customerEmail, customerName, order.id);
    
    await recordEvent({
      id: eventId,
      type: 'PAYMENT_SUCCESS',
      recipient: customerEmail,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    });

    await createCustomerNotification(
      order.customerId, 
      'PAYMENT_SUCCESS', 
      'Payment Successful', 
      `Payment for order #${order.id} was successful.`,
      order.id
    );
  },

  sendPaymentFailed: async (order: Order, customerEmail: string, customerName: string) => {
    const eventId = `payment_failed_${order.id}_${Date.now()}`;
    const success = await emailService.sendPaymentFailed(customerEmail, customerName, order.id);
    
    await recordEvent({
      id: eventId,
      type: 'PAYMENT_FAILED',
      recipient: customerEmail,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    });

    await createCustomerNotification(
      order.customerId, 
      'PAYMENT_FAILED', 
      'Payment Failed', 
      `Payment for order #${order.id} failed. Please try again.`,
      order.id
    );
  },

  sendShipmentUpdate: async (orderId: string, customerId: string, customerEmail: string, customerName: string, status: string, trackingNumber?: string) => {
    const eventId = `shipment_update_${orderId}_${status}`;
    if (await checkIdempotency(eventId)) return;

    const success = await emailService.sendShipmentUpdate(customerEmail, customerName, orderId, trackingNumber || '', status);
    
    await recordEvent({
      id: eventId,
      type: 'SHIPMENT_SHIPPED', // Generic type for now
      recipient: customerEmail,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    });

    await createCustomerNotification(
      customerId, 
      'SHIPMENT_SHIPPED', 
      'Shipment Update', 
      `Your order #${orderId} shipment status is now: ${status}.`,
      orderId
    );
  },

  sendOrderCancelled: async (order: Order, customerEmail: string, customerName: string, reason?: string) => {
    const eventId = `order_cancelled_${order.id}`;
    if (await checkIdempotency(eventId)) return;

    const success = await emailService.sendOrderCancelled(customerEmail, customerName, order.id, reason);
    
    await recordEvent({
      id: eventId,
      type: 'ORDER_CANCELLED',
      recipient: customerEmail,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    });

    await createCustomerNotification(
      order.customerId, 
      'ORDER_CANCELLED', 
      'Order Cancelled', 
      `Your order #${order.id} has been cancelled.`,
      order.id
    );
  },

  sendReturnUpdate: async (orderId: string, customerId: string, customerEmail: string, customerName: string, statusText: string, type: NotificationType) => {
    const eventId = `return_${type}_${orderId}`;
    if (await checkIdempotency(eventId)) return;

    const success = await emailService.sendReturnUpdate(customerEmail, customerName, orderId, statusText);
    
    await recordEvent({
      id: eventId,
      type,
      recipient: customerEmail,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    });

    await createCustomerNotification(
      customerId, 
      type, 
      'Return Update', 
      `Return request for order #${orderId}: ${statusText}`,
      orderId
    );
  },

  sendRefundUpdate: async (orderId: string, customerId: string, customerEmail: string, customerName: string, statusText: string, type: NotificationType) => {
    const eventId = `refund_${type}_${orderId}`;
    if (await checkIdempotency(eventId)) return;

    const success = await emailService.sendRefundUpdate(customerEmail, customerName, orderId, statusText);
    
    await recordEvent({
      id: eventId,
      type,
      recipient: customerEmail,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    });

    await createCustomerNotification(
      customerId, 
      type, 
      'Refund Update', 
      `Refund for order #${orderId}: ${statusText}`,
      orderId
    );
  }
};
