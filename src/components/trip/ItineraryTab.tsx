'use client';

import { useState, useEffect, useCallback } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import AddItineraryItemModal from './AddItineraryItemModal';

const CATEGORY_CONFIG: Record<string, { icon: string; bg: string; fg: string; label: string }> = {
  travel:    { icon: '✈️', bg: 'rgba(15,82,87,.10)',  fg: 'var(--ts-teal)',  label: 'Travel'   },
  stay:      { icon: '🏨', bg: 'rgba(138,74,58,.10)', fg: 'var(--ts-clay)', label: 'Stay'     },
  food:      { icon: '🍽️', bg: 'rgba(242,176,74,.15)',fg: 'var(--ts-sun-d)',label: 'Food'     },
  activity:  { icon: '🎯', bg: 'rgba(217,107,63,.10)',fg: 'var(--ts-terra)',label: 'Activity' },
  free_time: { icon: '🌴', bg: 'rgba(120,120,120,.08)',fg: 'var(--ts-ink-2)',label: 'Free'   },
};
const DEFAULT_CAT = { icon: '📌', bg: 'rgba(120,120,120,.08)', fg: 'var(--ts-ink-2)', label: 'Other' };

interface ItineraryItemData {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  category: string | null;
  sort_order: number;
}

interface ItineraryTabProps {
  trip: Record<string, unknown>;
  slug: string;
  isOrganizer: boolean;
}

export default function ItineraryTab({ trip, slug, isOrganizer }: ItineraryTabProps) {
  const [items, setItems] = useState<ItineraryItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);

  const startDate = trip.start_date ? new Date(trip.start_date as string) : null;
  const endDate = trip.end_date ? new Date(trip.end_date as string) : null;
  const tripDays = startDate && endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 3;

  const fetchItinerary = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${slug}/itinerary`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch itinerary:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchItinerary(); }, [fetchItinerary]);

  const handleItemCreated = () => { setShowAddModal(false); fetchItinerary(); };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Remove this activity?')) return;
    setDeletingItem(itemId);
    try {
      const res = await fetch(`/api/trips/${slug}/itinerary/${itemId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); console.error('Delete failed:', d.error); }
      fetchItinerary();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingItem(null);
    }
  };

  const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
    const dayItems = items.filter((i) => i.day_number === activeDay);
    const idx = dayItems.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === dayItems.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const currentOrder = dayItems[idx].sort_order;
    const swapOrder = dayItems[swapIdx].sort_order;
    try {
      await Promise.all([
        fetch(`/api/trips/${slug}/itinerary/${dayItems[idx].id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: swapOrder }),
        }),
        fetch(`/api/trips/${slug}/itinerary/${dayItems[swapIdx].id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: currentOrder }),
        }),
      ]);
      fetchItinerary();
    } catch (err) { console.error('Reorder error:', err); }
  };

  const getDayLabel = (day: number) => {
    if (startDate) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day - 1);
      return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return `Day ${day}`;
  };

  const formatTime = (time: string | null) => {
    if (!time) return null;
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
        <div style={{ fontSize: 13, color: 'var(--ts-ink-3)' }}>Loading itinerary…</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <EmptyState
          icon="🗓️"
          title="No itinerary yet"
          description="Start adding activities day by day, or keep it spontaneous."
          actionLabel={isOrganizer ? '+ Add Activity' : undefined}
          onAction={isOrganizer ? () => setShowAddModal(true) : undefined}
        />
        {showAddModal && (
          <AddItineraryItemModal slug={slug} dayNumber={1} totalDays={tripDays} onClose={() => setShowAddModal(false)} onCreated={handleItemCreated} />
        )}
      </>
    );
  }

  const maxDay = Math.max(tripDays, ...items.map((i) => i.day_number));
  const dayItems = items.filter((i) => i.day_number === activeDay).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Day chip selector */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginInline: -4, paddingInline: 4 }} className="no-scrollbar">
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((day) => {
          const count = items.filter((i) => i.day_number === day).length;
          const isActive = activeDay === day;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 12,
                border: `1.5px solid ${isActive ? 'var(--ts-terra)' : 'var(--ts-line-2)'}`,
                background: isActive ? 'var(--ts-terra)' : 'var(--ts-card)',
                boxShadow: isActive ? '0 4px 14px -4px rgba(217,107,63,.45)' : 'none',
                color: isActive ? 'white' : 'var(--ts-ink-2)',
                cursor: 'pointer', textAlign: 'center', fontFamily: 'var(--ts-sans)',
                transition: 'all .2s',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 12.5 }}>Day {day}</div>
              {startDate && <div style={{ fontSize: 10, opacity: isActive ? .8 : .6, marginTop: 1 }}>{getDayLabel(day)}</div>}
              {count > 0 && <div style={{ fontSize: 10, opacity: isActive ? .7 : .5, marginTop: 1 }}>{count} item{count !== 1 ? 's' : ''}</div>}
            </button>
          );
        })}
      </div>

      {/* Day header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 18, color: 'var(--ts-ink)' }}>Day {activeDay}</div>
          {startDate && <div style={{ fontSize: 11.5, color: 'var(--ts-ink-3)', marginTop: 1 }}>{getDayLabel(activeDay)}</div>}
        </div>
        {isOrganizer && (
          <button onClick={() => setShowAddModal(true)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--ts-terra)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>
            + Add
          </button>
        )}
      </div>

      {/* Timeline */}
      {dayItems.length === 0 ? (
        <div style={{ background: 'var(--ts-card)', border: '1px dashed var(--ts-line-2)', borderRadius: 16, padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🌴</div>
          <div style={{ fontFamily: 'var(--ts-serif)', fontWeight: 500, fontSize: 15, color: 'var(--ts-ink)', marginBottom: 4 }}>Day {activeDay} is wide open</div>
          <div style={{ fontSize: 12.5, color: 'var(--ts-ink-3)', marginBottom: isOrganizer ? 14 : 0 }}>Add activities or keep it spontaneous.</div>
          {isOrganizer && (
            <button onClick={() => setShowAddModal(true)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--ts-terra)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>+ Add Activity</button>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Dashed terra vertical line */}
          <div style={{ position: 'absolute', left: 55, top: 10, bottom: 10, width: 2, backgroundImage: 'repeating-linear-gradient(to bottom, var(--ts-terra) 0 4px, transparent 4px 10px)', opacity: .35 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayItems.map((item, idx) => {
              const cat = CATEGORY_CONFIG[item.category || ''] || DEFAULT_CAT;
              const isDeleting = deletingItem === item.id;
              return (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', position: 'relative' }}>
                  {/* Time column */}
                  <div style={{ width: 46, flexShrink: 0, textAlign: 'right', paddingTop: 12, fontSize: 10.5, fontWeight: 600, color: 'var(--ts-ink-3)', fontFamily: 'var(--ts-sans)' }}>
                    {formatTime(item.start_time) || '—'}
                  </div>

                  {/* Timeline dot */}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2.5px solid var(--ts-terra)', background: 'var(--ts-card)', flexShrink: 0, marginTop: 14, position: 'relative', zIndex: 1 }} />

                  {/* Card */}
                  <div style={{ flex: 1, background: 'var(--ts-card)', border: '1px solid var(--ts-line)', borderRadius: 14, boxShadow: 'var(--ts-shadow-sm)', padding: '10px 12px', marginBottom: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontSize: 15 }}>{cat.icon}</span>
                          <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ts-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                        </div>
                        {item.location && (
                          <div style={{ fontSize: 11, color: 'var(--ts-ink-3)', marginTop: 3, marginLeft: 22 }}>📍 {item.location}</div>
                        )}
                        {item.description && (
                          <div style={{ fontSize: 11.5, color: 'var(--ts-ink-2)', marginTop: 4, marginLeft: 22, lineHeight: 1.4 }}>{item.description}</div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: cat.bg, color: cat.fg }}>
                          {cat.label}
                        </span>
                        {isOrganizer && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button onClick={() => handleMoveItem(item.id, 'up')} disabled={idx === 0} style={{ fontSize: 11, color: 'var(--ts-ink-3)', background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? .3 : 1, fontFamily: 'var(--ts-sans)' }}>↑</button>
                            <button onClick={() => handleMoveItem(item.id, 'down')} disabled={idx === dayItems.length - 1} style={{ fontSize: 11, color: 'var(--ts-ink-3)', background: 'none', border: 'none', cursor: idx === dayItems.length - 1 ? 'default' : 'pointer', opacity: idx === dayItems.length - 1 ? .3 : 1, fontFamily: 'var(--ts-sans)' }}>↓</button>
                            <button onClick={() => handleDelete(item.id)} disabled={isDeleting} style={{ fontSize: 11, color: 'var(--ts-ink-3)', background: 'none', border: 'none', cursor: 'pointer', opacity: isDeleting ? .4 : 1, fontFamily: 'var(--ts-sans)', marginLeft: 2 }}>✕</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddItineraryItemModal slug={slug} dayNumber={activeDay} totalDays={maxDay} onClose={() => setShowAddModal(false)} onCreated={handleItemCreated} />
      )}

      {/* FAB */}
      {isOrganizer && (
        <button
          onClick={() => setShowAddModal(true)}
          style={{ position: 'fixed', bottom: 88, right: 'max(16px, calc(50% - 304px))', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'var(--ts-terra)', color: 'white', border: 'none', borderRadius: 'var(--ts-r-pill)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px -4px rgba(217,107,63,.5)', fontFamily: 'var(--ts-sans)', zIndex: 20 }}
        >
          + Add Activity
        </button>
      )}
    </div>
  );
}
