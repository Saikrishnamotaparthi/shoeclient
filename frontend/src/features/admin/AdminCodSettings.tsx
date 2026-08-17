import React, { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';
import { Truck, ToggleLeft, ToggleRight, X, Plus, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface CodSettings {
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  blockedPincodes: string[];
}

const DEFAULT: CodSettings = {
  enabled: true,
  minAmount: 0,
  maxAmount: 10000,
  blockedPincodes: [],
};

export const AdminCodSettings: React.FC = () => {
  const [settings, setSettings] = useState<CodSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeError, setPincodeError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/admin/cod-settings')
      .then((r: { data: CodSettings }) => setSettings({ ...DEFAULT, ...r.data }))
      .catch(() => setSettings(DEFAULT))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/cod-settings', settings);
      showToast('success', 'COD settings saved successfully.');
    } catch {
      showToast('error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addPincode = () => {
    const pin = pincodeInput.trim();
    if (!/^\d{6}$/.test(pin)) {
      setPincodeError('Enter a valid 6-digit pincode');
      return;
    }
    if (settings.blockedPincodes.includes(pin)) {
      setPincodeError('Pincode already in the list');
      return;
    }
    setSettings(prev => ({ ...prev, blockedPincodes: [...prev.blockedPincodes, pin] }));
    setPincodeInput('');
    setPincodeError('');
    inputRef.current?.focus();
  };

  const removePincode = (pin: string) => {
    setSettings(prev => ({ ...prev, blockedPincodes: prev.blockedPincodes.filter(p => p !== pin) }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
          <Truck size={22} className="text-primary" /> COD Settings
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Configure Cash on Delivery availability, order limits, and pincode restrictions.
        </p>
      </div>

      {/* Global Toggle */}
      <div className="bg-white border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Enable Cash on Delivery</h2>
            <p className="text-sm text-text-muted mt-0.5">
              Turn off to hide COD option from all customers globally.
            </p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              settings.enabled
                ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                : 'bg-gray-100 text-gray-500 border border-border hover:bg-gray-200'
            }`}
          >
            {settings.enabled ? (
              <><ToggleRight size={20} className="text-green-600" /> COD Enabled</>
            ) : (
              <><ToggleLeft size={20} /> COD Disabled</>
            )}
          </button>
        </div>

        {!settings.enabled && (
          <div className="mt-4 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            COD is disabled. Customers will only see the online payment option.
          </div>
        )}
      </div>

      {/* Amount Limits */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-5">
        <h2 className="font-semibold">Order Amount Limits</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
              Minimum Order Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-text-muted text-sm">₹</span>
              <input
                type="number"
                min={0}
                value={settings.minAmount}
                onChange={e => setSettings(prev => ({ ...prev, minAmount: Number(e.target.value) }))}
                className="w-full border border-border rounded px-7 py-2.5 text-sm focus:outline-none focus:border-primary"
                placeholder="0"
              />
            </div>
            <p className="text-xs text-text-muted mt-1">Set to 0 for no minimum</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
              Maximum Order Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-text-muted text-sm">₹</span>
              <input
                type="number"
                min={0}
                value={settings.maxAmount}
                onChange={e => setSettings(prev => ({ ...prev, maxAmount: Number(e.target.value) }))}
                className="w-full border border-border rounded px-7 py-2.5 text-sm focus:outline-none focus:border-primary"
                placeholder="10000"
              />
            </div>
            <p className="text-xs text-text-muted mt-1">Set to 0 for no maximum</p>
          </div>
        </div>

        <div className="text-xs text-text-muted bg-surface rounded-lg px-3 py-2 border border-border">
          COD will be hidden if the cart total is below ₹{settings.minAmount.toLocaleString('en-IN') || '0'}
          {settings.maxAmount > 0 ? ` or above ₹${settings.maxAmount.toLocaleString('en-IN')}` : ''}.
        </div>
      </div>

      {/* Blocked Pincodes */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Blocked Pincodes</h2>
          <p className="text-sm text-text-muted mt-0.5">
            COD will be unavailable for orders to these pincodes. Shiprocket serviceability is checked in addition to this list.
          </p>
        </div>

        {/* Input */}
        <div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={pincodeInput}
              onChange={e => { setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setPincodeError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPincode(); } }}
              placeholder="Enter 6-digit pincode"
              maxLength={6}
              className="flex-1 border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={addPincode}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          {pincodeError && <p className="text-xs text-danger mt-1">{pincodeError}</p>}
        </div>

        {/* Pincode Tags */}
        {settings.blockedPincodes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {settings.blockedPincodes.map(pin => (
              <span
                key={pin}
                className="flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-sm rounded-full"
              >
                {pin}
                <button
                  type="button"
                  onClick={() => removePincode(pin)}
                  className="hover:text-red-900 transition-colors"
                  aria-label={`Remove pincode ${pin}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted italic">No pincodes blocked. COD available everywhere (subject to Shiprocket serviceability).</p>
        )}

        {settings.blockedPincodes.length > 0 && (
          <p className="text-xs text-text-muted">{settings.blockedPincodes.length} pincode{settings.blockedPincodes.length > 1 ? 's' : ''} blocked</p>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-text-muted">Changes take effect immediately for new checkout sessions.</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Save Settings'}
        </button>
      </div>
    </div>
    </AdminLayout>
  );
};

export default AdminCodSettings;
