import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { CheckCircle } from 'lucide-react';

const OrderSuccessPage = () => {
  const { orderId } = useParams();

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center animate-fade-in">
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center text-success">
          <CheckCircle size={40} />
        </div>
      </div>
      
      <h1 className="text-4xl font-display mb-4">Order Confirmed</h1>
      <p className="text-text-muted mb-8 text-lg">
        Thank you for your purchase. We've received your order and will begin processing it right away.
      </p>
      
      <div className="bg-surface p-6 rounded-lg mb-8 border border-border">
        <p className="text-sm text-text-muted mb-2 uppercase tracking-wider">Order Reference</p>
        <p className="font-mono text-xl font-medium">{orderId}</p>
      </div>
      
      <p className="text-sm text-text-muted mb-12">
        A confirmation email has been sent to your email address. You will receive another email when your order ships.
      </p>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Link to="/account/orders">
          <Button variant="outline" className="w-full sm:w-auto">View Order Status</Button>
        </Link>
        <Link to="/shop">
          <Button className="w-full sm:w-auto">Continue Shopping</Button>
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
