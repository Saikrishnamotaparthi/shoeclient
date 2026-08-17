import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import { checkoutService } from '@/services/checkoutService';
import api from '@/services/api';
import type { CheckoutValidationResult, Address } from '@/types';
import { MapPin, Tag, ShoppingBag, Plus, X, ChevronDown, AlertCircle, Loader2, Truck } from 'lucide-react';

// ─── Inline Address Form ─────────────────────────────────────────────────────
interface AddressFormData {
  fullName: string;
  phone: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const BLANK_FORM: AddressFormData = {
  fullName: '', phone: '', street: '', landmark: '',
  city: '', state: '', pincode: '', isDefault: false,
};

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const inputCls = 'w-full border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-primary';
const labelCls = 'block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1';

interface InlineAddressFormProps {
  onSave: (addr: Address) => void;
  onCancel: () => void;
  saving: boolean;
}

const InlineAddressForm: React.FC<InlineAddressFormProps> = ({ onSave, onCancel, saving }) => {
  type FormErrors = Partial<Record<keyof AddressFormData, string>>;
  const [form, setForm] = useState<AddressFormData>(BLANK_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const set = (field: keyof AddressFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm(prev => ({ ...prev, [field]: val }));
      setErrors(prev => ({ ...prev, [field]: '' }));
    };

  const validate = () => {
    const errs: Partial<Record<keyof AddressFormData, string>> = {};
    if (!form.fullName.trim()) errs.fullName = 'Required';
    if (!/^\d{10}$/.test(form.phone.trim())) errs.phone = 'Enter valid 10-digit mobile number';
    if (!form.street.trim()) errs.street = 'Required';
    if (!form.city.trim()) errs.city = 'Required';
    if (!form.state) errs.state = 'Required';
    if (!/^\d{6}$/.test(form.pincode.trim())) errs.pincode = 'Enter valid 6-digit pincode';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const addr: Address = {
      id: `addr_${Date.now()}`,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      street: form.street.trim(),
      landmark: form.landmark.trim() || undefined,
      city: form.city.trim(),
      state: form.state,
      pincode: form.pincode.trim(),
      isDefault: form.isDefault,
    } as Address;
    onSave(addr);
  };

  return (
    <div className="border border-primary/30 rounded-xl bg-primary/5 p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <MapPin size={15} className="text-primary" /> Add New Address
        </h3>
        <button type="button" onClick={onCancel} className="text-text-muted hover:text-danger transition-colors">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input className={inputCls} value={form.fullName} onChange={set('fullName')} placeholder="As per ID" />
            {errors.fullName && <p className="text-xs text-danger mt-0.5">{errors.fullName}</p>}
          </div>
          <div>
            <label className={labelCls}>Mobile Number *</label>
            <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="10-digit number" maxLength={10} />
            {errors.phone && <p className="text-xs text-danger mt-0.5">{errors.phone}</p>}
          </div>
        </div>

        <div>
          <label className={labelCls}>Street / House No. / Area *</label>
          <textarea
            className={`${inputCls} resize-none`}
            rows={2}
            value={form.street}
            onChange={set('street')}
            placeholder="House no., Building, Street, Area"
          />
          {errors.street && <p className="text-xs text-danger mt-0.5">{errors.street}</p>}
        </div>

        <div>
          <label className={labelCls}>Landmark (optional)</label>
          <input className={inputCls} value={form.landmark} onChange={set('landmark')} placeholder="Near school, temple, etc." />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>City *</label>
            <input className={inputCls} value={form.city} onChange={set('city')} placeholder="City" />
            {errors.city && <p className="text-xs text-danger mt-0.5">{errors.city}</p>}
          </div>
          <div>
            <label className={labelCls}>State *</label>
            <div className="relative">
              <select className={`${inputCls} appearance-none pr-8`} value={form.state} onChange={set('state')}>
                <option value="">Select</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-3 text-text-muted pointer-events-none" />
            </div>
            {errors.state && <p className="text-xs text-danger mt-0.5">{errors.state}</p>}
          </div>
          <div>
            <label className={labelCls}>Pincode *</label>
            <input className={inputCls} value={form.pincode} onChange={set('pincode')} placeholder="6-digit" maxLength={6} />
            {errors.pincode && <p className="text-xs text-danger mt-0.5">{errors.pincode}</p>}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} className="accent-primary w-4 h-4" />
          <span className="text-sm">Set as default address</span>
        </label>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save & Use This Address'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-border text-sm rounded hover:bg-surface transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Checkout Page ────────────────────────────────────────────────────────────
const CheckoutPage: React.FC = () => {
  const { items, couponCode, applyCoupon, removeCoupon } = useCartStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const [validationResult, setValidationResult] = useState<CheckoutValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Load addresses
  useEffect(() => {
    if (!user) return;
    api.get('/addresses').then(res => {
      const addrs: Address[] = res.data || [];
      setAddresses(addrs);
      const def = addrs.find(a => a.isDefault) || addrs[0];
      if (def) setSelectedAddressId(def.id);
      if (addrs.length === 0) setShowAddForm(true);
    }).catch(() => {});
  }, [user]);

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  // Validate cart
  useEffect(() => {
    if (items.length === 0) return;
    let mounted = true;
    const validate = async () => {
      setIsValidating(true);
      setValidationError('');
      try {
        const result = await checkoutService.validateCheckout({
          items: items.map(i => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
          couponCode: couponCode || undefined,
        });
        if (mounted) setValidationResult(result);
      } catch (err: any) {
        if (mounted) {
          setValidationError(err.response?.data?.error || 'Could not validate cart.');
          setValidationResult(null);
        }
      } finally {
        if (mounted) setIsValidating(false);
      }
    };
    validate();
    return () => { mounted = false; };
  }, [items, couponCode]);

  const canProceed = !!selectedAddressId && !!selectedAddress && !isValidating && !validationError && !showAddForm;

  const handleSaveAddress = async (newAddr: Address) => {
    if (!user) return;
    setSavingAddress(true);
    try {
      const res = await api.post('/addresses', newAddr);
      const savedAddr = res.data;
      const updated = [...addresses, savedAddr];
      setAddresses(updated);
      setSelectedAddressId(savedAddr.id);
      setShowAddForm(false);
    } catch {
      setValidationError('Failed to save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError('');
    try {
      const result = await checkoutService.validateCheckout({
        items: items.map(i => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
        couponCode: couponInput.trim().toUpperCase(),
      });
      if (result.couponApplied) {
        applyCoupon(result.couponApplied.code, result.discount);
        setCouponInput('');
      } else {
        setCouponError('Coupon not applied.');
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.error || 'Invalid or expired coupon.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!canProceed || !selectedAddress) return;
    sessionStorage.setItem('checkout_address', JSON.stringify(selectedAddress));
    navigate('/payment');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag size={48} className="mx-auto mb-4 text-border" />
        <h1 className="text-2xl font-display font-semibold mb-3">Your cart is empty</h1>
        <Link to="/shop" className="px-5 py-2.5 bg-primary text-white rounded font-semibold text-sm hover:bg-primary/90 transition-colors inline-block mt-2">
          Browse Products
        </Link>
      </div>
    );
  }

  const displayTotal = validationResult?.total ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-semibold mb-6">Checkout</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {['Delivery Address', 'Payment'].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 text-sm font-medium ${i === 0 ? 'text-primary' : 'text-text-muted'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-primary text-white' : 'bg-surface border border-border'}`}>
                {i + 1}
              </span>
              {s}
            </div>
            {i < 1 && <div className="h-px flex-1 bg-border" />}
          </React.Fragment>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column — Address */}
        <div className="flex-1">
          <div className="bg-white border border-border rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <MapPin size={18} /> Delivery Address
            </h2>

            {addresses.length > 0 && (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                      selectedAddressId === addr.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => { setSelectedAddressId(addr.id); setShowAddForm(false); }}
                      className="mt-1 accent-primary"
                    />
                    <div className="text-sm">
                      <p className="font-semibold">{addr.fullName}
                        {addr.isDefault && <span className="ml-2 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Default</span>}
                      </p>
                      <p className="text-text-muted mt-0.5">+91 {addr.phone}</p>
                      <p className="text-text-muted">{addr.street}{addr.landmark ? `, ${addr.landmark}` : ''}</p>
                      <p className="text-text-muted">{addr.city}, {addr.state} – {addr.pincode}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {addresses.length === 0 && !showAddForm && (
              <p className="text-sm text-text-muted mb-3">No saved addresses yet.</p>
            )}

            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 text-sm text-primary hover:underline mt-3"
              >
                <Plus size={14} /> Add a new address
              </button>
            )}

            {showAddForm && (
              <InlineAddressForm
                onSave={handleSaveAddress}
                onCancel={() => { if (addresses.length > 0) setShowAddForm(false); }}
                saving={savingAddress}
              />
            )}

            {validationError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {validationError}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={handleProceedToPayment}
                disabled={!canProceed}
                className="px-8 py-3 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                Continue to Payment
              </button>
              {showAddForm && addresses.length === 0 && (
                <p className="text-xs text-text-muted mt-2">Please save an address to continue.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column — Order Summary */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white border border-border rounded-xl overflow-hidden sticky top-20">
            <div className="px-5 py-4 border-b border-border relative">
              <h2 className="font-semibold text-base">Order Summary</h2>
              {isValidating && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="divide-y divide-border max-h-60 overflow-y-auto">
              {items.map(item => (
                <div key={`${item.productId}-${item.size}`} className="flex gap-3 px-4 py-3">
                  <div className="w-12 h-12 bg-surface rounded overflow-hidden shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-text-muted">Size {item.size} · Qty {item.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-border">
              {couponCode ? (
                <div className="flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded px-3 py-2">
                  <span className="flex items-center gap-1.5 text-green-700"><Tag size={12} /> {couponCode}</span>
                  <button onClick={() => { removeCoupon(); setCouponInput(''); }} className="text-xs text-green-600 hover:underline">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    className="flex-1 border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                    onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon(); }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponInput.trim()}
                    className="px-3 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isApplyingCoupon ? '…' : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && <p className="text-xs text-danger mt-1">{couponError}</p>}
            </div>

            <div className="px-5 py-4 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Subtotal</span>
                <span>₹{(validationResult?.subtotal ?? 0).toLocaleString('en-IN')}</span>
              </div>
              {(validationResult?.discount ?? 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount {validationResult?.couponApplied?.code && `(${validationResult.couponApplied.code})`}</span>
                  <span>−₹{(validationResult?.discount ?? 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-muted">Shipping</span>
                <span className={validationResult?.shipping === 0 ? 'text-green-600 font-medium' : ''}>
                  {validationResult != null ? (validationResult.shipping === 0 ? 'Free' : `₹${validationResult.shipping}`) : '—'}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t border-border pt-2">
                <span>Total</span>
                <span>₹{displayTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
