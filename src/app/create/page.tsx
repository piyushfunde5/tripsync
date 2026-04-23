'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateSlug } from '@/lib/utils';

const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'AED', symbol: 'د.إ' },
];

function getDefaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString().split('T')[0];
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid var(--ts-line-2)', borderRadius: 12,
  background: 'var(--ts-card)', color: 'var(--ts-ink)',
  fontSize: 14, fontFamily: 'var(--ts-sans)', outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700,
  color: 'var(--ts-ink-2)', letterSpacing: '.06em',
  textTransform: 'uppercase', marginBottom: 6,
};

export default function CreateTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('INR');

  const [form, setForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    rsvpDeadline: getDefaultDeadline(),
    budgetMin: '',
    budgetMax: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      const slug = generateSlug(form.title);

      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          slug,
          destination: form.destination || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          rsvpDeadline: form.rsvpDeadline || null,
          budgetMin: form.budgetMin ? parseInt(form.budgetMin) : null,
          budgetMax: form.budgetMax ? parseInt(form.budgetMax) : null,
          currency,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create trip');
      }

      const { trip } = await res.json();
      router.push(`/t/${trip.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', minHeight: '100vh', background: 'var(--ts-paper)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--ts-line)', background: 'var(--ts-paper)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--ts-line)', background: 'var(--ts-card)', cursor: 'pointer', color: 'var(--ts-ink-2)', flexShrink: 0 }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 18, fontWeight: 500, color: 'var(--ts-ink)' }}>New trip</div>

        <button
          onClick={() => router.push('/dashboard')}
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--ts-ink-2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}
        >
          Cancel
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
        <p style={{ fontSize: 13, color: 'var(--ts-ink-3)', marginTop: -4 }}>Fill in the basics. You can tweak later.</p>

        {/* Trip name */}
        <div>
          <label style={labelStyle}>Trip name <span style={{ color: 'var(--ts-terra)' }}>*</span></label>
          <input
            type="text"
            required
            placeholder="e.g., Goa March 2026"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Destination */}
        <div>
          <label style={labelStyle}>
            Destination <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ts-ink-3)', textTransform: 'none', letterSpacing: 0 }}>optional — can poll later</span>
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>📍</span>
            <input
              type="text"
              placeholder="e.g., Goa"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              style={{ ...inputStyle, paddingLeft: 34 }}
            />
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Start date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>End date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        {/* RSVP Deadline */}
        <div>
          <label style={labelStyle}>
            RSVP deadline <span style={{ color: 'var(--ts-terra)' }}>*</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ts-ink-3)', textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>members must RSVP by</span>
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>🕐</span>
            <input
              type="date"
              required
              value={form.rsvpDeadline}
              onChange={(e) => setForm({ ...form, rsvpDeadline: e.target.value })}
              style={{ ...inputStyle, paddingLeft: 34 }}
            />
          </div>
        </div>

        {/* Budget range */}
        <div>
          <label style={labelStyle}>Budget range <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ts-ink-3)', textTransform: 'none', letterSpacing: 0 }}>(per person)</span></label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              placeholder="Min"
              min={0}
              value={form.budgetMin}
              onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
              style={{ ...inputStyle, flex: 1 }}
            />
            <span style={{ color: 'var(--ts-ink-3)', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>—</span>
            <input
              type="number"
              placeholder="Max"
              min={0}
              value={form.budgetMax}
              onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>

        {/* Currency */}
        <div>
          <label style={labelStyle}>Currency</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setCurrency(c.code)}
                style={{
                  padding: '7px 14px', borderRadius: 999,
                  border: `1.5px solid ${currency === c.code ? 'var(--ts-terra)' : 'var(--ts-line-2)'}`,
                  background: currency === c.code ? 'rgba(217,107,63,.08)' : 'var(--ts-card)',
                  color: currency === c.code ? 'var(--ts-terra-d)' : 'var(--ts-ink-2)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--ts-sans)',
                }}
              >
                {c.code} {c.symbol}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--ts-err-bg)', border: '1px solid rgba(176,69,31,.2)', borderRadius: 12, fontSize: 13, color: 'var(--ts-err)' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !form.title}
          style={{
            width: '100%', padding: '14px', borderRadius: 'var(--ts-r-pill)',
            background: loading || !form.title ? 'var(--ts-sand)' : 'var(--ts-terra)',
            color: loading || !form.title ? 'var(--ts-ink-3)' : 'white',
            border: 'none', fontWeight: 700, fontSize: 15, cursor: loading || !form.title ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--ts-sans)', letterSpacing: '.01em',
            boxShadow: loading || !form.title ? 'none' : '0 6px 20px -4px rgba(217,107,63,.45)',
            transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? 'Creating…' : <>Create trip <span style={{ fontSize: 16 }}>›</span></>}
        </button>
      </form>
    </div>
  );
}
