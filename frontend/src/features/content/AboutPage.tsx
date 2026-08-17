import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

const AboutPage: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 py-12">
    <Breadcrumb items={[{ label: 'About Us' }]} />

    {/* Hero */}
    <div className="text-center mb-14 mt-6">
      <h1 className="text-4xl md:text-5xl font-display font-semibold mb-4">
        Crafted for Every Step
      </h1>
      <p className="text-lg text-text-muted max-w-2xl mx-auto">
        We believe footwear is more than a product — it's an expression of who you are. 
        SoleVault brings you authentic, curated shoes from the world's best brands, 
        delivered right to your doorstep across India.
      </p>
    </div>

    {/* Values */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
      {[
        { icon: '✨', title: '100% Authentic', desc: 'Every pair we sell is sourced directly from brands or authorised distributors. Zero counterfeits, always.' },
        { icon: '🚀', title: 'Fast Delivery', desc: 'Same-day dispatch on orders placed before 2PM. Express delivery across 500+ Indian cities.' },
        { icon: '↩️', title: 'Easy Returns', desc: '7-day hassle-free returns. If something doesn\'t fit or you don\'t love it, we\'ll make it right.' },
      ].map(({ icon, title, desc }) => (
        <div key={title} className="bg-white border border-border rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">{icon}</div>
          <h3 className="font-semibold text-lg mb-2">{title}</h3>
          <p className="text-text-muted text-sm leading-relaxed">{desc}</p>
        </div>
      ))}
    </div>

    {/* Story */}
    <div className="grid md:grid-cols-2 gap-10 items-center mb-14">
      <div>
        <h2 className="text-2xl font-display font-semibold mb-4">Our Story</h2>
        <p className="text-text-muted leading-relaxed mb-4">
          SoleVault started in 2022 with a simple mission: make premium footwear accessible 
          to everyone in India. Tired of navigating grey-market sellers and inflated prices, 
          our founders set out to build a platform that combines the best brands with a 
          seamless online shopping experience.
        </p>
        <p className="text-text-muted leading-relaxed mb-6">
          Today, we stock thousands of styles from leading Indian and international brands — 
          from everyday casual to high-performance athletic and premium formal. Every product 
          is quality-checked before it ships to you.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Shop the Collection →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { value: '50,000+', label: 'Happy Customers' },
          { value: '200+', label: 'Brand Partners' },
          { value: '500+', label: 'Cities Delivered' },
          { value: '4.8★', label: 'Average Rating' },
        ].map(({ value, label }) => (
          <div key={label} className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center">
            <p className="text-2xl font-bold font-display text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>

    {/* CTA */}
    <div className="bg-primary text-white rounded-xl p-8 text-center">
      <h2 className="text-2xl font-display font-semibold mb-3">Have questions?</h2>
      <p className="text-white/80 mb-5">Our support team is here Mon–Sat, 9AM–7PM.</p>
      <Link
        to="/contact"
        className="inline-block px-6 py-3 bg-white text-primary rounded font-semibold text-sm hover:bg-white/90 transition-colors"
      >
        Contact Us
      </Link>
    </div>
  </div>
);

export default AboutPage;
