import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getProducts } from '@/services/productService';
import type { Product } from '@/types';
import { ProductCard } from '@/components/ui/ProductCard';
import { Search, SlidersHorizontal } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A–Z' },
];

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'featured';

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const result = await getProducts({ search: query.trim(), sort: sortBy, page, limit: 12 });
      setProducts(result.products);
      setTotal(result.pagination.total);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, sortBy, page]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Search size={20} className="text-text-muted" />
          <h1 className="text-2xl font-display font-semibold">
            {query ? `Results for "${query}"` : 'Search Products'}
          </h1>
        </div>
        {query && !loading && (
          <p className="text-text-muted text-sm">{total} product{total !== 1 ? 's' : ''} found</p>
        )}
      </div>

      {/* Controls */}
      {query && products.length > 0 && (
        <div className="flex items-center justify-end mb-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-text-muted" />
            <select
              value={sortBy}
              onChange={e => setSearchParams(p => { p.set('sort', e.target.value); return p; })}
              className="border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Empty query */}
      {!query && (
        <div className="text-center py-20">
          <Search size={48} className="mx-auto mb-4 text-border" />
          <p className="text-text-muted">Enter a search term above to find products.</p>
          <Link to="/shop" className="mt-4 inline-block text-sm text-primary font-medium hover:underline">
            Browse All Products →
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && query && products.length === 0 && (
        <div className="text-center py-16">
          <Search size={40} className="mx-auto mb-4 text-border" />
          <p className="font-medium text-lg mb-2">No results for "{query}"</p>
          <p className="text-text-muted mb-6">Try different keywords or browse our collection.</p>
          <Link to="/shop" className="px-5 py-2.5 bg-primary text-white rounded font-semibold text-sm hover:bg-primary/90 transition-colors">
            Browse All Products
          </Link>
        </div>
      )}

      {/* Results grid */}
      {!loading && products.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-border rounded text-sm hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-border rounded text-sm hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;
