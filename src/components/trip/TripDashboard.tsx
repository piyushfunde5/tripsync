'use client';

import { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import OverviewTab from './OverviewTab';
import PollsTab from './PollsTab';
import ItineraryTab from './ItineraryTab';
import TasksTab from './TasksTab';
import ExpensesTab from './ExpensesTab';
import NudgeCenterModal from './NudgeCenterModal';

const tabs = [
  { id: 'overview', label: 'Overview', icon: '🏠' },
  { id: 'polls', label: 'Polls', icon: '🗳️' },
  { id: 'itinerary', label: 'Itinerary', icon: '📍' },
  { id: 'tasks', label: 'Tasks', icon: '✅' },
  { id: 'expenses', label: 'Expenses', icon: '💰' },
] as const;

type TabId = typeof tabs[number]['id'];

interface TripDashboardProps {
  trip: Record<string, unknown>;
  members: Record<string, unknown>[];
  currentMember: Record<string, unknown>;
  activity: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  polls: Record<string, unknown>[];
  slug: string;
  onRsvp: (status: string) => void;
  onRefresh: () => void;
}

export default function TripDashboard({
  trip, members, currentMember, activity, decisions, tasks, polls, slug, onRsvp, onRefresh,
}: TripDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showNudgeCenter, setShowNudgeCenter] = useState(false);
  const isOrganizer = currentMember.role === 'organizer';

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 md:pb-8">
      {/* Top Bar */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-10">
        <PageContainer className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-neutral-900">{trip.title as string}</h1>
              <p className="text-xs text-neutral-500">
                {trip.destination ? (trip.destination as string) : 'Destination TBD'}
                {trip.start_date ? ` · ${new Date(trip.start_date as string).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : ''}
                {trip.end_date ? ` - ${new Date(trip.end_date as string).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isOrganizer && (
                <button
                  onClick={() => setShowNudgeCenter(true)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-primary"
                  title="Nudge Center"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                trip.status === 'planning' ? 'bg-blue-100 text-blue-700' :
                trip.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                trip.status === 'active' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {(trip.status as string)?.charAt(0).toUpperCase() + (trip.status as string)?.slice(1)}
              </span>
            </div>
          </div>
        </PageContainer>

        {/* Desktop tabs */}
        <div className="hidden md:block border-t border-neutral-100">
          <PageContainer>
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-primary'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </PageContainer>
        </div>
      </header>

      {/* Content */}
      <PageContainer className="py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            trip={trip}
            members={members}
            currentMember={currentMember}
            activity={activity}
            decisions={decisions}
            tasks={tasks}
            slug={slug}
            isOrganizer={isOrganizer}
            onRsvp={onRsvp}
            onRefresh={onRefresh}
          />
        )}
        {activeTab === 'polls' && (
          <PollsTab
            trip={trip}
            members={members}
            currentMember={currentMember}
            decisions={decisions}
            polls={polls as never[]}
            slug={slug}
            isOrganizer={isOrganizer}
            onRefresh={onRefresh}
          />
        )}
        {activeTab === 'itinerary' && (
          <ItineraryTab trip={trip} slug={slug} isOrganizer={isOrganizer} />
        )}
        {activeTab === 'tasks' && (
          <TasksTab
            trip={trip}
            members={members}
            currentMember={currentMember}
            tasks={tasks}
            slug={slug}
            isOrganizer={isOrganizer}
            onRefresh={onRefresh}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab
            trip={trip}
            members={members}
            currentMember={currentMember}
            slug={slug}
            onRefresh={onRefresh}
          />
        )}
      </PageContainer>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-20">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-center transition-colors ${
                activeTab === tab.id ? 'text-primary' : 'text-neutral-400'
              }`}
            >
              <span className="block text-base leading-none mb-0.5">{tab.icon}</span>
              <span className="block text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Nudge Center Modal */}
      {showNudgeCenter && (
        <NudgeCenterModal
          slug={slug}
          tripTitle={trip.title as string}
          onClose={() => setShowNudgeCenter(false)}
        />
      )}
    </div>
  );
}
