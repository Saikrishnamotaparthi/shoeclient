import nodemailer from 'nodemailer';
import { Order } from '../types';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const SENDER_EMAIL = process.env.SMTP_FROM || 'noreply@solevault.com';
const BRAND_NAME = 'SOLEVAULT';

// --- HTML Templates ---
const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const layout = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; color: #09090b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background-color: #18181b; padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px; }
    .content { padding: 32px; }
    .footer { padding: 24px; text-align: center; color: #71717a; font-size: 14px; background-color: #fafafa; border-top: 1px solid #e4e4e7; }
    h2 { font-size: 20px; font-weight: 600; margin-top: 0; }
    p { line-height: 1.6; margin-bottom: 16px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 8px; }
    .item-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f4f4f5; }
    .summary-box { background: #fafafa; padding: 16px; border-radius: 8px; margin: 24px 0; }
    .text-right { text-align: right; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${BRAND_NAME}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.<br>
      Thank you for shopping with us!
    </div>
  </div>
</body>
</html>
`;

export const emailService = {
  sendEmail: async ({ to, subject, html }: EmailOptions): Promise<boolean> => {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn('SMTP credentials missing. Email send skipped.', { to, subject });
        return false;
      }
      
      const info = await transporter.sendMail({
        from: `"${BRAND_NAME}" <${SENDER_EMAIL}>`,
        to,
        subject,
        html: layout(html),
      });
      console.log(`Email sent successfully to ${to} [${info.messageId}]`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      // We return false to allow the caller to safely ignore and not crash the business process
      return false;
    }
  },

  sendOrderConfirmation: async (email: string, name: string, order: Order) => {
    const safeName = escapeHtml(name || 'Customer');
    const safeOrderId = escapeHtml(order.id);
    
    let itemsHtml = '';
    order.items.forEach(item => {
      itemsHtml += `
        <div class="item-row">
          <div>
            <strong>${escapeHtml(item.name)}</strong><br>
            Size: ${escapeHtml(item.size)} | Qty: ${item.quantity}
          </div>
          <div class="text-right">₹${item.price * item.quantity}</div>
        </div>
      `;
    });

    const content = `
      <h2>Order Confirmed!</h2>
      <p>Hi ${safeName},</p>
      <p>Thank you for your order. We've received your payment and are getting your items ready.</p>
      
      <div class="summary-box">
        <strong>Order #:</strong> ${safeOrderId}<br>
        <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}<br><br>
        
        ${itemsHtml}
        
        <div class="item-row" style="border: none; font-weight: bold; padding-top: 16px;">
          <div>Total</div>
          <div class="text-right">₹${order.total}</div>
        </div>
      </div>
      
      <p>We'll notify you again once your order has shipped!</p>
    `;

    return emailService.sendEmail({
      to: email,
      subject: `Order Confirmation - #${safeOrderId}`,
      html: content
    });
  },

  sendPaymentSuccess: async (email: string, name: string, orderId: string) => {
    const safeName = escapeHtml(name || 'Customer');
    const safeOrderId = escapeHtml(orderId);
    
    const content = `
      <h2>Payment Received</h2>
      <p>Hi ${safeName},</p>
      <p>Your payment for order <strong>#${safeOrderId}</strong> has been successfully processed.</p>
      <p>You can check your order status in your account dashboard.</p>
    `;
    return emailService.sendEmail({ to: email, subject: 'Payment Successful', html: content });
  },

  sendPaymentFailed: async (email: string, name: string, orderId: string) => {
    const safeName = escapeHtml(name || 'Customer');
    const safeOrderId = escapeHtml(orderId);
    
    const content = `
      <h2>Payment Issue</h2>
      <p>Hi ${safeName},</p>
      <p>We encountered an issue processing the payment for your order <strong>#${safeOrderId}</strong>.</p>
      <p>Please log in to your account to retry the payment or use a different payment method.</p>
    `;
    return emailService.sendEmail({ to: email, subject: 'Payment Action Required', html: content });
  },

  sendShipmentUpdate: async (email: string, name: string, orderId: string, trackingNumber: string, statusText: string) => {
    const safeName = escapeHtml(name || 'Customer');
    const safeOrderId = escapeHtml(orderId);
    const safeTracking = escapeHtml(trackingNumber || 'N/A');
    
    const content = `
      <h2>Shipping Update</h2>
      <p>Hi ${safeName},</p>
      <p>There is an update on your order <strong>#${safeOrderId}</strong>.</p>
      <p>Status: <strong>${escapeHtml(statusText)}</strong></p>
      ${safeTracking !== 'N/A' ? `<p>Tracking Number: <strong>${safeTracking}</strong></p>` : ''}
    `;
    return emailService.sendEmail({ to: email, subject: `Shipping Update - #${safeOrderId}`, html: content });
  },

  sendOrderCancelled: async (email: string, name: string, orderId: string, reason?: string) => {
    const safeName = escapeHtml(name || 'Customer');
    const safeOrderId = escapeHtml(orderId);
    const safeReason = reason ? escapeHtml(reason) : 'No reason provided';
    
    const content = `
      <h2>Order Cancelled</h2>
      <p>Hi ${safeName},</p>
      <p>Your order <strong>#${safeOrderId}</strong> has been cancelled.</p>
      <p>Reason: ${safeReason}</p>
      <p>If you have already paid, a refund has been initiated according to our policies.</p>
    `;
    return emailService.sendEmail({ to: email, subject: `Order Cancelled - #${safeOrderId}`, html: content });
  },

  sendReturnUpdate: async (email: string, name: string, orderId: string, statusText: string) => {
    const safeName = escapeHtml(name || 'Customer');
    const safeOrderId = escapeHtml(orderId);
    
    const content = `
      <h2>Return Update</h2>
      <p>Hi ${safeName},</p>
      <p>There is an update regarding your return request for order <strong>#${safeOrderId}</strong>.</p>
      <p>Status: <strong>${escapeHtml(statusText)}</strong></p>
    `;
    return emailService.sendEmail({ to: email, subject: `Return Update - #${safeOrderId}`, html: content });
  },

  sendRefundUpdate: async (email: string, name: string, orderId: string, statusText: string) => {
    const safeName = escapeHtml(name || 'Customer');
    const safeOrderId = escapeHtml(orderId);
    
    const content = `
      <h2>Refund Update</h2>
      <p>Hi ${safeName},</p>
      <p>There is an update regarding the refund for your order <strong>#${safeOrderId}</strong>.</p>
      <p>Status: <strong>${escapeHtml(statusText)}</strong></p>
    `;
    return emailService.sendEmail({ to: email, subject: `Refund Update - #${safeOrderId}`, html: content });
  }
};
