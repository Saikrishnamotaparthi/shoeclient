import React, { useState } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    category: 'Orders & Delivery',
    items: [
      {
        q: 'How long does delivery take?',
        a: 'Standard delivery takes 3–5 business days. Express delivery (1–2 business days) is available in select cities. Same-day dispatch for orders placed before 2PM on working days.',
      },
      {
        q: 'How can I track my order?',
        a: 'Once your order is shipped, you\'ll receive an SMS and email with the tracking details. You can also use the Track Order page on our website with your order ID and phone number.',
      },
      {
        q: 'Do you deliver across India?',
        a: 'Yes! We deliver to 500+ cities across India via our courier partners (Shiprocket & Delhivery).',
      },
      {
        q: 'Is cash on delivery (COD) available?',
        a: 'COD is available on orders up to ₹5,000 in most pin codes. COD availability will be shown at checkout.',
      },
    ],
  },
  {
    category: 'Products & Sizing',
    items: [
      {
        q: 'Are all products 100% authentic?',
        a: 'Absolutely. Every product is sourced directly from brands or authorised distributors. We have a strict quality-check process before dispatch.',
      },
      {
        q: 'How do I pick the right size?',
        a: 'Each product page has a size guide. If you\'re between sizes, we generally recommend going up. You can also contact support before ordering.',
      },
      {
        q: 'What if a product is out of stock?',
        a: 'You can click "Notify Me" on the product page to get an email alert as soon as it\'s back in stock.',
      },
    ],
  },
  {
    category: 'Returns & Refunds',
    items: [
      {
        q: 'What is your return policy?',
        a: 'We accept returns within 7 days of delivery. The product must be unused, unworn, and in original packaging with all tags attached.',
      },
      {
        q: 'How do I initiate a return?',
        a: 'Go to My Account → Orders → select the delivered order → click Request Return. Our team will review and schedule a pickup.',
      },
      {
        q: 'When will I get my refund?',
        a: 'Once we receive and inspect the returned product, refunds are processed within 5–7 business days to your original payment method.',
      },
      {
        q: 'Are sale items returnable?',
        a: 'Sale items marked as "Final Sale" are not returnable. All other sale items follow our standard 7-day return policy.',
      },
    ],
  },
  {
    category: 'Payments & Coupons',
    items: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept UPI, debit/credit cards, net banking, and wallets via Razorpay. Cash on delivery is also available in select areas.',
      },
      {
        q: 'How do I apply a coupon code?',
        a: 'Add items to your cart, then enter your coupon code in the "Coupon Code" field on the cart page and click Apply.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes. All payments are processed through Razorpay with PCI-DSS compliance. We never store your card details.',
      },
    ],
  },
];

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface transition-colors"
      >
        <span className="font-medium text-sm">{q}</span>
        {open ? <ChevronUp size={16} className="text-text-muted shrink-0" /> : <ChevronDown size={16} className="text-text-muted shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-text-muted leading-relaxed">{a}</div>
      )}
    </div>
  );
};

const FaqPage: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 py-12">
    <Breadcrumb items={[{ label: 'FAQ' }]} />
    <div className="text-center my-8">
      <h1 className="text-3xl font-display font-semibold mb-3">Frequently Asked Questions</h1>
      <p className="text-text-muted">Everything you need to know about shopping on SoleVault.</p>
    </div>

    <div className="space-y-6">
      {FAQS.map(section => (
        <div key={section.category} className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-surface">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-text-muted">{section.category}</h2>
          </div>
          {section.items.map(item => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      ))}
    </div>

    <div className="mt-8 bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
      <p className="font-medium mb-2">Still have questions?</p>
      <p className="text-text-muted text-sm mb-4">Our support team is ready to help.</p>
      <a
        href="/contact"
        className="inline-block px-5 py-2.5 bg-primary text-white rounded font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        Contact Support
      </a>
    </div>
  </div>
);

export default FaqPage;
