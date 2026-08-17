import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

export const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/admin/products', { params });
      setProducts(res.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/products/${id}`);
      fetchProducts();
    } catch {
      setError('Failed to delete product. Please try again.');
    }
  };

  const toggleActive = async (product: any) => {
    try {
      await api.put(`/admin/products/${product.id}`, { isActive: !product.isActive });
      fetchProducts();
    } catch {
      setError('Failed to update product status. Please try again.');
    }
  };

  const totalStock = (product: any) => (product.sizes || []).reduce((s: number, sz: any) => s + (sz.stock || 0), 0);

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-display">Products</h1>
          <button
            onClick={() => navigate('/admin/products/add')}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors"
          >
            + Add Product
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-lg">&times;</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            className="border border-border rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
            placeholder="Search name, brand, SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchProducts()}
          />
          <select
            className="border border-border rounded px-3 py-2 text-sm bg-white"
            value={filterCategory}
            onChange={e => { setFilterCategory(e.target.value); }}
          >
            <option value="">All Categories</option>
            {['Sneakers', 'Formal', 'Casual', 'Sports', 'Boots', 'Sandals', 'Loafers', 'Slippers'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="border border-border rounded px-3 py-2 text-sm bg-white"
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button onClick={fetchProducts} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface">
            Search
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Image</th>
                  <th className="p-3 font-semibold">Product / Brand</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Price</th>
                  <th className="p-3 font-semibold">Sizes / Stock</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Featured</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-surface transition-colors">
                    <td className="p-3">
                      <img
                        src={p.images?.[0] || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 fill=%22%23e5e7eb%22%3E%3Crect width=%2240%22 height=%2240%22 rx=%224%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2210%22 fill=%22%239ca3af%22%3Eimg%3C/text%3E%3C/svg%3E'}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-text-muted text-xs">{p.brand} · {p.sku || '—'}</p>
                    </td>
                    <td className="p-3 text-text-muted">{p.category}</td>
                    <td className="p-3">
                      <p className="font-medium">₹{Number(p.price).toLocaleString('en-IN')}</p>
                      {p.discountPrice && <p className="text-xs text-text-muted line-through">₹{Number(p.discountPrice).toLocaleString('en-IN')}</p>}
                    </td>
                    <td className="p-3">
                      <p>{(p.sizes || []).length} sizes</p>
                      <p className="text-xs text-text-muted">{totalStock(p)} units total</p>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-3">
                      {p.isFeatured ? <span className="text-primary text-sm">★</span> : <span className="text-border text-sm">☆</span>}
                    </td>
                    <td className="p-3 text-right space-x-3">
                      <button
                        onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                        className="text-primary hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="text-danger hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-text-muted">
                      No products found. <button onClick={() => navigate('/admin/products/add')} className="text-primary hover:underline">Add your first product</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-surface border-t border-border text-xs text-text-muted">
              {products.length} product{products.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
