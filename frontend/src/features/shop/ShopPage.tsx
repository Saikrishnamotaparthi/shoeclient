import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Product } from '@/types';
import { ProductCard } from '@/components/ui/ProductCard';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { getProducts } from '@/services/productService';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Filter } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A–Z' },
  { value: 'rating', label: 'Top Rated' },
];

const DEFAULT_SIZES = ['5', '6', '7', '8', '9', '10', '11', '12'];

// ─── FilterSection ────────────────────────────────────────────────────────────
// Defined OUTSIDE ShopPage so it never re-mounts on parent state changes
interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2 text-sm font-semibold hover:text-primary transition-colors"
      >
        {title}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
};

// ─── PriceRange ───────────────────────────────────────────────────────────────
// Separate component so local state never collapses the parent section
interface PriceRangeProps {
  onApply: (min: number, max: number) => void;
  initialMin: number;
  initialMax: number;
}

const PriceRange: React.FC<PriceRangeProps> = ({ onApply, initialMin, initialMax }) => {
  const [min, setMin] = useState(initialMin > 0 ? String(initialMin) : '');
  const [max, setMax] = useState(initialMax > 0 ? String(initialMax) : '');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-text-muted block mb-1">Min (₹)</label>
          <input
            type="number"
            value={min}
            onChange={e => setMin(e.target.value)}
            placeholder="0"
            min={0}
            className="w-full border border-border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1">Max (₹)</label>
          <input
            type="number"
            value={max}
            onChange={e => setMax(e.target.value)}
            placeholder="Any"
            min={0}
            className="w-full border border-border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onApply(Number(min) || 0, Number(max) || 0)}
        className="w-full py-1.5 border border-primary text-primary rounded text-sm font-medium hover:bg-primary/5 transition-colors"
      >
        Apply Price
      </button>
    </div>
  );
};

// ─── FiltersPanel ─────────────────────────────────────────────────────────────
// Also outside ShopPage — receives all state as props
interface FiltersPanelProps {
  categories: string[];
  brands: string[];
  sizes: string[];
  activeCategory: string;
  activeBrand: string;
  activeSize: string;
  inStockOnly: boolean;
  activeMin: number;
  activeMax: number;
  activeFilterCount: number;
  onCategory: (cat: string | null) => void;
  onBrand: (brand: string | null) => void;
  onSize: (size: string | null) => void;
  onInStock: (v: boolean) => void;
  onPrice: (min: number, max: number) => void;
  onClearAll: () => void;
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({
  categories, brands, sizes,
  activeCategory, activeBrand, activeSize,
  inStockOnly, activeMin, activeMax, activeFilterCount,
  onCategory, onBrand, onSize, onInStock, onPrice, onClearAll,
}) => (
  <div className="space-y-4">
    {activeFilterCount > 0 && (
      <button
        type="button"
        onClick={onClearAll}
        className="flex items-center gap-1.5 text-sm text-danger hover:underline"
      >
        <X size={14} /> Clear all ({activeFilterCount})
      </button>
    )}

    <FilterSection title="Availability">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={e => onInStock(e.target.checked)}
          className="w-4 h-4 accent-primary"
        />
        <span className="text-sm">In Stock Only</span>
      </label>
    </FilterSection>

    {categories.length > 0 && (
      <FilterSection title="Category">
        <div className="space-y-2">
          {categories.map(cat => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={activeCategory === cat}
                onChange={() => onCategory(activeCategory === cat ? null : cat)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-text-muted group-hover:text-primary transition-colors">{cat}</span>
            </label>
          ))}
        </div>
      </FilterSection>
    )}

    {brands.length > 0 && (
      <FilterSection title="Brand">
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {brands.map(brand => (
            <label key={brand} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={activeBrand === brand}
                onChange={() => onBrand(activeBrand === brand ? null : brand)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-text-muted group-hover:text-primary transition-colors">{brand}</span>
            </label>
          ))}
        </div>
      </FilterSection>
    )}

    <FilterSection title="Size (UK)">
      <div className="grid grid-cols-4 gap-2">
        {(sizes.length > 0 ? sizes : DEFAULT_SIZES).map(size => (
          <button
            key={size}
            type="button"
            onClick={() => onSize(activeSize === size ? null : size)}
            className={`h-9 text-sm border rounded transition-colors font-medium ${
              activeSize === size
                ? 'border-primary bg-primary text-white'
                : 'border-border hover:border-primary hover:text-primary'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </FilterSection>

    <FilterSection title="Price Range (₹)" defaultOpen={false}>
      <PriceRange
        onApply={onPrice}
        initialMin={activeMin}
        initialMax={activeMax}
      />
    </FilterSection>
  </div>
);

// ─── ShopPage ─────────────────────────────────────────────────────────────────
const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [catalogSizes, setCatalogSizes] = useState<string[]>([]);

  // Active filters from URL
  const activeCategory = searchParams.get('category') || '';
  const activeBrand = searchParams.get('brand') || '';
  const activeSize = searchParams.get('size') || '';
  const activeSort = searchParams.get('sort') || 'featured';
  const activeMin = Number(searchParams.get('minPrice')) || 0;
  const activeMax = Number(searchParams.get('maxPrice')) || 0;
  const inStockOnly = searchParams.get('inStock') === 'true';

  const activeFilterCount = [activeCategory, activeBrand, activeSize]
    .filter(Boolean).length + (activeMin > 0 || activeMax > 0 ? 1 : 0) + (inStockOnly ? 1 : 0);

  // Helpers to update URL params
  const setParam = useCallback((key: string, value: string | null) => {
    setSearchParams(p => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
    setPage(1);
  }, [setSearchParams]);

  const clearAllFilters = useCallback(() => {
    setSearchParams({});
    setPage(1);
  }, [setSearchParams]);

  // Load catalog (categories, brands & sizes) once from public API
  useEffect(() => {
    fetch(`${API_URL}/products/catalog-settings`)
      .then(r => r.json())
      .then(data => {
        setCategories(data.categories || []);
        setBrands(data.brands || []);
        setCatalogSizes(data.sizes || []);
      })
      .catch(() => {
        setCategories(['Sneakers', 'Formal', 'Casual', 'Sports', 'Boots', 'Sandals', 'Loafers']);
        setBrands(['Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance', 'Skechers', 'Vans', 'Converse']);
        setCatalogSizes(DEFAULT_SIZES);
      });
  }, []);

  // Fetch products when filters change
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProducts({
        category: activeCategory || undefined,
        brand: activeBrand || undefined,
        size: activeSize || undefined,
        sort: activeSort,
        page,
        limit: 12,
        minPrice: activeMin || undefined,
        maxPrice: activeMax || undefined,
        inStock: inStockOnly || undefined,
      });
      setProducts(result.products);
      setTotal(result.pagination.total);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, activeBrand, activeSize, activeSort, page, activeMin, activeMax, inStockOnly]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const totalPages = Math.ceil(total / 12);

  // Stable filter event handlers
  const handleCategory = useCallback((v: string | null) => setParam('category', v), [setParam]);
  const handleBrand = useCallback((v: string | null) => setParam('brand', v), [setParam]);
  const handleSize = useCallback((v: string | null) => setParam('size', v), [setParam]);
  const handleInStock = useCallback((v: boolean) => setParam('inStock', v ? 'true' : null), [setParam]);
  const handlePrice = useCallback((min: number, max: number) => {
    setSearchParams(p => {
      const next = new URLSearchParams(p);
      if (min > 0) next.set('minPrice', String(min)); else next.delete('minPrice');
      if (max > 0) next.set('maxPrice', String(max)); else next.delete('maxPrice');
      next.delete('page');
      return next;
    });
    setPage(1);
  }, [setSearchParams]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: activeCategory || 'All Products' }]} />

      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold">
            {activeCategory || 'All Products'}
          </h1>
          {!loading && (
            <p className="text-sm text-text-muted mt-0.5">
              {total} product{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden flex items-center gap-2 px-4 py-2 border border-border rounded text-sm font-medium hover:border-primary hover:text-primary transition-colors"
        >
          <Filter size={15} />
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20 bg-white border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Filters</p>
              {activeFilterCount > 0 && (
                <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <FiltersPanel
              categories={categories}
              brands={brands}
              sizes={catalogSizes}
              activeCategory={activeCategory}
              activeBrand={activeBrand}
              activeSize={activeSize}
              inStockOnly={inStockOnly}
              activeMin={activeMin}
              activeMax={activeMax}
              activeFilterCount={activeFilterCount}
              onCategory={handleCategory}
              onBrand={handleBrand}
              onSize={handleSize}
              onInStock={handleInStock}
              onPrice={handlePrice}
              onClearAll={clearAllFilters}
            />
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative ml-auto w-72 bg-white h-full overflow-y-auto p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Filters</h3>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close filters"
                >
                  <X size={20} />
                </button>
              </div>
              <FiltersPanel
                categories={categories}
                brands={brands}
                sizes={catalogSizes}
                activeCategory={activeCategory}
                activeBrand={activeBrand}
                activeSize={activeSize}
                inStockOnly={inStockOnly}
                activeMin={activeMin}
                activeMax={activeMax}
                activeFilterCount={activeFilterCount}
                onCategory={handleCategory}
                onBrand={handleBrand}
                onSize={handleSize}
                onInStock={handleInStock}
                onPrice={handlePrice}
                onClearAll={clearAllFilters}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Sort bar + active chips */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Active filter chips */}
            <div className="flex flex-wrap gap-2 flex-1">
              {activeCategory && (
                <Chip label={activeCategory} onRemove={() => handleCategory(null)} />
              )}
              {activeBrand && (
                <Chip label={activeBrand} onRemove={() => handleBrand(null)} />
              )}
              {activeSize && (
                <Chip label={`Size ${activeSize}`} onRemove={() => handleSize(null)} />
              )}
              {(activeMin > 0 || activeMax > 0) && (
                <Chip
                  label={`₹${activeMin || 0}${activeMax > 0 ? `–₹${activeMax}` : '+'}`}
                  onRemove={() => handlePrice(0, 0)}
                />
              )}
              {inStockOnly && (
                <Chip label="In Stock" onRemove={() => handleInStock(false)} />
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <SlidersHorizontal size={14} className="text-text-muted" />
              <select
                value={activeSort}
                onChange={e => setParam('sort', e.target.value)}
                className="border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-surface rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl font-medium mb-3">No products found</p>
              <p className="text-text-muted mb-6">Try adjusting or clearing your filters.</p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-5 py-2.5 bg-primary text-white rounded font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-5">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-border rounded text-sm hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-border rounded text-sm hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Small chip component for active filter badges
const Chip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
    {label}
    <button type="button" onClick={onRemove} aria-label={`Remove ${label} filter`}>
      <X size={11} />
    </button>
  </span>
);

export default ShopPage;
