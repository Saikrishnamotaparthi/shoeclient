import api from './api';
import type { CheckoutValidationResult } from '@/types';

export interface CheckoutValidationRequest {
  items: { productId: string; size: string; quantity: number }[];
  couponCode?: string;
  shippingAddressId?: string;
}

export const checkoutService = {
  validateCheckout: async (request: CheckoutValidationRequest): Promise<CheckoutValidationResult> => {
    const { data } = await api.post<CheckoutValidationResult>('/checkout/validate', request);
    return data;
  }
};
