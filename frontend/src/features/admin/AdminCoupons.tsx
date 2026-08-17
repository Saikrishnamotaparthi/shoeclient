import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

const EMPTY_FORM = {
  code: '',
  type: 'percentage' as 'percentage' | 'fixed' | 'free_shipping',
  value: '',
  maxDiscount: '',
  minOrderValue: '',
  usageLimitTotal: '',
  usageLimitPerCustomer: '',
  startDate: '',
  endDate: '',
  firstOrderOnly: false,
  status: 'active' as 'active' | 'paused' | 'inactive',
};

type CouponForm = typeof EMPTY_FORM;

const inputCls = 'w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary';

export const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);

  const fetchCoupons = async () => {
    try {
      const res = await api.get('/admin/coupons');
      setCoupons(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (coupon: any) => {
    setForm({
      code: coupon.code || '',
      type: coupon.type || 'percentage',
      value: String(coupon.value || ''),
      maxDiscount: String(coupon.maxDiscount || ''),
      minOrderValue: String(coupon.minOrderValue || ''),
      usageLimitTotal: String(coupon.usageLimitTotal || coupon.usageLimit || ''),
      usageLimitPerCustomer: String(coupon.usageLimitPerCustomer || ''),
      startDate: coupon.startDate ? coupon.startDate.split('T')[0] : '',
      endDate: coupon.endDate ? coupon.endDate.split('T')[0] : '',
      firstOrderOnly: coupon.firstOrderOnly || false,
      status: coupon.status || (coupon.isActive ? 'active' : 'inactive'),
    });
    setEditId(coupon.id);
    setShowModal(true);
  };

  const set = (field: keyof CouponForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        status: form.status,
        isActive: form.status === 'active',
        firstOrderOnly: form.firstOrderOnly,
      };
      if (form.type !== 'free_shipping') payload.value = parseFloat(form.value);
      if (form.maxDiscount) payload.maxDiscount = parseFloat(form.maxDiscount);
      if (form.minOrderValue) payload.minOrderValue = parseFloat(form.minOrderValue);
      if (form.usageLimitTotal) payload.usageLimitTotal = parseInt(form.usageLimitTotal);
      if (form.usageLimitPerCustomer) payload.usageLimitPerCustomer = parseInt(form.usageLimitPerCustomer);
      if (form.startDate) payload.startDate = new Date(form.startDate).toISOString();
      if (form.endDate) payload.endDate = new Date(form.endDate).toISOString();

      if (editId) {
        await api.put(`/admin/coupons/${editId}`, payload);
      } else {
        await api.post('/admin/coupons', payload);
      }
      setShowModal(false);
      fetchCoupons();
    } catch { alert('Failed to save coupon'); }
    finally { setSubmitting(false); }
  };

  const quickStatus = async (coupon: any, status: string) => {
    try {
      await api.put(`/admin/coupons/${coupon.id}`, { status, isActive: status === 'active' });
      fetchCoupons();
    } catch { alert('Failed to update'); }
  };

  const discountLabel = (c: any) => {
    if (c.type === 'free_shipping') return 'Free Shipping';
    if (c.type === 'percentage') return `${c.value}% off`;
    return `₹${c.value} off`;
  };

  const statusBadge = (c: any) => {
    const s = c.status || (c.isActive ? 'active' : 'inactive');
    return {
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      inactive: 'bg-gray-100 text-gray-500',
    }[s as string] || 'bg-gray-100 text-gray-500';
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted pt-4 pb-1 border-t border-border first:border-0 first:pt-0">{children}</p>
  );

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-display">Coupons</h1>
          <button onClick={openCreate} className="px-4 py-2 bg-primary text-white text-sm rounded hover:bg-primary/90">
            + Create Coupon
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F0F0F0]">
                <tr>
                  <th className="p-3 font-semibold">Code</th>
                  <th className="p-3 font-semibold">Discount</th>
                  <th className="p-3 font-semibold">Conditions</th>
                  <th className="p-3 font-semibold">Usage</th>
                  <th className="p-3 font-semibold">Validity</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-surface">
                    <td className="p-3">
                      <p className="font-mono font-bold tracking-wider">{c.code}</p>
                      {c.firstOrderOnly && <p className="text-[10px] text-text-muted">First order only</p>}
                    </td>
                    <td className="p-3 font-medium">{discountLabel(c)}</td>
                    <td className="p-3 text-xs text-text-muted">
                      {c.minOrderValue ? <span>Min ₹{c.minOrderValue}</span> : '—'}
                      {c.maxDiscount ? <><br />Max ₹{c.maxDiscount}</> : ''}
                    </td>
                    <td className="p-3 text-xs">
                      <span>{c.usedCount || 0}</span>
                      {(c.usageLimitTotal || c.usageLimit) ? <span className="text-text-muted"> / {c.usageLimitTotal || c.usageLimit}</span> : <span className="text-text-muted"> / ∞</span>}
                    </td>
                    <td className="p-3 text-xs text-text-muted">
                      {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
                      {c.endDate ? ` → ${new Date(c.endDate).toLocaleDateString()}` : ''}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusBadge(c)}`}>
                        {(c.status || (c.isActive ? 'active' : 'inactive')).toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => openEdit(c)} className="text-primary text-sm hover:underline">Edit</button>
                      {(c.status || (c.isActive ? 'active' : 'inactive')) === 'active'
                        ? <button onClick={() => quickStatus(c, 'paused')} className="text-yellow-600 text-sm hover:underline">Pause</button>
                        : <button onClick={() => quickStatus(c, 'active')} className="text-green-600 text-sm hover:underline">Activate</button>
                      }
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr><td colSpan={7} className="p-10 text-center text-text-muted">No coupons yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Coupon Builder Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-display mb-4">{editId ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <form onSubmit={handleSubmit} className="space-y-3">

                <SectionLabel>Basics</SectionLabel>
                <div>
                  <label className="block text-sm font-medium mb-1">Coupon Code <span className="text-danger">*</span></label>
                  <input required className={`${inputCls} uppercase font-mono tracking-wider`} value={form.code} onChange={set('code')} placeholder="e.g. WELCOME10" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type <span className="text-danger">*</span></label>
                  <div className="flex gap-2">
                    {(['percentage', 'fixed', 'free_shipping'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, type: t }))}
                        className={`flex-1 py-2 text-xs rounded border transition-colors ${form.type === t ? 'bg-primary text-white border-primary' : 'border-border hover:bg-surface'}`}
                      >
                        {t === 'percentage' ? '% Percentage' : t === 'fixed' ? '₹ Fixed Amount' : '🚚 Free Shipping'}
                      </button>
                    ))}
                  </div>
                </div>

                {form.type !== 'free_shipping' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Discount Value {form.type === 'percentage' ? '(%)' : '(₹)'} <span className="text-danger">*</span>
                    </label>
                    <input required type="number" step="0.01" min="0" className={inputCls} value={form.value} onChange={set('value')} placeholder={form.type === 'percentage' ? 'e.g. 10' : 'e.g. 100'} />
                  </div>
                )}

                <SectionLabel>Conditions</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Cart Value (₹)</label>
                    <input type="number" step="0.01" min="0" className={inputCls} value={form.minOrderValue} onChange={set('minOrderValue')} placeholder="e.g. 999" />
                  </div>
                  {form.type === 'percentage' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Discount (₹)</label>
                      <input type="number" step="0.01" min="0" className={inputCls} value={form.maxDiscount} onChange={set('maxDiscount')} placeholder="e.g. 500" />
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.firstOrderOnly} onChange={set('firstOrderOnly')} className="w-4 h-4 accent-primary" />
                  <span className="text-sm">First order only</span>
                </label>

                <SectionLabel>Usage Limits</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Uses</label>
                    <input type="number" min="1" className={inputCls} value={form.usageLimitTotal} onChange={set('usageLimitTotal')} placeholder="Unlimited" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Per Customer</label>
                    <input type="number" min="1" className={inputCls} value={form.usageLimitPerCustomer} onChange={set('usageLimitPerCustomer')} placeholder="Unlimited" />
                  </div>
                </div>

                <SectionLabel>Schedule</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input type="date" className={inputCls} value={form.startDate} onChange={set('startDate')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date (Expiry)</label>
                    <input type="date" className={inputCls} value={form.endDate} onChange={set('endDate')} />
                  </div>
                </div>

                <SectionLabel>Status</SectionLabel>
                <div className="flex gap-2">
                  {(['active', 'paused', 'inactive'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, status: s }))}
                      className={`flex-1 py-2 text-xs rounded border capitalize transition-colors ${form.status === s ? 'bg-primary text-white border-primary' : 'border-border hover:bg-surface'}`}
                    >
                      {s === 'active' ? '✅ Active' : s === 'paused' ? '⏸ Paused' : '❌ Inactive'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-muted">Use <strong>Pause</strong> instead of deleting active promotions — safer and reversible.</p>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-border rounded hover:bg-surface">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-5 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50">
                    {submitting ? 'Saving…' : (editId ? 'Update' : 'Create Coupon')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
