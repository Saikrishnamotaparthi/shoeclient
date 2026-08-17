import React from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

type PolicyType = 'shipping' | 'returns' | 'privacy' | 'terms';

const POLICIES: Record<PolicyType, { title: string; lastUpdated: string; sections: { heading: string; content: string }[] }> = {
  shipping: {
    title: 'Shipping Policy',
    lastUpdated: 'August 2026',
    sections: [
      {
        heading: 'Processing Time',
        content: 'All orders are processed within 24 hours of payment confirmation (Monday–Saturday, excluding public holidays). Orders placed on Sunday or public holidays will be processed the next working day. Same-day dispatch is available for orders placed before 2:00 PM IST.',
      },
      {
        heading: 'Delivery Timeframes',
        content: 'Standard Delivery: 3–5 business days (most Indian cities). Express Delivery: 1–2 business days (select cities). Remote areas may take 7–10 business days. Delivery times are estimates and may vary due to courier delays, extreme weather, or other unforeseen circumstances.',
      },
      {
        heading: 'Shipping Charges',
        content: 'Free shipping on all orders above ₹999. A flat shipping fee of ₹79 applies to orders below ₹999. No hidden charges or additional handling fees.',
      },
      {
        heading: 'Tracking Your Order',
        content: 'Once your order is shipped, you\'ll receive an SMS and email with the AWB tracking number and a direct link to the courier\'s tracking page. You can also use the Track Order feature on our website.',
      },
      {
        heading: 'Courier Partners',
        content: 'We ship via Shiprocket and Delhivery — two of India\'s most reliable logistics providers. The courier partner is automatically selected based on your pin code and order details.',
      },
      {
        heading: 'Delivery Failure',
        content: 'If a delivery attempt fails, the courier will try up to 3 times. After 3 failed attempts, the shipment will be returned to us. You may contact us to reschedule or request a refund.',
      },
    ],
  },
  returns: {
    title: 'Return & Refund Policy',
    lastUpdated: 'August 2026',
    sections: [
      {
        heading: 'Return Window',
        content: 'You may return eligible items within 7 days of the delivery date. Items must be unused, unworn, and in original condition with all tags attached and in original packaging.',
      },
      {
        heading: 'Non-Returnable Items',
        content: 'Items marked "Final Sale" or "Non-Returnable" at purchase. Worn, washed, or damaged items. Items without original tags or packaging. Customised or personalised products.',
      },
      {
        heading: 'How to Request a Return',
        content: 'Log into your account → Go to My Orders → Select the delivered order → Click "Request Return" → Select items and reason → Submit. Our team will review your request within 24–48 hours.',
      },
      {
        heading: 'Return Pickup',
        content: 'Once your return is approved, we\'ll schedule a free pickup from your delivery address. Please keep the item ready and packed. A pickup agent will arrive within 2–3 business days.',
      },
      {
        heading: 'Refund Processing',
        content: 'After receiving and inspecting the returned item, refunds are processed within 5–7 business days. Refunds are credited to your original payment method (bank account, UPI, or card). COD orders are refunded via bank transfer — please provide your bank details when requesting the return.',
      },
      {
        heading: 'Exchange Policy',
        content: 'We currently do not support direct exchanges. To exchange for a different size or colour, please return the original item and place a fresh order.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'August 2026',
    sections: [
      {
        heading: 'Information We Collect',
        content: 'We collect information you provide when creating an account (name, email, phone), placing orders (address, payment info), and browsing our website (device info, browsing behaviour via cookies). We do not collect payment card details — these are handled securely by Razorpay.',
      },
      {
        heading: 'How We Use Your Information',
        content: 'To process and fulfil your orders. To send order confirmation and delivery updates. To provide customer support. To personalise your shopping experience. To send promotional communications (only with your consent).',
      },
      {
        heading: 'Data Sharing',
        content: 'We share your data only with essential service providers: Razorpay (payment processing), Shiprocket/Delhivery (order delivery), Firebase (authentication and database). We never sell your personal data to third parties for marketing purposes.',
      },
      {
        heading: 'Cookies',
        content: 'We use essential cookies for website functionality (cart, login session) and optional analytics cookies to understand how our site is used. You can disable non-essential cookies in your browser settings.',
      },
      {
        heading: 'Your Rights',
        content: 'You may access, update, or delete your personal information at any time via My Account → Profile. You may also request data deletion by contacting us at privacy@solevault.in.',
      },
      {
        heading: 'Data Security',
        content: 'All data is encrypted in transit (HTTPS/TLS). We follow industry best practices for data security and access controls. In the unlikely event of a data breach, we will notify affected users within 72 hours.',
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    lastUpdated: 'August 2026',
    sections: [
      {
        heading: 'Acceptance of Terms',
        content: 'By accessing or using the SoleVault website or mobile app, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our services.',
      },
      {
        heading: 'Account Responsibilities',
        content: 'You are responsible for maintaining the confidentiality of your account credentials. You must be at least 18 years old (or have parental consent) to create an account. You agree to provide accurate, current, and complete information.',
      },
      {
        heading: 'Product Information',
        content: 'We make reasonable efforts to display accurate product images, descriptions, and pricing. Colours may vary slightly due to screen settings. We reserve the right to correct pricing errors and cancel affected orders, with full refund.',
      },
      {
        heading: 'Pricing & Payments',
        content: 'All prices are in Indian Rupees (INR) and inclusive of GST. Prices may change without notice. Payment is processed securely via Razorpay. COD is subject to pin code availability.',
      },
      {
        heading: 'Intellectual Property',
        content: 'All content on this website (logos, images, text, software) is the property of SoleVault or respective brand owners. You may not reproduce, modify, or distribute our content without prior written permission.',
      },
      {
        heading: 'Limitation of Liability',
        content: 'SoleVault shall not be liable for any indirect, incidental, or consequential damages arising from the use of our website or products. Our liability is limited to the value of the specific order in question.',
      },
      {
        heading: 'Governing Law',
        content: 'These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.',
      },
    ],
  },
};

interface PolicyPageProps {
  policy: PolicyType;
}

const PolicyPage: React.FC<PolicyPageProps> = ({ policy }) => {
  const content = POLICIES[policy];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Breadcrumb items={[{ label: content.title }]} />

      <div className="mt-6 mb-10">
        <h1 className="text-3xl font-display font-semibold mb-2">{content.title}</h1>
        <p className="text-text-muted text-sm">Last updated: {content.lastUpdated}</p>
      </div>

      <div className="space-y-8">
        {content.sections.map((section, idx) => (
          <div key={idx}>
            <h2 className="text-lg font-semibold mb-3">{section.heading}</h2>
            <p className="text-text-muted leading-relaxed text-sm">{section.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-border text-sm text-text-muted">
        <p>If you have any questions about this policy, please{' '}
          <a href="/contact" className="text-primary hover:underline font-medium">contact us</a>.
        </p>
      </div>
    </div>
  );
};

export default PolicyPage;
