import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';

export const AdminSettings = () => {
  const [settings, setSettings] = useState({
    freeShippingThreshold: 0,
    flatShippingRate: 0,
    warehousePincode: '',
    warehouseAddress: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/settings')
      .then(res => {
        setSettings({
          freeShippingThreshold: res.data.freeShippingThreshold || 0,
          flatShippingRate: res.data.flatShippingRate || 0,
          warehousePincode: res.data.warehousePincode || '',
          warehouseAddress: res.data.warehouseAddress || '',
        });
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await api.put('/admin/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings. Please try again.');
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
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-semibold">Shipment Settings</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure shipping rates applied at checkout. All product prices are GST-inclusive.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>
        )}
        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
            ✓ Shipment settings saved successfully.
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white border border-border rounded p-6 space-y-6">

          <div>
            <label className="block text-sm font-semibold mb-1">
              Free Shipping Threshold (₹)
            </label>
            <p className="text-xs text-text-muted mb-2">
              Orders above this amount get free shipping. Set to 0 to disable free shipping.
            </p>
            <input
              type="number"
              min="0"
              value={settings.freeShippingThreshold}
              onChange={e => setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. 999"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Flat Shipping Rate (₹)
            </label>
            <p className="text-xs text-text-muted mb-2">
              Charged on orders below the free shipping threshold.
            </p>
            <input
              type="number"
              min="0"
              value={settings.flatShippingRate}
              onChange={e => setSettings({ ...settings, flatShippingRate: Number(e.target.value) })}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. 99"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Warehouse Pincode
            </label>
            <p className="text-xs text-text-muted mb-2">
              Dispatch pincode used for Shiprocket serviceability & courier rate calculations.
            </p>
            <input
              type="text"
              maxLength={6}
              value={settings.warehousePincode}
              onChange={e => setSettings({ ...settings, warehousePincode: e.target.value.replace(/\D/g, '') })}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. 500001"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Warehouse Address
            </label>
            <p className="text-xs text-text-muted mb-2">
              Full pickup address for shipment origin.
            </p>
            <textarea
              rows={3}
              value={settings.warehouseAddress}
              onChange={e => setSettings({ ...settings, warehouseAddress: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="Enter street address, landmark, city, state..."
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
            <strong>Note:</strong> All product prices are GST-inclusive. No additional tax is applied at checkout.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
};
