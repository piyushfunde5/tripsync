'use client';

import { createClient } from '@/lib/supabase/client';

const features = [
  { emoji: '✋', title: 'RSVP', desc: "See who's in." },
  { emoji: '🗳️', title: 'Polls', desc: 'Decide together.' },
  { emoji: '📍', title: 'Itinerary', desc: 'Day-by-day plan.' },
  { emoji: '✅', title: 'Tasks', desc: 'Who packs what.' },
  { emoji: '💸', title: 'Expenses', desc: 'Split, settle up.' },
  { emoji: '📄', title: 'Documents', desc: 'Tickets, offline.' },
];

const steps = [
  { n: '01', t: 'Create a trip', d: 'Name, dates, RSVP deadline.' },
  { n: '02', t: 'Share the link', d: 'WhatsApp it to your crew.' },
  { n: '03', t: 'Plan together', d: 'Polls, itinerary, tasks, splits.' },
];

function GoogleSignInButton() {
  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard` },
    });
  };

  return (
    <button
      onClick={handleSignIn}
      style={{
        width: '100%',
        height: 52,
        borderRadius: 12,
        background: 'white',
        border: '1.5px solid var(--ts-line-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontWeight: 600,
        fontSize: 15,
        color: '#3c4043',
        cursor: 'pointer',
        fontFamily: 'var(--ts-sans)',
        boxShadow: 'var(--ts-shadow-sm)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.8-6.8C35.6 2.6 30.1 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.9 6.1C12.3 13.7 17.7 9.5 24 9.5z"/>
        <path fill="#34A853" d="M46.6 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.5 3-2.2 5.5-4.8 7.2l7.5 5.8c4.4-4 7.2-10 7.2-17.3z"/>
        <path fill="#4A90E2" d="M10.4 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.5 10.7l7.9-6.1z"/>
        <path fill="#FBBC05" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.2-8.4 2.2-6.3 0-11.7-4.2-13.6-10l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
      </svg>
      Continue with Google
    </button>
  );
}

function BoardingPassHero() {
  return (
    <div
      className="ts-float"
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #fffaf0, #fbecd3)',
        borderRadius: 16,
        padding: '18px 20px',
        boxShadow: 'var(--ts-shadow-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Perforated tear line */}
      <div style={{ position: 'absolute', left: '64%', top: -6, bottom: -6, width: 2, background: 'repeating-linear-gradient(to bottom, var(--ts-ink) 0 3px, transparent 3px 8px)', opacity: .2 }}/>
      <div style={{ position: 'absolute', left: 'calc(64% - 11px)', top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', background: 'var(--ts-paper)' }}/>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 600, fontSize: 11, letterSpacing: '.05em', color: 'var(--ts-terra)' }}>TRIPSYNC · BOARDING</div>
          <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--ts-ink-2)', marginTop: 2 }}>6 · Friends</div>
        </div>
        <div style={{ fontSize: 9, letterSpacing: '.2em', color: 'var(--ts-ink-2)' }}>No. 2026-0412</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, width: '62%' }}>
        <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 30, fontWeight: 500, letterSpacing: '-.02em', color: 'var(--ts-ink)' }}>BLR</div>
        <svg width="38" height="16" viewBox="0 0 44 20" style={{ color: 'var(--ts-terra)', flexShrink: 0 }}>
          <path d="M2 10 L38 10 M34 6 L40 10 L34 14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M22 4 L26 10 L22 16 L24 10 Z" fill="currentColor"/>
        </svg>
        <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 30, fontWeight: 500, letterSpacing: '-.02em', color: 'var(--ts-ink)' }}>GOA</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, letterSpacing: '.14em', color: 'var(--ts-ink-2)', textTransform: 'uppercase', marginBottom: 14, width: '60%' }}>
        <span>Bengaluru</span><span>Goa</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, width: '58%' }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '.12em', color: 'var(--ts-ink-2)', textTransform: 'uppercase' }}>Depart</div>
          <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 13, fontWeight: 500, color: 'var(--ts-ink)' }}>12 Apr</div>
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '.12em', color: 'var(--ts-ink-2)', textTransform: 'uppercase' }}>Return</div>
          <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 13, fontWeight: 500, color: 'var(--ts-ink)' }}>17 Apr</div>
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '.12em', color: 'var(--ts-ink-2)', textTransform: 'uppercase' }}>Nights</div>
          <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 13, fontWeight: 500, color: 'var(--ts-ink)' }}>5</div>
        </div>
      </div>

      {/* Right stub */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '36%', padding: '16px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ border: '1.5px dashed var(--ts-teal)', color: 'var(--ts-teal)', padding: '4px 8px', borderRadius: 5, fontSize: 9, letterSpacing: '.2em', fontWeight: 600, transform: 'rotate(-6deg)' }}>CONFIRMED</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, letterSpacing: '.12em', color: 'var(--ts-ink-2)', textTransform: 'uppercase', marginBottom: 6 }}>Crew</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {['#d96b3f', '#0f5257', '#f2b04a', '#4a8e92'].map((c, i) => (
              <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '2px solid #fbecd3', marginLeft: i === 0 ? 0 : -6 }}/>
            ))}
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ts-sand)', border: '2px solid #fbecd3', marginLeft: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'var(--ts-ink-2)' }}>+2</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', minHeight: '100vh', background: 'linear-gradient(180deg, var(--ts-paper) 0%, var(--ts-paper-2) 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <div style={{ padding: '10px 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 600, fontSize: 22, letterSpacing: '-.02em', color: 'var(--ts-ink)' }}>
          Trip<span style={{ color: 'var(--ts-terra)' }}>Sync</span>
        </div>
        <a
          href="#join"
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--ts-ink-2)', textDecoration: 'none' }}
        >
          Sign in
        </a>
      </div>

      {/* Hero */}
      <div style={{ padding: '16px 22px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.18em', color: 'var(--ts-terra-d)', fontWeight: 600, marginBottom: 14 }}>
          <span style={{ width: 20, height: 1, background: 'var(--ts-terra-d)', display: 'block' }}/> Plan together · go somewhere
        </div>
        <h1 style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 44, lineHeight: .98, letterSpacing: '-.025em', margin: '0 0 14px', color: 'var(--ts-ink)' }}>
          The group trip,<br/>finally <em style={{ fontStyle: 'italic', color: 'var(--ts-terra)', fontWeight: 400 }}>sorted</em>.
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ts-ink-2)', margin: '0 0 20px' }}>
          Polls, itinerary, tasks and splits — in one warm little place your group will actually open.
        </p>
      </div>

      {/* Boarding pass hero */}
      <div style={{ padding: '0 22px 20px' }}>
        <BoardingPassHero />
      </div>

      {/* Sign in CTA */}
      <div id="join" style={{ padding: '0 22px 14px' }}>
        <GoogleSignInButton />
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ts-ink-3)', marginTop: 10 }}>
          No app install needed · Free forever
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: '20px 22px 6px' }}>
        <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 20, fontWeight: 500, marginBottom: 14, color: 'var(--ts-ink)' }}>How it works</div>
        {steps.map((s, i) => (
          <div key={s.n} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < steps.length - 1 ? '1px dashed var(--ts-line-2)' : 'none' }}>
            <div style={{ fontFamily: 'var(--ts-serif)', fontStyle: 'italic', fontSize: 30, color: 'var(--ts-terra)', width: 44, flexShrink: 0 }}>{s.n}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ts-ink)', marginBottom: 2 }}>{s.t}</div>
              <div style={{ fontSize: 13, color: 'var(--ts-ink-2)' }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{ padding: '24px 22px 8px' }}>
        <div style={{ fontFamily: 'var(--ts-serif)', fontSize: 20, fontWeight: 500, marginBottom: 14, color: 'var(--ts-ink)' }}>Everything in one place</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: 'var(--ts-card)', border: '1px solid var(--ts-line)', borderRadius: 14, padding: 14, boxShadow: 'var(--ts-shadow-sm)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--ts-card-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, fontSize: 18 }}>{f.emoji}</div>
              <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 15, color: 'var(--ts-ink)' }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ts-ink-2)', marginTop: 2 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '28px 22px 40px', textAlign: 'center' }}>
        <div style={{ color: 'var(--ts-sun)', fontSize: 16, marginBottom: 4 }}>★★★★★</div>
        <div style={{ fontSize: 12, color: 'var(--ts-ink-2)' }}>Loved by thousands of travel crews</div>
        <div style={{ fontSize: 11, color: 'var(--ts-ink-3)', marginTop: 20 }}>© TripSync 2026 · Made warm ☀</div>
      </div>
    </div>
  );
}
