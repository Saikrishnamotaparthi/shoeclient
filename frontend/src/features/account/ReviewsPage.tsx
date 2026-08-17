import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { reviewService } from '@/services/reviewService';
import type { Review } from '@/types';
import { Star, ExternalLink } from 'lucide-react';

const ReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    reviewService.getMyReviews()
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const statusLabel = (s: string) => {
    switch (s) {
      case 'APPROVED': return { text: 'Published', cls: 'bg-green-100 text-green-700' };
      case 'PENDING': return { text: 'Under Review', cls: 'bg-amber-100 text-amber-700' };
      case 'REJECTED': return { text: 'Not Published', cls: 'bg-red-100 text-red-600' };
      default: return { text: s, cls: 'bg-gray-100 text-gray-600' };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">My Reviews</h1>
        <p className="text-text-muted text-sm mt-1">Reviews you've submitted for purchased products.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-28 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <Star size={36} className="mx-auto mb-4 text-border" />
          <p className="font-medium mb-1">No reviews yet</p>
          <p className="text-sm text-text-muted mb-4">After purchasing, you can review the product from your order detail page.</p>
          <Link to="/account/orders" className="text-sm text-primary font-medium hover:underline">View My Orders →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => {
            const badge = statusLabel(review.status);
            return (
              <div key={review.id} className="bg-white border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-current' : 'text-gray-200 fill-current'}`} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="font-semibold text-sm">{review.title}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${badge.cls}`}>{badge.text}</span>
                </div>
                <p className="text-sm text-text-muted">{review.body}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-text-muted">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <Link to={`/account/orders/${review.orderId}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    View Order <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;
