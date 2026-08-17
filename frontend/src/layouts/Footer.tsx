import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // TODO: wire to backend newsletter endpoint
    setSubscribed(true);
    setEmail('');
  };

  return (
    <footer className="bg-primary text-white">
      {/* Newsletter bar */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-semibold text-lg">Join the SoleVault Club</p>
            <p className="text-white/60 text-sm">Early access, exclusive offers, no spam.</p>
          </div>
          {subscribed ? (
            <p className="text-green-300 font-medium text-sm">✓ You're subscribed!</p>
          ) : (
            <form onSubmit={handleNewsletter} className="flex gap-2 w-full sm:w-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 sm:w-64 px-4 py-2.5 rounded bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-white/60"
              />
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-primary rounded text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                <Send size={14} /> Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <Link to="/" className="font-display text-2xl font-bold tracking-widest block mb-4">SOLEVAULT</Link>
          <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-xs">
            Step into the extraordinary. Meticulously crafted footwear from around the globe.
          </p>
          <div className="flex gap-3">
            {[
              {
                href: '#', label: 'Instagram',
                path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
              },
              {
                href: '#', label: 'Twitter/X',
                path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
              },
              {
                href: '#', label: 'Facebook',
                path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
              },
              {
                href: '#', label: 'YouTube',
                path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
              },
            ].map(({ href, label, path }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d={path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* Shop */}
        <div>
          <h4 className="font-semibold text-sm uppercase tracking-wider mb-5">Shop</h4>
          <ul className="space-y-3 text-white/60 text-sm">
            {[
              { label: 'New Arrivals', to: '/shop?type=new-arrivals' },
              { label: 'Featured', to: '/shop?type=featured' },
              { label: 'Sale', to: '/shop?type=sale' },
              { label: 'All Products', to: '/shop' },
            ].map(l => (
              <li key={l.label}>
                <Link to={l.to} className="hover:text-white transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-semibold text-sm uppercase tracking-wider mb-5">Support</h4>
          <ul className="space-y-3 text-white/60 text-sm">
            {[
              { label: 'Track Order', to: '/track-order' },
              { label: 'Returns & Exchanges', to: '/return-policy' },
              { label: 'FAQ', to: '/faq' },
              { label: 'Contact Us', to: '/contact' },
              { label: 'About Us', to: '/about' },
            ].map(l => (
              <li key={l.label}>
                <Link to={l.to} className="hover:text-white transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Policies */}
        <div>
          <h4 className="font-semibold text-sm uppercase tracking-wider mb-5">Policies</h4>
          <ul className="space-y-3 text-white/60 text-sm">
            {[
              { label: 'Shipping Policy', to: '/shipping-policy' },
              { label: 'Return Policy', to: '/return-policy' },
              { label: 'Privacy Policy', to: '/privacy-policy' },
              { label: 'Terms & Conditions', to: '/terms' },
            ].map(l => (
              <li key={l.label}>
                <Link to={l.to} className="hover:text-white transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-white/40">
          <p>© {new Date().getFullYear()} SoleVault. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span>🔒</span> Secure Checkout
            </span>
            <span className="flex items-center gap-1.5">
              <span>📦</span> Free Returns
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
