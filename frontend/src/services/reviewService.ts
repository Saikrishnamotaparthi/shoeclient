import api from './api';
import type { Review } from '@/types';

export const reviewService = {
  // Public / Customer actions
  getProductReviews: async (productId: string, limit: number = 10): Promise<Review[]> => {
    const { data } = await api.get<Review[]>(`/products/${productId}/reviews?limit=${limit}`);
    return data;
  },

  submitReview: async (productId: string, review: { rating: number; title: string; body: string }): Promise<Review> => {
    const { data } = await api.post<Review>(`/products/${productId}/reviews`, review);
    return data;
  },

  reportReview: async (reviewId: string, reason: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>(`/reviews/${reviewId}/report`, { reason });
    return data;
  },

  getMyReviews: async (): Promise<Review[]> => {
    const { data } = await api.get<Review[]>('/customer/reviews');
    return data;
  },

  // Admin actions
  getAdminReviews: async (status?: string, limit: number = 50): Promise<Review[]> => {
    const query = new URLSearchParams();
    query.append('limit', limit.toString());
    if (status) query.append('status', status);
    
    const { data } = await api.get<Review[]>(`/admin/reviews?${query.toString()}`);
    return data;
  },

  updateAdminReviewStatus: async (reviewId: string, status: string): Promise<{ message: string; id: string; status: string }> => {
    const { data } = await api.put<{ message: string; id: string; status: string }>(`/admin/reviews/${reviewId}/status`, { status });
    return data;
  }
};
