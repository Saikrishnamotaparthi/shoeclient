import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Address } from '@/types';
import { MapPin, Plus, Pencil, Trash2, Star, X, CheckCircle } from 'lucide-react';

const emptyAddress = (): Omit<Address, 'id'> => ({
  fullName: '',
  phone: '',
  street: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
});

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const AddressesPage: React.FC = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Address, 'id'>>(emptyAddress());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const loadAddresses = async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, 'users', user.id));
    if (snap.exists()) {
      setAddresses(snap.data().addresses || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadAddresses(); }, [user]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyAddress());
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setEditingId(addr.id);
    const { id, ...rest } = addr;
    setForm(rest);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const snap = await getDoc(doc(db, 'users', user.id));
      const current: Address[] = snap.exists() ? (snap.data().addresses || []) : [];

      let updated: Address[];
      if (editingId) {
        updated = current.map(a => a.id === editingId ? { ...form, id: editingId } : a);
      } else {
        const newAddr: Address = { ...form, id: crypto.randomUUID() };
        if (form.isDefault) {
          updated = [...current.map(a => ({ ...a, isDefault: false })), newAddr];
        } else {
          updated = [...current, newAddr];
        }
      }

      if (form.isDefault) {
        updated = updated.map(a => ({ ...a, isDefault: a.id === (editingId || updated[updated.length - 1].id) }));
      }

      await setDoc(doc(db, 'users', user.id), { addresses: updated }, { merge: true });
      setAddresses(updated);
      setShowForm(false);
      setSuccess(editingId ? 'Address updated!' : 'Address added!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      // no-op
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !window.confirm('Remove this address?')) return;
    const updated = addresses.filter(a => a.id !== id);
    await setDoc(doc(db, 'users', user.id), { addresses: updated }, { merge: true });
    setAddresses(updated);
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    const updated = addresses.map(a => ({ ...a, isDefault: a.id === id }));
    await setDoc(doc(db, 'users', user.id), { addresses: updated }, { merge: true });
    setAddresses(updated);
  };

  const field = (key: keyof Omit<Address, 'id'>, label: string, type = 'text', required = true) => (
    <div>
      <label className="block text-sm font-medium mb-1" htmlFor={`addr-${key}`}>
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        id={`addr-${key}`}
        type={type}
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={required}
        className="w-full border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Addresses</h1>
          <p className="text-text-muted text-sm mt-1">Manage your saved delivery addresses.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Add Address
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4">
          {[1, 2].map(i => <div key={i} className="h-36 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <MapPin size={36} className="mx-auto mb-4 text-border" />
          <p className="font-medium mb-1">No addresses saved</p>
          <p className="text-sm text-text-muted mb-4">Add a delivery address to speed up checkout.</p>
          <button onClick={openAdd} className="px-4 py-2 bg-primary text-white rounded text-sm font-semibold hover:bg-primary/90 transition-colors">
            Add First Address
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {addresses.map(addr => (
            <div
              key={addr.id}
              className={`bg-white border rounded-xl p-5 flex flex-col sm:flex-row gap-4 ${addr.isDefault ? 'border-primary' : 'border-border'}`}
            >
              <div className="flex-1">
                {addr.isDefault && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full mb-2">
                    <Star size={11} /> Default
                  </span>
                )}
                <p className="font-semibold text-sm">{addr.fullName}</p>
                <p className="text-sm text-text-muted mt-0.5">+91 {addr.phone}</p>
                <p className="text-sm text-text-muted mt-1">
                  {addr.street}{addr.landmark ? `, ${addr.landmark}` : ''}
                </p>
                <p className="text-sm text-text-muted">
                  {addr.city}, {addr.state} – {addr.pincode}
                </p>
              </div>
              <div className="flex sm:flex-col gap-2 justify-start sm:justify-between items-start">
                <div className="flex gap-2">
                  <button onClick={() => openEdit(addr)} className="p-2 border border-border rounded hover:border-primary hover:text-primary transition-colors" aria-label="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(addr.id)} className="p-2 border border-border rounded hover:border-danger hover:text-danger transition-colors" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-xs text-text-muted hover:text-primary transition-colors underline"
                  >
                    Set as default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Address Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white">
              <h3 className="font-semibold">{editingId ? 'Edit Address' : 'Add New Address'}</h3>
              <button onClick={() => setShowForm(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field('fullName', 'Full Name')}
                {field('phone', 'Phone Number', 'tel')}
              </div>
              {field('street', 'House No. / Street / Area')}
              {field('landmark', 'Landmark', 'text', false)}
              <div className="grid grid-cols-2 gap-4">
                {field('city', 'City')}
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="addr-state">
                    State <span className="text-danger">*</span>
                  </label>
                  <select
                    id="addr-state"
                    value={form.state}
                    onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    required
                    className="w-full border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {field('pincode', 'PIN Code')}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm">Set as default address</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-border rounded text-sm hover:bg-surface transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-primary text-white rounded text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressesPage;
