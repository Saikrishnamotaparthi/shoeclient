import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-24">
      <div className="relative mb-8">
        <span className="text-[10rem] font-display font-bold text-border/50 leading-none select-none">404</span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-4xl">👟</span>
          </div>
        </div>
      </div>

      <h1 className="text-3xl md:text-4xl font-display font-semibold mb-4 text-text">
        Lost your sole?
      </h1>
      <p className="text-text-muted text-lg mb-10 max-w-md">
        The page you're looking for has stepped out. Let's get you back on track.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded font-medium hover:bg-primary/90 transition-colors"
        >
          <Home size={18} />
          Back to Home
        </Link>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded font-medium hover:bg-surface transition-colors"
        >
          <ArrowLeft size={18} />
          Browse Shop
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
