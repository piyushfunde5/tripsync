import Link from 'next/link';

const features = [
  {
    icon: '✋',
    title: 'Get everyone committed',
    description: 'Share a link. Members RSVP with one tap. Track who\'s in, who\'s out, who\'s ghosting.',
  },
  {
    icon: '🗳️',
    title: 'Decide together, fast',
    description: 'Polls, decisions, tasks, itinerary — no more scrolling through 200 WhatsApp messages.',
  },
  {
    icon: '💸',
    title: 'Split expenses fairly',
    description: 'Quick split or group fund. Everyone sees who owes what. Settle up after the trip.',
  },
];

const steps = [
  { num: '1', title: 'Create a trip', desc: 'Set a name, dates, and RSVP deadline.' },
  { num: '2', title: 'Share the link', desc: 'Send it on WhatsApp. No app install needed.' },
  { num: '3', title: 'Plan together', desc: 'Vote, assign tasks, split costs — all in one place.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span className="text-xl font-bold text-primary">TripSync</span>
        <Link
          href="/create"
          className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
        >
          Create a Trip
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="px-4 pt-16 pb-12 text-center max-w-2xl mx-auto">
          <p className="text-sm font-medium text-primary/80 mb-3 tracking-wide uppercase">Free. No app install.</p>
          <h1 className="text-3xl md:text-5xl font-bold text-neutral-900 leading-tight mb-4">
            Plan group trips<br />without the chaos.
          </h1>
          <p className="text-lg text-neutral-500 mb-8 max-w-md mx-auto">
            One link. Everyone on the same page. RSVPs, polls, expenses, itinerary — sorted.
          </p>
          <Link
            href="/create"
            className="inline-block px-8 py-3.5 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
          >
            Create a Trip (Free)
          </Link>
        </section>

        {/* Features */}
        <section className="px-4 pb-16 max-w-3xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm border border-neutral-100">
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="text-base font-semibold text-neutral-900 mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="px-4 pb-20 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-neutral-900 text-center mb-8">How it works</h2>
          <div className="flex flex-col md:flex-row gap-6">
            {steps.map((s) => (
              <div key={s.num} className="flex-1 text-center">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
                  {s.num}
                </div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-1">{s.title}</h3>
                <p className="text-xs text-neutral-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-4 py-6 text-center text-sm text-neutral-400 border-t border-neutral-100">
        TripSync — Built for groups that actually want to go places.
      </footer>

      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-neutral-100">
        <Link
          href="/create"
          className="block w-full py-3 bg-primary text-white rounded-xl text-center font-semibold hover:bg-primary-dark transition-colors"
        >
          Create a Trip (Free)
        </Link>
      </div>
    </div>
  );
}
