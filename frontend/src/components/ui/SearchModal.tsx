import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, TrendingUp } from 'lucide-react';
import { getProducts } from '@/services/productService';
import type { Product } from '@/types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRENDING = ['Nike Air Max', 'Running Shoes', 'Casual Sneakers', 'Formal Shoes', 'Boots'];

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setIsLoading(true);
      getProducts({ search: query.trim(), limit: 6 })
        .then(d => setResults(d.products))
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    onClose();
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  }, [navigate, onClose]);

  const handleProductClick = useCallback((slug: string) => {
    onClose();
    navigate(`/shop/${slug}`);
  }, [navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Search size={20} className="text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(query); }}
            placeholder="Search shoes, brands, categories…"
            className="flex-1 text-base outline-none placeholder:text-text-muted bg-transparent"
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-text-muted hover:text-text" aria-label="Clear search">
              <X size={18} />
            </button>
          )}
          <button onClick={onClose} className="ml-1 text-text-muted hover:text-text text-sm font-medium hidden sm:block">
            Esc
          </button>
        </div>

        {/* Results / suggestions */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Loading */}
          {isLoading && (
            <div className="p-6 text-center text-text-muted text-sm">Searching…</div>
          )}

          {/* Search results */}
          {!isLoading && results.length > 0 && (
            <div>
              <div className="px-5 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider bg-surface">
                Products
              </div>
              {results.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product.slug)}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-surface transition-colors text-left"
                >
                  <img
                    src={product.images?.[0] || ''}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded bg-surface flex-shrink-0"
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-text truncate">{product.name}</p>
                    <p className="text-xs text-text-muted">{product.brand} · {product.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary flex-shrink-0">₹{product.price}</span>
                </button>
              ))}
              {/* View all */}
              <button
                onClick={() => handleSearch(query)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-primary font-semibold border-t border-border hover:bg-surface transition-colors"
              >
                <Search size={16} />
                View all results for "{query}"
              </button>
            </div>
          )}

          {/* No results */}
          {!isLoading && query.trim().length >= 2 && results.length === 0 && (
            <div className="p-8 text-center text-text-muted">
              <p className="text-base mb-1">No results for "<strong className="text-text">{query}</strong>"</p>
              <p className="text-sm">Try a different keyword or browse all products.</p>
            </div>
          )}

          {/* Trending / empty state */}
          {!query && (
            <div className="p-5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp size={13} /> Trending Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {TRENDING.map(t => (
                  <button
                    key={t}
                    onClick={() => handleSearch(t)}
                    className="px-3 py-1.5 text-sm border border-border rounded-full hover:border-primary hover:text-primary transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
