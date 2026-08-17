import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '@/services/productService';
import { ProductCard } from '@/components/ui/ProductCard';
import type { Product } from '@/types';
import { Truck, ShieldCheck, RotateCcw, Star, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  { label: 'Sneakers', emoji: '👟', color: 'from-blue-50 to-indigo-100' },
  { label: 'Formal', emoji: '👞', color: 'from-slate-50 to-gray-100' },
  { label: 'Sports', emoji: '🏃', color: 'from-green-50 to-emerald-100' },
  { label: 'Boots', emoji: '🥾', color: 'from-amber-50 to-orange-100' },
  { label: 'Sandals', emoji: '🩴', color: 'from-yellow-50 to-lime-100' },
  { label: 'Loafers', emoji: '🥿', color: 'from-pink-50 to-rose-100' },
];

const BENEFITS = [
  { icon: Truck, title: 'Free Delivery ₹999+', desc: 'Same-day dispatch before 2PM' },
  { icon: ShieldCheck, title: '100% Authentic', desc: 'Sourced from authorised brands' },
  { icon: RotateCcw, title: '7-Day Returns', desc: 'Hassle-free, no questions asked' },
  { icon: Star, title: '4.8★ Rated', desc: 'Trusted by 50,000+ customers' },
];

const HomePage: React.FC = () => {
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    getProducts({ isNewArrival: true, limit: 4 })
      .then(d => setNewArrivals(d.products))
      .catch(() => {});
    getProducts({ isFeatured: true, limit: 4 })
      .then(d => setFeatured(d.products))
      .catch(() => {});
  }, []);

  return (
    <div className="animate-fade-in">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative h-[90vh] min-h-[560px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2000&auto=format&fit=crop"
            alt="SoleVault hero — premium sneakers"
            loading="eager"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <p className="text-sm uppercase tracking-[0.3em] text-white/70 mb-4 font-medium">
            New Collection 2026
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-semibold mb-6 tracking-tight">
            Step Into <br className="hidden md:block" />
            <span className="italic">Excellence</span>
          </h1>
          <p className="text-lg md:text-xl font-light mb-10 max-w-xl mx-auto text-white/85">
            Authentic footwear from the world's best brands. Delivered across India.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/shop"
              className="px-8 py-3.5 bg-white text-primary rounded font-semibold hover:bg-white/90 transition-colors w-full sm:w-auto text-center"
            >
              Shop Now
            </Link>
            <Link
              to="/shop?isNewArrival=true"
              className="px-8 py-3.5 border border-white/60 text-white rounded font-semibold hover:bg-white/10 transition-colors w-full sm:w-auto text-center"
            >
              New Arrivals
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-white/50 animate-bounce">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ── Benefits Bar ──────────────────────────────────────────────────────── */}
      <section className="bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-white/20">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 px-4 first:pl-0">
              <Icon size={22} className="shrink-0 text-white/80" />
              <div>
                <p className="font-semibold text-sm leading-tight">{title}</p>
                <p className="text-xs text-white/60 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Category Quick Links ──────────────────────────────────────────────── */}
      <section className="py-14 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-display font-semibold">Shop by Category</h2>
            <p className="text-text-muted text-sm mt-1">Find your perfect style</p>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
            All Products <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {CATEGORIES.map(({ label, emoji, color }) => (
            <Link
              key={label}
              to={`/shop?category=${encodeURIComponent(label)}`}
              className={`bg-gradient-to-br ${color} rounded-xl p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all group`}
            >
              <div className="text-3xl mb-2">{emoji}</div>
              <p className="text-xs font-semibold group-hover:text-primary transition-colors">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── New Arrivals ──────────────────────────────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section className="py-14 px-4 bg-surface">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-semibold">New Arrivals</h2>
                <p className="text-text-muted text-sm mt-1">Fresh drops this season</p>
              </div>
              <Link to="/shop?isNewArrival=true" className="text-sm font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                View All <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {newArrivals.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured / Best Sellers ───────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-semibold">Best Sellers</h2>
                <p className="text-text-muted text-sm mt-1">Loved by our customers</p>
              </div>
              <Link to="/shop?sort=rating" className="text-sm font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                See More <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Brand Story ───────────────────────────────────────────────────────── */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=2000&auto=format&fit=crop"
            alt="SoleVault brand"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-display font-semibold mb-6 leading-tight">
            "Crafted for Every Step of Your Journey"
          </h2>
          <p className="text-text-muted max-w-xl mx-auto mb-8 leading-relaxed">
            SoleVault brings you authentic footwear from the world's best brands — 
            delivered to your door across India with care and speed.
          </p>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 border-b-2 border-primary pb-0.5 font-semibold text-sm hover:text-primary transition-colors"
          >
            Our Story <ChevronRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── Newsletter ────────────────────────────────────────────────────────── */}
      <section className="bg-primary text-white py-16 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-display font-semibold mb-3">
            Get Exclusive Deals
          </h2>
          <p className="text-white/70 mb-8 text-sm">
            Subscribe to our newsletter for early access to sales, new arrivals, and exclusive coupon codes.
          </p>
          {subscribed ? (
            <div className="bg-white/10 rounded-xl px-6 py-4 text-white font-semibold">
              🎉 You're subscribed! Watch your inbox for deals.
            </div>
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); if (email) setSubscribed(true); }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="flex-1 px-4 py-3 rounded text-primary focus:outline-none text-sm"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-white text-primary rounded font-semibold text-sm hover:bg-white/90 transition-colors shrink-0"
              >
                Subscribe
              </button>
            </form>
          )}
          <p className="text-xs text-white/40 mt-4">No spam. Unsubscribe anytime.</p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
