import { useEffect, useState } from 'react';
import api from '@/services/api';
import { reviewService } from '@/services/reviewService';
import type { Review } from '@/types';
import Button from '@/components/ui/Button';
import AdminLayout from '@/layouts/AdminLayout';

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await reviewService.getAdminReviews(filter || undefined);
      setReviews(data);
    } catch (error) {
      console.error('Failed to fetch admin reviews', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await reviewService.updateAdminReviewStatus(id, newStatus);
      fetchReviews();
    } catch (_error) {
      alert('Failed to update status');
    }
  };

  if (loading && reviews.length === 0) {
    return (
      <AdminLayout>
        <div className="p-10 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Reviews</h1>
        <select 
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="HIDDEN">Hidden</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-medium">Product / Customer</th>
                <th className="px-6 py-4 font-medium">Rating</th>
                <th className="px-6 py-4 font-medium">Review</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{review.productId}</div>
                    <div className="text-gray-500">{review.customerName} {review.verifiedPurchase && <span className="text-green-600 text-xs ml-1">(Verified)</span>}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex text-yellow-400">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="font-medium text-gray-900 truncate">{review.title}</div>
                    <div className="text-gray-500 truncate" title={review.body}>{review.body}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${review.status === 'APPROVED' ? 'bg-green-100 text-green-800' : ''}
                      ${review.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${review.status === 'REJECTED' || review.status === 'HIDDEN' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {review.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {review.status !== 'APPROVED' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(review.id, 'APPROVED')}>Approve</Button>
                      )}
                      {review.status !== 'REJECTED' && review.status !== 'HIDDEN' && (
                        <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(review.id, 'REJECTED')}>Reject</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No reviews found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReviews;
