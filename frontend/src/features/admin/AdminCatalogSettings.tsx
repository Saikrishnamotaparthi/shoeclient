import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

const DEFAULT_CATEGORIES = ['Sneakers', 'Formal', 'Casual', 'Sports', 'Boots', 'Sandals', 'Loafers', 'Slippers'];
const DEFAULT_BRANDS = ['Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance', 'Skechers', 'Under Armour', 'Vans', 'Converse'];
const DEFAULT_SIZES = ['5', '6', '7', '8', '9', '10', '11', '12', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'];

const inputCls = 'border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary flex-1';

// ─── Item List Editor ────────────────────────────────────────────────────────
const ListEditor = ({
  title,
  subtitle,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  title: string;
  subtitle: string;
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
}) => {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const v = input.trim();
    if (!v || items.includes(v)) return;
    onAdd(v);
    setInput('');
  };

  return (
    <div className="bg-white border border-border rounded">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
      </div>

      {/* Add new */}
      <div className="px-5 py-4 border-b border-border bg-surface">
        <div className="flex gap-2">
          <input
            className={inputCls}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={placeholder}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim() || items.includes(input.trim())}
            className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-40 shrink-0"
          >
            + Add
          </button>
        </div>
        {input.trim() && items.includes(input.trim()) && (
          <p className="text-xs text-danger mt-1">Already exists in the list.</p>
        )}
      </div>

      {/* Items */}
      <div className="divide-y divide-border">
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-muted">No items yet. Add one above.</p>
        ) : items.map((item, idx) => (
          <div key={item} className="flex items-center justify-between px-5 py-3 hover:bg-surface group">
            <div className="flex items-center gap-3">
              <span className="text-text-muted text-xs w-5 text-right">{idx + 1}.</span>
              <span className="text-sm font-medium">{item}</span>
            </div>
            <button
              onClick={() => onRemove(item)}
              className="text-danger text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-t border-border text-xs text-text-muted">
        {items.length} item{items.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AdminCatalogSettings = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/admin/catalog-settings')
      .then(res => {
        setCategories(res.data.categories?.length ? res.data.categories : DEFAULT_CATEGORIES);
        setBrands(res.data.brands?.length ? res.data.brands : DEFAULT_BRANDS);
        setSizes(res.data.sizes?.length ? res.data.sizes : DEFAULT_SIZES);
      })
      .catch(() => {
        setCategories(DEFAULT_CATEGORIES);
        setBrands(DEFAULT_BRANDS);
        setSizes(DEFAULT_SIZES);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/admin/catalog-settings', { categories, brands, sizes });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-display">Categories, Brands & Sizes</h1>
            <p className="text-sm text-text-muted mt-1">
              Manage the lists used in product forms and storefront filters.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Saving…</>
            ) : saved ? (
              '✓ Saved!'
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

        {saved && (
          <div className="mb-5 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
            ✓ Changes saved. Product forms and storefront filters will now use the updated lists.
          </div>
        )}

        {/* 3-column grid — Categories | Brands | Sizes */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ListEditor
            title="Categories"
            subtitle="Used in product form dropdown and shop page category filters."
            items={categories}
            placeholder="e.g. Sneakers, Formal, Boots…"
            onAdd={v => setCategories(prev => [...prev, v])}
            onRemove={v => setCategories(prev => prev.filter(x => x !== v))}
          />

          <ListEditor
            title="Brands"
            subtitle="Used in product form dropdown and shop page brand filters."
            items={brands}
            placeholder="e.g. Nike, Adidas, Puma…"
            onAdd={v => setBrands(prev => [...prev, v])}
            onRemove={v => setBrands(prev => prev.filter(x => x !== v))}
          />

          <ListEditor
            title="Sizes"
            subtitle="Used in product size selector and shop page size filters."
            items={sizes}
            placeholder="e.g. 8, UK 9, 10.5…"
            onAdd={v => setSizes(prev => [...prev, v])}
            onRemove={v => setSizes(prev => prev.filter(x => x !== v))}
          />
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-800">
          <strong>Note:</strong> Removing an item from these lists will not affect existing products that already use it.
          Changes only affect the <em>dropdown options</em> shown when adding or editing products, and the filter options shown on the shop page.
        </div>
      </div>
    </AdminLayout>
  );
};
