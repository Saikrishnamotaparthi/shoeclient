import React, { useState } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Mail, Phone, Clock, MapPin, Send, CheckCircle } from 'lucide-react';
import api from '@/services/api';

const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post('/contact', form);
      setSent(true);
    } catch {
      setError('Failed to send message. Please email us directly at support@solevault.in');
    } finally {
      setSending(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium mb-1.5" htmlFor={`contact-${key}`}>
        {label} <span className="text-danger">*</span>
      </label>
      <input
        id={`contact-${key}`}
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required
        className="w-full border border-border rounded px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
      />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Breadcrumb items={[{ label: 'Contact Us' }]} />

      <div className="text-center mb-10 mt-6">
        <h1 className="text-3xl font-display font-semibold mb-3">Get in Touch</h1>
        <p className="text-text-muted">We're here to help. Reach out and we'll respond within 24 hours.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Contact info */}
        <div className="space-y-4">
          {[
            { icon: Mail, label: 'Email', value: 'support@solevault.in', href: 'mailto:support@solevault.in' },
            { icon: Phone, label: 'Phone', value: '+91 98765 43210', href: 'tel:+919876543210' },
            { icon: Clock, label: 'Support Hours', value: 'Mon–Sat, 9AM–7PM IST', href: null },
            { icon: MapPin, label: 'Address', value: 'SoleVault HQ, Mumbai, Maharashtra', href: null },
          ].map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex items-start gap-4 bg-white border border-border rounded-xl p-5">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Icon size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-0.5">{label}</p>
                {href ? (
                  <a href={href} className="text-sm font-medium hover:text-primary transition-colors">{value}</a>
                ) : (
                  <p className="text-sm font-medium">{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Contact form */}
        <div className="md:col-span-2 bg-white border border-border rounded-xl p-6">
          {sent ? (
            <div className="text-center py-10">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
              <p className="text-text-muted">We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {field('name', 'Full Name')}
                {field('email', 'Email Address', 'email')}
              </div>
              {field('subject', 'Subject')}
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="contact-message">
                  Message <span className="text-danger">*</span>
                </label>
                <textarea
                  id="contact-message"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  required
                  rows={5}
                  placeholder="Tell us how we can help…"
                  className="w-full border border-border rounded px-4 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send size={16} />
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
