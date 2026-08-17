import React, { useEffect, useState, useCallback } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  desktopImage: string;
  mobileImage?: string;
  ctaText?: string;
  ctaLink?: string;
  isActive: boolean;
  order: number;
  startDate?: string;
  endDate?: string;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  images?: string[];
  isFeatured: boolean;
  category?: string;
}

const EMPTY_BANNER: Omit<Banner, 'id'> = {
  title: '',
  subtitle: '',
  desktopImage: '',
  mobileImage: '',
  ctaText: '',
  ctaLink: '',
  isActive: true,
  order: 0,
  startDate: '',
  endDate: '',
};

/* ------------------------------------------------------------------ */
/*  Tab helpers                                                        */
/* ------------------------------------------------------------------ */

type Tab = 'banners' | 'featured' | 'seo';

const TABS: { key: Tab; label: string }[] = [
  { key: 'banners', label: 'Banners' },
  { key: 'featured', label: 'Featured Products' },
  { key: 'seo', label: 'SEO' },
];

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export const AdminMarketing = () => {
  const [tab, setTab] = useState<Tab>('banners');
  const [error, setError] = useState<string | null>(null);

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <h1 className="text-2xl font-display mb-6">Marketing</h1>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-lg">&times;</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors -mb-px ${
                tab === t.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'banners' && <BannersTab setError={setError} />}
        {tab === 'featured' && <FeaturedTab setError={setError} />}
        {tab === 'seo' && <SeoTab setError={setError} />}
      </div>
    </AdminLayout>
  );
};

/* ================================================================== */
/*  BANNERS TAB                                                        */
/* ================================================================== */

const BannersTab = ({ setError }: { setError: (v: string | null) => void }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_BANNER);
  const [saving, setSaving] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/marketing/banners');
      setBanners(res.data);
    } catch {
      setError('Failed to load banners.');
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const resetForm = () => {
    setForm(EMPTY_BANNER);
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      desktopImage: banner.desktopImage,
      mobileImage: banner.mobileImage || '',
      ctaText: banner.ctaText || '',
      ctaLink: banner.ctaLink || '',
      isActive: banner.isActive,
      order: banner.order,
      startDate: banner.startDate ? banner.startDate.slice(0, 10) : '',
      endDate: banner.endDate ? banner.endDate.slice(0, 10) : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.desktopImage.trim()) {
      setError('Title and Desktop Image URL are required.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/marketing/banners/${editingId}`, form);
      } else {
        await api.post('/admin/marketing/banners', form);
      }
      resetForm();
      fetchBanners();
    } catch {
      setError('Failed to save banner.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete banner "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/marketing/banners/${id}`);
      fetchBanners();
    } catch {
      setError('Failed to delete banner.');
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      await api.put(`/admin/marketing/banners/${banner.id}`, { isActive: !banner.isActive });
      fetchBanners();
    } catch {
      setError('Failed to update banner status.');
    }
  };

  const updateField = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-text-muted">{banners.length} banner{banners.length !== 1 ? 's' : ''}</p>
        {!showForm && (
          <button onClick={openCreate} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors">
            + Add Banner
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-border rounded p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">{editingId ? 'Edit Banner' : 'New Banner'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input className="w-full border border-border rounded px-3 py-2 text-sm" value={form.title} onChange={(e) => updateField('title', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subtitle</label>
              <input className="w-full border border-border rounded px-3 py-2 text-sm" value={form.subtitle} onChange={(e) => updateField('subtitle', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Desktop Image URL *</label>
              <input className="w-full border border-border rounded px-3 py-2 text-sm" value={form.desktopImage} onChange={(e) => updateField('desktopImage', e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile Image URL</label>
              <input className="w-full border border-border rounded px-3 py-2 text-sm" value={form.mobileImage} onChange={(e) => updateField('mobileImage', e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CTA Text</label>
              <input className="w-full border border-border rounded px-3 py-2 text-sm" value={form.ctaText} onChange={(e) => updateField('ctaText', e.target.value)} placeholder="Shop Now" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CTA Link</label>
              <input className="w-full border border-border rounded px-3 py-2 text-sm" value={form.ctaLink} onChange={(e) => updateField('ctaLink', e.target.value)} placeholder="/products" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Order</label>
              <input type="number" className="w-full border border-border rounded px-3 py-2 text-sm" value={form.order} onChange={(e) => updateField('order', Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="banner-active" checked={form.isActive} onChange={(e) => updateField('isActive', e.target.checked)} className="h-4 w-4" />
              <label htmlFor="banner-active" className="text-sm font-medium">Active</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" className="w-full border border-border rounded px-3 py-2 text-sm" value={form.startDate} onChange={(e) => updateField('startDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" className="w-full border border-border rounded px-3 py-2 text-sm" value={form.endDate} onChange={(e) => updateField('endDate', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : editingId ? 'Update Banner' : 'Create Banner'}
            </button>
            <button onClick={resetForm} className="px-5 py-2 border border-border text-sm rounded hover:bg-surface transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F0F0F0]">
            <tr>
              <th className="p-3 font-semibold">Image</th>
              <th className="p-3 font-semibold">Title</th>
              <th className="p-3 font-semibold">CTA</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Order</th>
              <th className="p-3 font-semibold">Schedule</th>
              <th className="p-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {banners.map((b) => (
              <tr key={b.id} className="hover:bg-surface transition-colors">
                <td className="p-3">
                  <img src={b.desktopImage || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2232%22 fill=%22%23e5e7eb%22%3E%3Crect width=%2264%22 height=%2232%22 rx=%224%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2210%22 fill=%22%239ca3af%22%3Eimg%3C/text%3E%3C/svg%3E'} alt={b.title} className="w-16 h-8 object-cover rounded" />
                </td>
                <td className="p-3">
                  <p className="font-medium">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-text-muted">{b.subtitle}</p>}
                </td>
                <td className="p-3 text-text-muted">{b.ctaText || '—'}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggleActive(b)}
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {b.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="p-3 text-text-muted">{b.order}</td>
                <td className="p-3 text-xs text-text-muted">
                  {b.startDate ? new Date(b.startDate).toLocaleDateString() : '—'}
                  {' → '}
                  {b.endDate ? new Date(b.endDate).toLocaleDateString() : '—'}
                </td>
                <td className="p-3 text-right space-x-3">
                  <button onClick={() => openEdit(b)} className="text-primary hover:underline text-sm">Edit</button>
                  <button onClick={() => handleDelete(b.id, b.title)} className="text-danger hover:underline text-sm">Delete</button>
                </td>
              </tr>
            ))}
            {banners.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-text-muted">
                  No banners yet. <button onClick={openCreate} className="text-primary hover:underline">Create your first banner</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ================================================================== */
/*  FEATURED PRODUCTS TAB                                              */
/* ================================================================== */

const FeaturedTab = ({ setError }: { setError: (v: string | null) => void }) => {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchFeatured = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/products', { params: { featured: true } });
      setFeatured(res.data);
    } catch {
      setError('Failed to load featured products.');
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => { fetchFeatured(); }, [fetchFeatured]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.get('/admin/products', { params: { search: searchQuery } });
      setSearchResults(res.data);
    } catch {
      setError('Failed to search products.');
    } finally {
      setSearching(false);
    }
  };

  const toggleFeatured = async (product: Product) => {
    try {
      await api.put(`/admin/products/${product.id}/featured`, { isFeatured: !product.isFeatured });
      fetchFeatured();
      setSearchResults((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isFeatured: !p.isFeatured } : p))
      );
    } catch {
      setError('Failed to update featured status.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Current featured */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-3">Currently Featured</h2>
        {featured.length === 0 ? (
          <p className="text-sm text-text-muted">No featured products. Use the search below to add some.</p>
        ) : (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Image</th>
                  <th className="p-3 font-semibold">Product</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Price</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {featured.map((p) => (
                  <tr key={p.id} className="hover:bg-surface transition-colors">
                    <td className="p-3">
                      <img src={p.images?.[0] || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 fill=%22%23e5e7eb%22%3E%3Crect width=%2240%22 height=%2240%22 rx=%224%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2210%22 fill=%22%239ca3af%22%3Eimg%3C/text%3E%3C/svg%3E'} alt={p.name} className="w-10 h-10 object-cover rounded" />
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-text-muted">{p.brand}</p>
                    </td>
                    <td className="p-3 text-text-muted">{p.category || '—'}</td>
                    <td className="p-3 font-medium">₹{Number(p.price).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => toggleFeatured(p)} className="text-danger hover:underline text-sm">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Search to add */}
      <div>
        <h2 className="text-lg font-medium mb-3">Add Featured Product</h2>
        <div className="flex gap-3 mb-4">
          <input
            className="border border-border rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
            placeholder="Search products by name, brand, SKU…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors">
            Search
          </button>
        </div>

        {searching ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : searchResults.length > 0 ? (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Image</th>
                  <th className="p-3 font-semibold">Product</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Price</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {searchResults.map((p) => (
                  <tr key={p.id} className="hover:bg-surface transition-colors">
                    <td className="p-3">
                      <img src={p.images?.[0] || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 fill=%22%23e5e7eb%22%3E%3Crect width=%2240%22 height=%2240%22 rx=%224%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2210%22 fill=%22%239ca3af%22%3Eimg%3C/text%3E%3C/svg%3E'} alt={p.name} className="w-10 h-10 object-cover rounded" />
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-text-muted">{p.brand}</p>
                    </td>
                    <td className="p-3 text-text-muted">{p.category || '—'}</td>
                    <td className="p-3 font-medium">₹{Number(p.price).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => toggleFeatured(p)} className={`text-sm ${p.isFeatured ? 'text-danger hover:underline' : 'text-primary hover:underline'}`}>
                        {p.isFeatured ? 'Remove' : 'Feature'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
};

/* ================================================================== */
/*  SEO TAB (placeholder)                                              */
/* ================================================================== */

const SeoTab = ({ setError }: { setError: (v: string | null) => void }) => {
  const [siteTitle, setSiteTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSeo = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/marketing/seo');
        setSiteTitle(res.data.siteTitle || '');
        setMetaDescription(res.data.metaDescription || '');
        setOgImage(res.data.ogImage || '');
      } catch {
        // SEO endpoint may not exist yet — fail silently
      } finally {
        setLoading(false);
      }
    };
    fetchSeo();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/marketing/seo', { siteTitle, metaDescription, ogImage });
    } catch {
      setError('Failed to save SEO settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="bg-white border border-border rounded p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Site Title</label>
          <input
            className="w-full border border-border rounded px-3 py-2 text-sm"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            placeholder="SoleVault — Premium Shoe Store"
          />
          <p className="text-xs text-text-muted mt-1">Appears in browser tabs and search results.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Meta Description</label>
          <textarea
            className="w-full border border-border rounded px-3 py-2 text-sm resize-none"
            rows={3}
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Shop premium sneakers, formal shoes, and more at SoleVault."
          />
          <p className="text-xs text-text-muted mt-1">Recommended: 150–160 characters.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">OG Image URL</label>
          <input
            className="w-full border border-border rounded px-3 py-2 text-sm"
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            placeholder="https://..."
          />
          <p className="text-xs text-text-muted mt-1">Image shown when shared on social media (1200×630 recommended).</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save SEO Settings'}
        </button>
      </div>
    </div>
  );
};
