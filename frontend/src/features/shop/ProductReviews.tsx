import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { reviewService } from '@/services/reviewService';
import type { Review, Product } from '@/types';
import Button from '@/components/ui/Button';

interface ProductReviewsProps {
  product: Product;
}

const ProductReviews = ({ product }: ProductReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await reviewService.getProductReviews(product.id, 10);
      setReviews(data || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) {
      setError('Please fill in all fields');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const newReview = await reviewService.submitReview(product.id, { rating, title, body });
      setReviews(prev => [newReview, ...prev]);
      setShowForm(false);
      setTitle('');
      setBody('');
      setRating(5);
      alert('Review submitted successfully! It may be pending approval.');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async (reviewId: string) => {
    if (!user) {
      alert('You must be logged in to report a review');
      return;
    }
    
    const reason = prompt('Reason for reporting this review?');
    if (!reason) return;
    
    try {
      await reviewService.reportReview(reviewId, reason);
      alert('Review reported successfully.');
    } catch (_err) {
      alert('Failed to report review.');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex text-yellow-400">
        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
      </div>
    );
  };

  return (
    <div className="mt-20 pt-12 border-t border-border">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold mb-2">Customer Reviews</h2>
          <div className="flex items-center gap-3">
            {renderStars(product.ratings?.average || 0)}
            <span className="text-sm font-medium">{product.ratings?.average || 0} out of 5</span>
            <span className="text-sm text-text-muted">({product.ratings?.count || 0} reviews)</span>
          </div>
        </div>
        
        {user ? (
          <Button onClick={() => setShowForm(!showForm)} variant="outline">
            {showForm ? 'Cancel Review' : 'Write a Review'}
          </Button>
        ) : (
          <p className="text-sm text-text-muted">Please log in to write a review.</p>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-lg mb-12 space-y-4">
          <h3 className="font-semibold mb-4">Write a Review</h3>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded text-sm mb-4">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Review Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-border rounded-md focus:ring-primary focus:border-primary"
              placeholder="Summary of your review"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Review Details</label>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border-border rounded-md focus:ring-primary focus:border-primary"
              rows={4}
              placeholder="What did you like or dislike?"
              required
            ></textarea>
          </div>
          
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse text-text-muted">Loading reviews...</div>
      ) : reviews.length > 0 ? (
        <div className="space-y-8">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-border pb-8 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  {renderStars(review.rating)}
                  <span className="font-semibold">{review.title}</span>
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="text-sm text-text-muted mb-3">
                By {review.customerName}
                {review.verifiedPurchase && (
                  <span className="ml-2 text-green-600 font-medium">✓ Verified Purchase</span>
                )}
                {review.status === 'PENDING' && (
                  <span className="ml-2 text-yellow-600 font-medium">(Pending Approval)</span>
                )}
              </div>
              
              <p className="text-sm leading-relaxed mb-3">{review.body}</p>
              
              {user && user.id !== review.customerId && review.status === 'APPROVED' && (
                <button 
                  onClick={() => handleReport(review.id)}
                  className="text-xs text-text-muted hover:text-red-500 underline"
                >
                  Report
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-muted italic">No reviews yet. Be the first to review this product!</p>
      )}
    </div>
  );
};

export default ProductReviews;
