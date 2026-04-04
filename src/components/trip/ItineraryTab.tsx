'use client';

import { useState, useEffect, useCallback } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import AddItineraryItemModal from './AddItineraryItemModal';

const CATEGORY_ICONS: Record<string, string> = {
  travel: '✈️',
  stay: '🏨',
  food: '🍽️',
  activity: '🎯',
  free_time: '😎',
};

const CATEGORY_COLORS: Record<string, string> = {
  travel: 'bg-blue-100 text-blue-700',
  stay: 'bg-purple-100 text-purple-700',
  food: 'bg-orange-100 text-orange-700',
  activity: 'bg-green-100 text-green-700',
  free_time: 'bg-neutral-100 text-neutral-600',
};

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

  // Calculate trip days
  const startDate = trip.start_date ? new Date(trip.start_date as string) : null;
  const endDate = trip.end_date ? new Date(trip.end_date as string) : null;
  const tripDays = startDate && endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 3; // default 3 days

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

  useEffect(() => {
    fetchItinerary();
  }, [fetchItinerary]);

  const handleItemCreated = () => {
    setShowAddModal(false);
    fetchItinerary();
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Remove this activity?')) return;
    setDeletingItem(itemId);
    try {
      const res = await fetch(`/api/trips/${slug}/itinerary/${itemId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        console.error('Delete failed:', data.error);
      }
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
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: swapOrder }),
        }),
        fetch(`/api/trips/${slug}/itinerary/${dayItems[swapIdx].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: currentOrder }),
        }),
      ]);
      fetchItinerary();
    } catch (err) {
      console.error('Reorder error:', err);
    }
  };

  // Get the date label for a day number
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
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hr = hour % 12 || 12;
    return `${hr}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-neutral-400 text-sm">Loading itinerary...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <EmptyState
          icon="🗓️"
          title="No itinerary yet"
          description="Start adding activities day by day, or choose chill mode — no plans needed."
          actionLabel={isOrganizer ? 'Build Itinerary' : undefined}
          onAction={isOrganizer ? () => setShowAddModal(true) : undefined}
        />
        {showAddModal && (
          <AddItineraryItemModal
            slug={slug}
            dayNumber={1}
            totalDays={tripDays}
            onClose={() => setShowAddModal(false)}
            onCreated={handleItemCreated}
          />
        )}
      </>
    );
  }

  // Group items by day
  const maxDay = Math.max(tripDays, ...items.map((i) => i.day_number));
  const dayItems = items.filter((i) => i.day_number === activeDay);

  return (
    <div className="space-y-4">
      {/* Day selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((day) => {
          const count = items.filter((i) => i.day_number === day).length;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                activeDay === day
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div>Day {day}</div>
              {startDate && (
                <div className={`text-[10px] ${activeDay === day ? 'text-white/80' : 'text-neutral-400'}`}>
                  {getDayLabel(day)}
                </div>
              )}
              {count > 0 && (
                <div className={`text-[10px] ${activeDay === day ? 'text-white/70' : 'text-neutral-400'}`}>
                  {count} item{count !== 1 ? 's' : ''}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Day header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Day {activeDay}</h3>
          {startDate && (
            <p className="text-xs text-neutral-500">{getDayLabel(activeDay)}</p>
          )}
        </div>
        {isOrganizer && (
          <button
            onClick={() => setShowAddModal(true)}
            className="text-sm text-primary font-medium hover:text-primary-dark transition-colors"
          >
            + Add Activity
          </button>
        )}
      </div>

      {/* Timeline */}
      {dayItems.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No activities yet"
          description={`Day ${activeDay} is wide open. Add activities or keep it chill.`}
          actionLabel={isOrganizer ? '+ Add Activity' : undefined}
          onAction={isOrganizer ? () => setShowAddModal(true) : undefined}
        />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[39px] top-2 bottom-2 w-0.5 bg-neutral-200" />

          <div className="space-y-1">
            {dayItems.map((item, idx) => (
              <div key={item.id} className="flex gap-3 relative">
                {/* Time column */}
                <div className="w-14 shrink-0 text-right pt-3">
                  {item.start_time ? (
                    <span className="text-xs font-medium text-neutral-600">
                      {formatTime(item.start_time)}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-300">—</span>
                  )}
                </div>

                {/* Timeline dot */}
                <div className="relative flex items-start pt-3">
                  <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm relative z-[1] ${
                    item.category === 'free_time' ? 'bg-neutral-300' : 'bg-primary'
                  }`} />
                </div>

                {/* Content card */}
                <div className="flex-1 bg-white rounded-xl border border-neutral-100 shadow-sm p-3 mb-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {CATEGORY_ICONS[item.category || 'activity'] || '📌'}
                        </span>
                        <p className="text-sm font-medium text-neutral-900 truncate">{item.title}</p>
                      </div>
                      {item.location && (
                        <p className="text-xs text-neutral-500 mt-0.5 ml-6">📍 {item.location}</p>
                      )}
                      {item.description && (
                        <p className="text-xs text-neutral-400 mt-1 ml-6">{item.description}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {item.category && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          CATEGORY_COLORS[item.category] || 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {item.category.replace('_', ' ')}
                        </span>
                      )}

                      {isOrganizer && (
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => handleMoveItem(item.id, 'up')}
                            disabled={idx === 0}
                            className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 text-xs"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveItem(item.id, 'down')}
                            disabled={idx === dayItems.length - 1}
                            className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 text-xs"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingItem === item.id}
                            className="text-neutral-400 hover:text-red-500 transition-colors text-xs ml-1 disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItineraryItemModal
          slug={slug}
          dayNumber={activeDay}
          totalDays={maxDay}
          onClose={() => setShowAddModal(false)}
          onCreated={handleItemCreated}
        />
      )}
    </div>
  );
}
