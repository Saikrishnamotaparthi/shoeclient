import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

// ─── Types ─────────────────────────────────────────────────────────────────
interface SizeRow {
  size: string;
  sku: string;
  stock: number;
  reorderLevel: number;
}

interface FormData {
  name: string;
  slug: string;
  brand: string;
  sku: string;
  shortDescription: string;
  description: string;
  price: string;
  discountPrice: string;
  category: string;
  collection: string;
  tags: string;
  material: string;
  careInstructions: string;
  fit: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  productStatus: string;
}

const DEFAULT_SHOE_SIZES = ['5', '6', '7', '8', '9', '10', '11', '12', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'];

// ─── ImageUrlList ─────────────────────────────────────────────────────────────
// Defined OUTSIDE the main component so it never re-mounts on state change
interface ImageUrlListProps {
  urls: string[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onChange: (i: number, v: string) => void;
  newUrl: string;
  onNewUrlChange: (v: string) => void;
}

const ImageUrlList: React.FC<ImageUrlListProps> = ({ urls, onAdd, onRemove, onChange, newUrl, onNewUrlChange }) => (
  <div className="space-y-3">
    {/* Existing URL rows */}
    {urls.map((url, i) => (
      <div key={i} className="flex items-center gap-2">
        <span className="text-xs text-text-muted w-5 text-right shrink-0">{i + 1}.</span>
        {url && (
          <img
            src={url}
            alt={`Preview ${i + 1}`}
            className="w-10 h-10 object-cover rounded border border-border shrink-0"
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        )}
        <input
          className="flex-1 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
          value={url}
          onChange={e => onChange(i, e.target.value)}
          placeholder={`Image URL ${i + 1}`}
        />
        <button
          type="button"
          onClick={() => onRemove(i)}
          className="text-danger text-sm hover:underline shrink-0 px-2"
        >
          ✕
        </button>
      </div>
    ))}

    {/* Add new URL row */}
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted w-5 text-right shrink-0">{urls.length + 1}.</span>
      <input
        className="flex-1 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
        value={newUrl}
        onChange={e => onNewUrlChange(e.target.value)}
        placeholder="Paste image URL and click Add"
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newUrl.trim()) onAdd(); } }}
      />
      <button
        type="button"
        onClick={onAdd}
        disabled={!newUrl.trim()}
        className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-40 shrink-0"
      >
        + Add
      </button>
    </div>

    <p className="text-xs text-text-muted">
      Upload to <a href="https://postimages.org" target="_blank" rel="noreferrer" className="text-primary hover:underline">postimages.org</a> → copy "Direct link" → paste above.
    </p>
  </div>
);

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

// ─── Static helper components (MUST be outside main component to prevent remount on every keystroke) ─────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white border border-border rounded p-6 space-y-4">
    <h2 className="text-base font-semibold text-text border-b border-border pb-2">{title}</h2>
    {children}
  </div>
);

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-text">
      {label}{required && <span className="text-danger ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = 'w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary';
const textareaCls = `${inputCls} resize-none`;

// ─── Main Component ───────────────────────────────────────────────────────
export const AdminProductForm = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [newSizeValue, setNewSizeValue] = useState('');
  const [customSizeInput, setCustomSizeInput] = useState('');

  // Image URL list state
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Dynamic lists from backend catalog settings
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [catalogSizes, setCatalogSizes] = useState<string[]>([]);

  const [form, setForm] = useState<FormData>({
    name: '', slug: '', brand: '', sku: '',
    shortDescription: '', description: '',
    price: '', discountPrice: '',
    category: '', collection: '', tags: '',
    material: '', careInstructions: '', fit: '',
    isFeatured: false, isNewArrival: false, isActive: true, productStatus: 'ACTIVE',
  });

  // Load categories, brands & sizes from settings
  useEffect(() => {
    api.get('/admin/catalog-settings').then(res => {
      setCategories(res.data.categories || []);
      setBrands(res.data.brands || []);
      setCatalogSizes(res.data.sizes || []);
    }).catch(() => {
      setCategories(['Sneakers', 'Formal', 'Casual', 'Sports', 'Boots', 'Sandals', 'Loafers', 'Slippers']);
      setBrands(['Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance', 'Skechers', 'Under Armour', 'Vans', 'Converse']);
      setCatalogSizes([]);
    });
  }, []);

  // Load existing product for editing
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/admin/products/${id}`).then(res => {
      const p = res.data;
      setForm({
        name: p.name || '', slug: p.slug || '', brand: p.brand || '', sku: p.sku || '',
        shortDescription: p.shortDescription || '', description: p.description || '',
        price: String(p.price || ''), discountPrice: String(p.discountPrice || ''),
        category: p.category || '', collection: p.collection || '',
        tags: (p.tags || []).join(', '),
        material: p.material || '', careInstructions: p.careInstructions || '', fit: p.fit || '',
        isFeatured: p.isFeatured || false, isNewArrival: p.isNewArrival || false,
        isActive: p.isActive !== false, productStatus: p.productStatus || 'ACTIVE',
      });
      setImagesList(p.images || []);
      setSizes((p.sizes || []).map((s: any) => ({
        size: s.size, sku: s.sku || '', stock: s.stock || 0, reorderLevel: s.reorderLevel || 5,
      })));
    }).catch(() => setError('Failed to load product'))
      .finally(() => setIsLoading(false));
  }, [id, isEdit]);

  // useCallback prevents a new function reference on every render
  const set = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm(prev => ({
        ...prev,
        [field]: value,
        ...(field === 'name' && !isEdit ? { slug: generateSlug(String(value)) } : {}),
      }));
    },
    [isEdit]
  );

  const addSize = () => {
    const sizeVal = newSizeValue === 'custom' ? customSizeInput.trim() : newSizeValue;
    if (!sizeVal) return;
    if (sizes.find(s => s.size === sizeVal)) return;
    setSizes(prev => [...prev, {
      size: sizeVal,
      sku: `${form.sku || 'SKU'}-${sizeVal}`,
      stock: 0,
      reorderLevel: 5,
    }]);
    setNewSizeValue('');
    setCustomSizeInput('');
  };

  const updateSize = (idx: number, field: keyof SizeRow, value: string | number) => {
    setSizes(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeSize = (idx: number) => {
    setSizes(prev => prev.filter((_, i) => i !== idx));
  };

  // Image URL helpers
  const addImageUrl = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setImagesList(prev => [...prev, url]);
    setNewImageUrl('');
  };
  const removeImageUrl = (i: number) => setImagesList(prev => prev.filter((_, idx) => idx !== i));
  const updateImageUrl = (i: number, v: string) => setImagesList(prev => prev.map((u, idx) => idx === i ? v : u));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imagesList.length === 0) { setError('Please add at least one product image'); return; }
    if (sizes.length === 0) { setError('Please add at least one size/variant'); return; }
    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: form.name, slug: form.slug, brand: form.brand, sku: form.sku,
      shortDescription: form.shortDescription, description: form.description,
      price: parseFloat(form.price),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : undefined,
      images: imagesList.filter(Boolean),
      category: form.category, collection: form.collection || undefined,
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      material: form.material || undefined,
      careInstructions: form.careInstructions || undefined,
      fit: form.fit || undefined,
      isFeatured: form.isFeatured, isNewArrival: form.isNewArrival, isActive: form.isActive, productStatus: form.productStatus,
      sizes: sizes.map(s => ({ size: s.size, sku: s.sku, stock: Number(s.stock), reorderLevel: Number(s.reorderLevel) })),
      badges: [],
    };

    try {
      if (isEdit) await api.put(`/admin/products/${id}`, payload);
      else await api.post('/admin/products', payload);
      navigate('/admin/products');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <button onClick={() => navigate('/admin/products')} className="text-sm text-text-muted hover:text-text mb-1">
              ← Back to Products
            </button>
            <h1 className="text-2xl font-display">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/catalog-settings')}
              className="px-3 py-2 text-xs border border-border rounded hover:bg-surface text-text-muted"
            >
              ⚙ Manage Categories, Brands & Sizes
            </button>
            <button type="button" onClick={() => navigate('/admin/products')} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface">
              Cancel
            </button>
            <button
              form="product-form"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : (isEdit ? 'Update Product' : 'Save Product')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 text-danger border border-danger/20 rounded text-sm">{error}</div>
        )}

        <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <Section title="Basic Information">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Product Name" required>
                <input required className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. Nike Air Max 270" />
              </Field>
              <Field label="Slug" required>
                <input required className={inputCls} value={form.slug} onChange={set('slug')} placeholder="auto-generated from name" />
              </Field>
              <Field label="Brand" required>
                {brands.length > 0 ? (
                  <select required className={inputCls} value={form.brand} onChange={set('brand')}>
                    <option value="">Select Brand</option>
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="__other__">Other (type below)</option>
                  </select>
                ) : (
                  <input required className={inputCls} value={form.brand} onChange={set('brand')} placeholder="e.g. Nike" />
                )}
                {form.brand === '__other__' && (
                  <input
                    className={`${inputCls} mt-2`}
                    placeholder="Enter brand name"
                    onChange={e => setForm(prev => ({ ...prev, brand: e.target.value }))}
                  />
                )}
              </Field>
              <Field label="SKU" required>
                <input required className={inputCls} value={form.sku} onChange={set('sku')} placeholder="e.g. NK-AM270-001" />
              </Field>
            </div>
            <Field label="Short Description">
              <textarea rows={2} className={textareaCls} value={form.shortDescription} onChange={set('shortDescription')} placeholder="Brief product summary (optional)" />
            </Field>
            <Field label="Full Description" required>
              <textarea required rows={5} className={textareaCls} value={form.description} onChange={set('description')} placeholder="Detailed product description" />
            </Field>
          </Section>

          {/* Pricing */}
          <Section title="Pricing">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Selling Price (₹)" required>
                <input required type="number" step="0.01" min="0" className={inputCls} value={form.price} onChange={set('price')} placeholder="0.00" />
              </Field>
              <Field label="MRP / Original Price (₹)">
                <input type="number" step="0.01" min="0" className={inputCls} value={form.discountPrice} onChange={set('discountPrice')} placeholder="Leave blank if no strikethrough price" />
              </Field>
            </div>
          </Section>

          {/* Images */}
          <Section title="Product Images">
            <p className="text-xs text-text-muted -mt-2 mb-3">
              Add each image URL separately. Each URL gets its own row with a live preview.
            </p>
            <ImageUrlList
              urls={imagesList}
              newUrl={newImageUrl}
              onNewUrlChange={setNewImageUrl}
              onAdd={addImageUrl}
              onRemove={removeImageUrl}
              onChange={updateImageUrl}
            />
          </Section>

          {/* Category & Tags */}
          <Section title="Category & Tags">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" required>
                <select required className={inputCls} value={form.category} onChange={set('category')}>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Collection">
                <input className={inputCls} value={form.collection} onChange={set('collection')} placeholder="e.g. Summer 2026" />
              </Field>
            </div>
            <Field label="Tags (comma separated)">
              <input className={inputCls} value={form.tags} onChange={set('tags')} placeholder="e.g. running, lightweight, breathable" />
            </Field>
          </Section>

          {/* Sizes / Variants */}
          <Section title="Sizes & Stock">
            <p className="text-xs text-text-muted -mt-2">Stock is tracked per size. Add all available sizes for this product.</p>
            {sizes.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded">
                  <thead className="bg-surface">
                    <tr>
                      <th className="p-2 text-left font-medium text-xs">Size</th>
                      <th className="p-2 text-left font-medium text-xs">SKU</th>
                      <th className="p-2 text-left font-medium text-xs">Stock</th>
                      <th className="p-2 text-left font-medium text-xs">Reorder Level</th>
                      <th className="p-2 text-left font-medium text-xs">Status</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sizes.map((s, idx) => (
                      <tr key={s.size}>
                        <td className="p-2 font-medium">{s.size}</td>
                        <td className="p-2">
                          <input className="border border-border rounded px-2 py-1 text-xs w-32" value={s.sku} onChange={e => updateSize(idx, 'sku', e.target.value)} />
                        </td>
                        <td className="p-2">
                          <input type="number" min="0" className="border border-border rounded px-2 py-1 text-xs w-20" value={s.stock} onChange={e => updateSize(idx, 'stock', parseInt(e.target.value) || 0)} />
                        </td>
                        <td className="p-2">
                          <input type="number" min="0" className="border border-border rounded px-2 py-1 text-xs w-20" value={s.reorderLevel} onChange={e => updateSize(idx, 'reorderLevel', parseInt(e.target.value) || 0)} />
                        </td>
                        <td className="p-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            s.stock === 0 ? 'bg-danger/10 text-danger' :
                            s.stock <= s.reorderLevel ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {s.stock === 0 ? 'Out of Stock' : s.stock <= s.reorderLevel ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="p-2">
                          <button type="button" onClick={() => removeSize(idx)} className="text-danger hover:underline text-xs">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <select
                className="border border-border rounded px-3 py-2 text-sm"
                value={newSizeValue}
                onChange={e => { setNewSizeValue(e.target.value); setCustomSizeInput(''); }}
              >
                <option value="">Select Size</option>
                {/* Prefer catalog sizes if available, fall back to defaults */}
                {(catalogSizes.length > 0 ? catalogSizes : DEFAULT_SHOE_SIZES)
                  .filter(sz => !sizes.find(s => s.size === sz))
                  .map(sz => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))
                }
                <option value="custom">Custom…</option>
              </select>
              {newSizeValue === 'custom' && (
                <input
                  className="border border-border rounded px-3 py-2 text-sm w-24"
                  placeholder="e.g. 8.5"
                  value={customSizeInput}
                  onChange={e => setCustomSizeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }}
                />
              )}
              <button type="button" onClick={addSize} className="px-4 py-2 text-sm border border-primary text-primary rounded hover:bg-primary hover:text-white transition-colors">
                + Add Size
              </button>
            </div>
          </Section>

          {/* Additional Details */}
          <Section title="Additional Details">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Material">
                <input className={inputCls} value={form.material} onChange={set('material')} placeholder="e.g. Mesh upper, Rubber sole" />
              </Field>
              <Field label="Care Instructions">
                <input className={inputCls} value={form.careInstructions} onChange={set('careInstructions')} placeholder="e.g. Spot clean only" />
              </Field>
              <Field label="Fit">
                <input className={inputCls} value={form.fit} onChange={set('fit')} placeholder="e.g. Regular fit" />
              </Field>
            </div>
          </Section>

          {/* Settings */}
          <Section title="Settings">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Status</label>
                <select
                  value={form.productStatus}
                  onChange={(e) => setForm(prev => ({ ...prev, productStatus: e.target.value }))}
                  className={inputCls}
                >
                  <option value="ACTIVE">Active — Available for purchase</option>
                  <option value="COMING_SOON">Coming Soon — Not available yet</option>
                  <option value="RESTOCKING_SOON">Restocking Soon — Temporarily out of stock</option>
                  <option value="SOLD_OUT">Sold Out — No longer available</option>
                  <option value="INACTIVE">Inactive — Hidden from store</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {form.productStatus === 'COMING_SOON' && 'Product will be visible with "Coming Soon" badge. Add to cart disabled.'}
                  {form.productStatus === 'RESTOCKING_SOON' && 'Product will show "Restocking Soon" badge. Add to cart disabled.'}
                  {form.productStatus === 'SOLD_OUT' && 'Product will show "Sold Out" badge. Add to cart disabled.'}
                  {form.productStatus === 'ACTIVE' && 'Product is available for purchase.'}
                  {form.productStatus === 'INACTIVE' && 'Product is hidden from the store.'}
                </p>
              </div>
              <div className="flex gap-8">
                {[
                  { field: 'isActive' as const, label: 'Active (visible on store)' },
                  { field: 'isFeatured' as const, label: 'Featured' },
                  { field: 'isNewArrival' as const, label: 'New Arrival' },
                ].map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[field] as boolean} onChange={set(field)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </Section>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminProductForm;
