import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import { checkoutService } from '@/services/checkoutService';
import { orderService } from '@/services/orderService';
import type { CheckoutValidationResult, Address } from '@/types';
import {
  ArrowLeft, Lock, Shield, CreditCard, Smartphone, Landmark, Wallet,
  Truck, CheckCircle, AlertCircle, Loader2, ChevronDown, Tag, ShoppingBag,
  QrCode, Copy, ExternalLink,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const inputCls = 'w-full border border-border rounded-lg px-3.5 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors bg-white';
const labelCls = 'block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5';

const BANKS = [
  { code: 'HDFC', name: 'HDFC Bank', color: '#004B8D' },
  { code: 'ICIC', name: 'ICICI Bank', color: '#F37A20' },
  { code: 'SBIN', name: 'State Bank of India', color: '#1C4587' },
  { code: 'UTIB', name: 'Axis Bank', color: '#97144D' },
  { code: 'KKBK', name: 'Kotak Mahindra', color: '#ED1C24' },
  { code: 'IDFB', name: 'IDFC First Bank', color: '#00ADEF' },
  { code: 'YESB', name: 'Yes Bank', color: '#003DA5' },
  { code: 'PUNB', name: 'Punjab National', color: '#003DA5' },
  { code: 'BARB', name: 'Bank of Baroda', color: '#00A650' },
  { code: 'CNRB', name: 'Canara Bank', color: '#003DA5' },
];

const WALLETS = [
  { code: 'payzapp', name: 'PayZapp', color: '#00BFFF' },
  { code: 'olamoney', name: 'Ola Money', color: '#000000' },
  { code: 'jiomoney', name: 'JioMoney', color: '#0A3D91' },
  { code: 'freecharge', name: 'Freecharge', color: '#2E7D32' },
  { code: 'mobikwik', name: 'MobiKwik', color: '#FF6B00' },
  { code: 'airtelmoney', name: 'Airtel Money', color: '#ED1C24' },
];

type PaymentCategory = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'COD';

// ─── Component ────────────────────────────────────────────────────────────────
const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, couponCode, clearCart } = useCartStore();
  const { user } = useAuth();

  // Data
  const [validationResult, setValidationResult] = useState<CheckoutValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [address, setAddress] = useState<Address | null>(null);
  const [availableMethods, setAvailableMethods] = useState<any>(null);

  // Payment state
  const [selectedCategory, setSelectedCategory] = useState<PaymentCategory>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'processing' | 'success' | 'error'>('select');

  // UPI state
  const [upiVpa, setUpiVpa] = useState('');
  const [upiMode, setUpiMode] = useState<'collect' | 'intent' | 'qr'>('collect');

  // Card state
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Netbanking state
  const [selectedBank, setSelectedBank] = useState('');

  // Wallet state
  const [selectedWallet, setSelectedWallet] = useState('');

  // COD state
  const [codAvailable, setCodAvailable] = useState<boolean | null>(null);
  const [codChecking, setCodChecking] = useState(false);
  const [codReason, setCodReason] = useState('');

  // Refs
  const razorpayRef = useRef<any>(null);
  const paymentInitiatedRef = useRef(false);
  const paymentVerifiedRef = useRef(false);

  // Detect mobile
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ─── Load address and validate ──────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem('checkout_address');
    if (!stored) { navigate('/checkout'); return; }
    try { setAddress(JSON.parse(stored)); } catch { navigate('/checkout'); return; }
    if (items.length === 0) { navigate('/cart'); return; }

    const validate = async () => {
      setIsValidating(true);
      try {
        const result = await checkoutService.validateCheckout({
          items: items.map(i => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
          couponCode: couponCode || undefined,
        });
        setValidationResult(result);
      } catch {
        setPaymentError('Could not validate your order. Please go back and try again.');
      } finally {
        setIsValidating(false);
      }
    };
    validate();
  }, [items, couponCode, navigate]);

  // ─── Load Razorpay SDK and fetch available methods ──────────────────────────
  useEffect(() => {
    const loadSdk = async () => {
      if ((window as any).Razorpay) return;
      return new Promise<void>((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/razorpay.js';
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
      });
    };

    const fetchMethods = async () => {
      await loadSdk();
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay || !validationResult) return;

      try {
        const rzp = new Razorpay({ key: import.meta.env.VITE_RAZORPAY_KEY_ID || '' });
        razorpayRef.current = rzp;

        rzp.once('ready', (response: any) => {
          setAvailableMethods(response.methods);
        });

        // Fallback if ready doesn't fire in 5s
        setTimeout(() => {
          if (!availableMethods) {
            setAvailableMethods({ card: true, upi: true, netbanking: true, wallet: true });
          }
        }, 5000);
      } catch {
        setAvailableMethods({ card: true, upi: true, netbanking: true, wallet: true });
      }
    };

    if (validationResult) fetchMethods();
  }, [validationResult]);

  // ─── Check COD availability ────────────────────────────────────────────────
  useEffect(() => {
    if (!address || !validationResult) return;
    const check = async () => {
      setCodChecking(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checkout/cod-check?pincode=${encodeURIComponent(address.pincode)}&amount=${validationResult.total}`);
        const data = await res.json();
        setCodAvailable(data.available);
        setCodReason(data.reason || '');
      } catch {
        setCodAvailable(false);
      } finally {
        setCodChecking(false);
      }
    };
    check();
  }, [address?.pincode, validationResult?.total]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + ' / ' + digits.slice(2);
    return digits;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ─── Payment Handler ────────────────────────────────────────────────────────
  const handlePayment = async () => {
    if (isProcessing || paymentInitiatedRef.current || !address || !validationResult) return;
    paymentInitiatedRef.current = true;
    paymentVerifiedRef.current = false;
    setPaymentError('');
    setIsProcessing(true);
    setPaymentStep('processing');

    try {
      // 1. Load SDK
      await new Promise<void>((resolve) => {
        if ((window as any).Razorpay) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/razorpay.js';
        s.onload = () => resolve();
        s.onerror = () => { setPaymentError('Payment SDK failed to load.'); resolve(); };
        document.head.appendChild(s);
      });

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        setPaymentError('Payment system unavailable. Please try again.');
        setIsProcessing(false);
        paymentInitiatedRef.current = false;
        setPaymentStep('error');
        return;
      }

      // 2. Create order on server
      const orderResponse = await orderService.createOrder({
        items: items.map(i => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
        shippingAddress: address,
        couponCode: couponCode || undefined,
        paymentMethod: selectedCategory === 'COD' ? 'COD' : 'RAZORPAY',
      } as any);

      // 3. Handle COD
      if (selectedCategory === 'COD') {
        setPaymentSuccess(true);
        setPaymentStep('success');
        setTimeout(() => {
          sessionStorage.removeItem('checkout_address');
          navigate(`/order-confirmation/${orderResponse.orderId}`);
          setTimeout(() => clearCart(), 100);
        }, 2000);
        return;
      }

      // 4. Instantiate Razorpay Custom Checkout
      const rzp = new Razorpay({
        key: orderResponse.key,
        image: '/logo.png',
        redirect: false,
      });

      // 5. Build method-specific payment data
      const baseData: any = {
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        email: user?.email || '',
        contact: `+91${address.phone}`,
        order_id: orderResponse.razorpayOrderId,
        description: `SoleVault Order #${orderResponse.orderId.slice(-8).toUpperCase()}`,
        notes: { order_id: orderResponse.orderId },
      };

      let paymentData: any;

      switch (selectedCategory) {
        case 'UPI':
          if (upiMode === 'intent') {
            paymentData = { ...baseData, method: 'upi', upi: { flow: 'intent' } };
          } else if (upiMode === 'qr') {
            paymentData = { ...baseData, method: 'upi', upi: { flow: 'qr' } };
          } else {
            if (!upiVpa.trim()) {
              setPaymentError('Please enter your UPI ID (e.g. name@upi).');
              setIsProcessing(false);
              paymentInitiatedRef.current = false;
              setPaymentStep('select');
              return;
            }
            paymentData = { ...baseData, method: 'upi', upi: { vpa: upiVpa.trim(), flow: 'collect' } };
          }
          break;

        case 'CARD': {
          const digits = cardNumber.replace(/\s/g, '');
          const parts = cardExpiry.replace(/\s/g, '').split('/');
          const expMonth = (parts[0] || '').replace(/\D/g, '');
          const expYear = (parts[1] || '').replace(/\D/g, '');
          if (!cardName.trim() || digits.length < 13 || !expMonth || !expYear || cardCvv.length < 3) {
            setPaymentError('Please fill in all card details correctly.');
            setIsProcessing(false);
            paymentInitiatedRef.current = false;
            setPaymentStep('select');
            return;
          }
          paymentData = {
            ...baseData, method: 'card',
            'card[name]': cardName.trim(),
            'card[number]': digits,
            'card[cvv]': cardCvv,
            'card[expiry_month]': expMonth,
            'card[expiry_year]': expYear,
          };
          break;
        }

        case 'NETBANKING':
          if (!selectedBank) {
            setPaymentError('Please select a bank.');
            setIsProcessing(false);
            paymentInitiatedRef.current = false;
            setPaymentStep('select');
            return;
          }
          paymentData = { ...baseData, method: 'netbanking', bank: selectedBank };
          break;

        case 'WALLET':
          if (!selectedWallet) {
            setPaymentError('Please select a wallet.');
            setIsProcessing(false);
            paymentInitiatedRef.current = false;
            setPaymentStep('select');
            return;
          }
          paymentData = { ...baseData, method: 'wallet', wallet: selectedWallet };
          break;

        default:
          setPaymentError('Please select a payment method.');
          setIsProcessing(false);
          paymentInitiatedRef.current = false;
          setPaymentStep('select');
          return;
      }

      // 6. Set up event handlers
      rzp.on('payment.success', async (resp: any) => {
        if (paymentVerifiedRef.current) return;
        paymentVerifiedRef.current = true;

        try {
          await orderService.verifyPayment({
            orderId: orderResponse.orderId,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpayOrderId: resp.razorpay_order_id,
            razorpaySignature: resp.razorpay_signature,
          });
          setPaymentSuccess(true);
          setPaymentStep('success');
          setTimeout(() => {
            sessionStorage.removeItem('checkout_address');
            navigate(`/order-confirmation/${orderResponse.orderId}`);
            setTimeout(() => clearCart(), 100);
          }, 2000);
        } catch {
          setPaymentError('Payment verified but confirmation failed. Contact support with ID: ' + resp.razorpay_payment_id);
          setPaymentStep('error');
          paymentVerifiedRef.current = false;
        } finally {
          setIsProcessing(false);
        }
      });

      rzp.on('payment.error', (resp: any) => {
        const errDesc = resp.error?.description || 'Payment failed. Please try again.';
        const errCode = resp.error?.code || '';

        if (errCode === 'BAD_REQUEST_ERROR') {
          setPaymentError(errDesc);
        } else if (resp.error?.source === 'bank' || resp.error?.step === 'payment_authentication') {
          setPaymentError('Payment was declined by your bank. Please try again or use a different method.');
        } else {
          setPaymentError(errDesc);
        }
        setPaymentStep('error');
        setIsProcessing(false);
        paymentInitiatedRef.current = false;
      });

      rzp.on('payment.cancel', () => {
        setPaymentError('');
        setPaymentStep('select');
        setIsProcessing(false);
        paymentInitiatedRef.current = false;
      });

      // 7. Submit payment
      rzp.createPayment(paymentData);

    } catch (err: any) {
      setPaymentError(err.response?.data?.error || err.message || 'Payment failed. Please try again.');
      setPaymentStep('error');
      setIsProcessing(false);
      paymentInitiatedRef.current = false;
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (isValidating || !address || !validationResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-text-muted">Preparing payment...</p>
        </div>
      </div>
    );
  }

  // ─── Success state ──────────────────────────────────────────────────────────
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-display font-semibold mb-2">Payment Successful!</h2>
          <p className="text-text-muted mb-4">Your order has been placed successfully.</p>
          <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
            <Loader2 size={14} className="animate-spin" />
            Redirecting to order confirmation...
          </div>
        </div>
      </div>
    );
  }

  const displayTotal = validationResult.total;

  // ─── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/checkout')} className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors">
            <ChevronDown size={16} className="rotate-90" />
            <span>Back to Checkout</span>
          </button>
          <Link to="/" className="font-display font-bold text-lg">SoleVault</Link>
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Lock size={12} />
            <span>Secure Payment</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {['Address', 'Payment', 'Confirmation'].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 text-sm ${i <= 1 ? 'font-medium' : 'text-text-muted'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < 1 ? 'bg-green-500 text-white' : i === 1 ? 'bg-primary text-white' : 'bg-surface border border-border'
                }`}>
                  {i < 1 ? '✓' : i + 1}
                </span>
                <span className={i === 1 ? 'text-primary' : ''}>{s}</span>
              </div>
              {i < 2 && <div className={`w-12 h-px ${i < 1 ? 'bg-green-500' : 'bg-border'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left: Payment Methods ── */}
          <div className="flex-1 space-y-4">

            {/* UPI Section */}
            <div className={`bg-white rounded-xl border-2 transition-all ${selectedCategory === 'UPI' ? 'border-primary shadow-sm' : 'border-border'}`}>
              <button onClick={() => { setSelectedCategory('UPI'); setPaymentError(''); }} className="w-full p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                    <Smartphone size={22} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">UPI</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Recommended</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">Google Pay, PhonePe, Paytm, BHIM</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedCategory === 'UPI' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                  {selectedCategory === 'UPI' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>

              {selectedCategory === 'UPI' && (
                <div className="px-5 pb-5 border-t border-border/50 pt-4 space-y-4 animate-fade-in">
                  {/* UPI Mode Toggle */}
                  <div className="flex gap-2">
                    <button onClick={() => { setUpiMode('collect'); setPaymentError(''); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${upiMode === 'collect' ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}>
                      Enter UPI ID
                    </button>
                    <button onClick={() => { setUpiMode('qr'); setPaymentError(''); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${upiMode === 'qr' ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}>
                      {isMobile ? 'UPI App' : 'Scan QR'}
                    </button>
                  </div>

                  {upiMode === 'collect' ? (
                    <div>
                      <label className={labelCls}>UPI ID</label>
                      <input type="text" className={inputCls} placeholder="yourname@upi" value={upiVpa}
                        onChange={e => setUpiVpa(e.target.value)} autoComplete="off" />
                      <p className="text-[11px] text-text-muted mt-2">Enter the UPI ID linked to your payment app</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      {isMobile ? (
                        <>
                          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Smartphone size={28} className="text-emerald-600" />
                          </div>
                          <p className="text-sm font-medium mb-1">Pay via UPI App</p>
                          <p className="text-xs text-text-muted">You'll be redirected to your UPI app to complete payment</p>
                        </>
                      ) : (
                        <>
                          <div className="w-48 h-48 bg-white border-2 border-border rounded-xl flex items-center justify-center mx-auto mb-3">
                            <div className="text-center">
                              <QrCode size={48} className="text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-text-muted">QR code will appear</p>
                              <p className="text-xs text-text-muted">after clicking Pay</p>
                            </div>
                          </div>
                          <p className="text-sm font-medium mb-1">Scan & Pay</p>
                          <p className="text-xs text-text-muted">Open any UPI app and scan the QR code to pay</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card Section */}
            <div className={`bg-white rounded-xl border-2 transition-all ${selectedCategory === 'CARD' ? 'border-primary shadow-sm' : 'border-border'}`}>
              <button onClick={() => { setSelectedCategory('CARD'); setPaymentError(''); }} className="w-full p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                    <CreditCard size={22} />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-sm">Credit & Debit Cards</span>
                    <p className="text-xs text-text-muted mt-0.5">Visa, Mastercard, RuPay, Maestro</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedCategory === 'CARD' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                  {selectedCategory === 'CARD' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>

              {selectedCategory === 'CARD' && (
                <div className="px-5 pb-5 border-t border-border/50 pt-4 space-y-4 animate-fade-in">
                  <div>
                    <label className={labelCls}>Cardholder Name</label>
                    <input type="text" className={inputCls} placeholder="Name on card" value={cardName} onChange={e => setCardName(e.target.value)} autoComplete="cc-name" />
                  </div>
                  <div>
                    <label className={labelCls}>Card Number</label>
                    <div className="relative">
                      <input type="text" className={inputCls} placeholder="1234  5678  9012  3456" value={cardNumber}
                        onChange={e => setCardNumber(formatCardNumber(e.target.value))} maxLength={19} autoComplete="cc-number" inputMode="numeric" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">VISA</span>
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">MC</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Expiry Date</label>
                      <input type="text" className={inputCls} placeholder="MM / YY" value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))} maxLength={7} autoComplete="cc-exp" inputMode="numeric" />
                    </div>
                    <div>
                      <label className={labelCls}>CVV</label>
                      <input type="password" className={inputCls} placeholder="•••" value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} autoComplete="cc-csc" inputMode="numeric" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted bg-blue-50 rounded-lg px-3 py-2">
                    <Lock size={12} className="text-blue-600" />
                    <span>Your card details are secured with PCI-DSS compliant encryption</span>
                  </div>
                </div>
              )}
            </div>

            {/* Net Banking Section */}
            <div className={`bg-white rounded-xl border-2 transition-all ${selectedCategory === 'NETBANKING' ? 'border-primary shadow-sm' : 'border-border'}`}>
              <button onClick={() => { setSelectedCategory('NETBANKING'); setPaymentError(''); }} className="w-full p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
                    <Landmark size={22} />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-sm">Net Banking</span>
                    <p className="text-xs text-text-muted mt-0.5">All major Indian banks supported</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedCategory === 'NETBANKING' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                  {selectedCategory === 'NETBANKING' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>

              {selectedCategory === 'NETBANKING' && (
                <div className="px-5 pb-5 border-t border-border/50 pt-4 animate-fade-in">
                  <label className={labelCls}>Select Your Bank</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BANKS.map(b => (
                      <button key={b.code} type="button" onClick={() => { setSelectedBank(b.code); setPaymentError(''); }}
                        className={`p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                          selectedBank === b.code ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-300'
                        }`}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: b.color }}>
                          {b.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </div>
                        <span className="text-xs font-medium truncate">{b.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Wallet Section */}
            <div className={`bg-white rounded-xl border-2 transition-all ${selectedCategory === 'WALLET' ? 'border-primary shadow-sm' : 'border-border'}`}>
              <button onClick={() => { setSelectedCategory('WALLET'); setPaymentError(''); }} className="w-full p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
                    <Wallet size={22} />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-sm">Wallets & Pay Later</span>
                    <p className="text-xs text-text-muted mt-0.5">Paytm, Mobikwik, Airtel Money, LazyPay</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedCategory === 'WALLET' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                  {selectedCategory === 'WALLET' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>

              {selectedCategory === 'WALLET' && (
                <div className="px-5 pb-5 border-t border-border/50 pt-4 animate-fade-in">
                  <label className={labelCls}>Select Wallet</label>
                  <div className="grid grid-cols-3 gap-2">
                    {WALLETS.map(w => (
                      <button key={w.code} type="button" onClick={() => { setSelectedWallet(w.code); setPaymentError(''); }}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          selectedWallet === w.code ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-300'
                        }`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold mx-auto mb-1.5" style={{ backgroundColor: w.color }}>
                          {w.name[0]}
                        </div>
                        <span className="text-[11px] font-medium">{w.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-gray-50 px-4 text-text-muted font-medium tracking-wider">Or pay later</span></div>
            </div>

            {/* COD Section */}
            <div className={`bg-white rounded-xl border-2 transition-all ${
              codChecking || codAvailable === false ? 'border-border opacity-60' : selectedCategory === 'COD' ? 'border-primary shadow-sm' : 'border-border'
            }`}>
              <button onClick={() => { if (!codChecking && codAvailable !== false) { setSelectedCategory('COD'); setPaymentError(''); } }}
                disabled={codChecking || codAvailable === false} className="w-full p-5 flex items-center justify-between disabled:cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${codAvailable === false ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-green-50 border-green-100 text-green-600'}`}>
                    <Truck size={22} />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-sm">Cash on Delivery</span>
                    <p className="text-xs text-text-muted mt-0.5">Pay when your order arrives</p>
                    <div className="mt-1.5">
                      {codChecking && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Loader2 size={10} className="animate-spin" /> Checking availability...
                        </span>
                      )}
                      {!codChecking && codAvailable === true && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle size={10} /> Available for {address.pincode}
                        </span>
                      )}
                      {!codChecking && codAvailable === false && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                          <AlertCircle size={10} /> {codReason || 'Not available'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedCategory === 'COD' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                  {selectedCategory === 'COD' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:w-80 shrink-0">
            <div className="bg-white rounded-xl border border-border sticky top-20 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-border bg-gray-50">
                <h3 className="font-semibold text-sm">Order Summary</h3>
              </div>

              {/* Items */}
              <div className="divide-y divide-border max-h-48 overflow-y-auto">
                {items.map(item => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-3 px-4 py-3">
                    <div className="w-10 h-10 bg-surface rounded overflow-hidden shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[11px] text-text-muted">Size {item.size} · Qty {item.quantity}</p>
                    </div>
                    <span className="text-xs font-semibold shrink-0">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="px-5 py-4 border-t border-border space-y-2 text-sm">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Subtotal</span>
                  <span>₹{(validationResult.subtotal ?? 0).toLocaleString('en-IN')}</span>
                </div>
                {(validationResult.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Discount</span>
                    <span>−₹{(validationResult.discount ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Shipping</span>
                  <span className={validationResult.shipping === 0 ? 'text-green-600 font-medium' : ''}>
                    {validationResult.shipping === 0 ? 'Free' : `₹${validationResult.shipping}`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-3 mt-2">
                  <span>Total</span>
                  <span>₹{displayTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Error */}
              {paymentError && (
                <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {paymentError}
                </div>
              )}

              {/* Delivery info */}
              <div className="px-4 pb-3">
                <div className="flex items-start gap-2 text-xs text-text-muted bg-gray-50 rounded-lg px-3 py-2">
                  <Truck size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-text">Delivering to {address.fullName}</p>
                    <p>{address.street}, {address.city}, {address.state} – {address.pincode}</p>
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              <div className="px-4 pb-4">
                <button onClick={handlePayment} disabled={isProcessing}
                  className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md">
                  {isProcessing ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing...</>
                  ) : selectedCategory === 'COD' ? (
                    <><Truck size={16} /> Place Order · ₹{displayTotal.toLocaleString('en-IN')}</>
                  ) : (
                    <><Lock size={16} /> Pay ₹{displayTotal.toLocaleString('en-IN')}</>
                  )}
                </button>

                <div className="flex items-center justify-center gap-3 mt-3 text-[11px] text-text-muted">
                  <span className="flex items-center gap-1"><Lock size={10} /> SSL Encrypted</span>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1"><Shield size={10} /> Razorpay</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
