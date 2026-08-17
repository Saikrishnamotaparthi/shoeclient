import api from './api';
import type { Order } from '@/types';

export interface CreateOrderRequest {
  items: { productId: string; size: string; quantity: number }[];
  shippingAddress: any;
  couponCode?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  key: string;
}

export interface VerifyPaymentRequest {
  orderId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export const orderService = {
  createOrder: async (request: CreateOrderRequest): Promise<CreateOrderResponse> => {
    const { data } = await api.post<CreateOrderResponse>('/orders', request);
    return data;
  },
  
  verifyPayment: async (request: VerifyPaymentRequest): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post<{ success: boolean; message: string }>('/orders/verify-payment', request);
    return data;
  },

  getOrders: async (): Promise<Order[]> => {
    const { data } = await api.get('/orders');
    return Array.isArray(data) ? data : data.orders || [];
  },

  getOrder: async (orderId: string): Promise<Order> => {
    const { data } = await api.get<Order>(`/orders/${orderId}`);
    return data;
  },

  cancelOrder: async (orderId: string, reason?: string, note?: string): Promise<{ success: boolean }> => {
    const { data } = await api.post<{ success: boolean }>(`/orders/${orderId}/cancel`, { reason, note });
    return data;
  },

  requestReturn: async (orderId: string, items: { productId: string; size: string; quantity: number }[], reason: string, note?: string): Promise<{ success: boolean }> => {
    const { data } = await api.post<{ success: boolean }>(`/orders/${orderId}/return`, { items, reason, note });
    return data;
  }
};
