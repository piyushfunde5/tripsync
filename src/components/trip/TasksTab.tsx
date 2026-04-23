'use client';

import { useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import Avatar from '@/components/ui/Avatar';
import DeadlineCountdown from '@/components/ui/DeadlineCountdown';
import CreateTaskModal from './CreateTaskModal';
import type { TaskStatus } from '@/types';

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  deadline: string | null;
  status: string;
  created_by: string;
  created_at: string;
  assignee?: { id: string; name: string; avatar_url: string | null } | null;
  creator?: { name: string } | null;
}

interface TasksTabProps {
  trip: Record<string, unknown>;
  members: Record<string, unknown>[];
  currentMember: Record<string, unknown>;
  tasks: Record<string, unknown>[];
  slug: string;
  isOrganizer: boolean;
  onRefresh: () => void;
}

type TaskFilter = 'all' | 'mine' | 'overdue';

export default function TasksTab({ tasks: rawTasks, members, currentMember, slug, isOrganizer, onRefresh }: TasksTabProps) {
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const tasks = rawTasks as unknown as TaskData[];
  const currentMemberId = currentMember.id as string;

  // Compute overdue status client-side (task might be "assigned" but past deadline)
  const getEffectiveStatus = (task: TaskData): TaskStatus => {
    if (task.status === 'done') return 'done';
    if (task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done') {
      return 'overdue';
    }
    return task.status as TaskStatus;
  };

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const overdueCount = tasks.filter((t) => getEffectiveStatus(t) === 'overdue').length;

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'mine') return t.assigned_to === currentMemberId || t.created_by === currentMemberId;
    if (filter === 'overdue') return getEffectiveStatus(t) === 'overdue';
    return true;
  });

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    setUpdatingTask(taskId);
    try {
      const res = await fetch(`/api/trips/${slug}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to update task:', data.error);
      }
      onRefresh();
    } catch (err) {
      console.error('Update task error:', err);
    } finally {
      setUpdatingTask(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/api/trips/${slug}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to delete task:', data.error);
      }
      onRefresh();
    } catch (err) {
      console.error('Delete task error:', err);
    }
  };

  const handleTaskCreated = () => {
    setShowCreateTask(false);
    onRefresh();
  };

  if (tasks.length === 0) {
    return (
      <>
        <EmptyState
          icon="✅"
          title="No tasks yet"
          description="Create tasks and assign them to group members with deadlines."
          actionLabel="+ New Task"
          onAction={() => setShowCreateTask(true)}
        />
        {showCreateTask && (
          <CreateTaskModal
            slug={slug}
            members={members}
            onClose={() => setShowCreateTask(false)}
            onCreated={handleTaskCreated}
          />
        )}
      </>
    );
  }

  // Status action buttons per task
  const getActionButton = (task: TaskData) => {
    const effectiveStatus = getEffectiveStatus(task);
    const isAssignee = task.assigned_to === currentMemberId;
    const isCreator = task.created_by === currentMemberId;
    const canAct = isAssignee || isOrganizer || isCreator;
    const isUpdating = updatingTask === task.id;

    if (!canAct) return null;

    if (effectiveStatus === 'done') {
      return (
        <button
          onClick={() => handleStatusUpdate(task.id, 'assigned')}
          disabled={isUpdating}
          className="text-xs font-medium text-neutral-400 hover:text-amber-600 transition-colors disabled:opacity-50"
        >
          {isUpdating ? '...' : 'Reopen'}
        </button>
      );
    }

    if (effectiveStatus === 'assigned' || effectiveStatus === 'overdue') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStatusUpdate(task.id, 'in_progress')}
            disabled={isUpdating}
            className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50"
          >
            {isUpdating ? '...' : 'Start'}
          </button>
          <button
            onClick={() => handleStatusUpdate(task.id, 'done')}
            disabled={isUpdating}
            className="text-xs font-medium px-2.5 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            {isUpdating ? '...' : '✓ Done'}
          </button>
        </div>
      );
    }

    if (effectiveStatus === 'in_progress') {
      return (
        <button
          onClick={() => handleStatusUpdate(task.id, 'done')}
          disabled={isUpdating}
          className="text-xs font-medium px-2.5 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          {isUpdating ? '...' : '✓ Mark Done'}
        </button>
      );
    }

    return null;
  };

  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--ts-ink-2)' }}>
          {completedCount}/{tasks.length} done
          {overdueCount > 0 && <span style={{ color: 'var(--ts-err)', marginLeft: 6 }}>· {overdueCount} overdue</span>}
        </div>
        <button onClick={() => setShowCreateTask(true)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--ts-terra)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>+ New Task</button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['all', 'mine', 'overdue'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 14px', borderRadius: 999,
              border: `1.5px solid ${filter === f ? 'var(--ts-terra)' : 'var(--ts-line-2)'}`,
              background: filter === f ? 'rgba(217,107,63,.08)' : 'var(--ts-card)',
              color: filter === f ? 'var(--ts-terra-d)' : 'var(--ts-ink-2)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--ts-sans)',
            }}
          >
            {f === 'all' ? 'All' : f === 'mine' ? 'Mine' : 'Overdue'}
            {f === 'overdue' && overdueCount > 0 ? ` · ${overdueCount}` : ''}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: 'var(--ts-card-2)', overflow: 'hidden' }}>
        <div style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, var(--ts-terra), var(--ts-sun))', transition: 'width .5s ease' }} />
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={filter === 'overdue' ? '🎉' : '📋'}
          title={filter === 'mine' ? 'No tasks for you' : 'No overdue tasks'}
          description={filter === 'mine' ? 'You have no tasks assigned. Enjoy the free time!' : 'Everything is on track. No overdue tasks right now.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredTasks.map((task) => {
            const effectiveStatus = getEffectiveStatus(task);
            const isExpanded = expandedTask === task.id;
            const isAssignee = task.assigned_to === currentMemberId;
            const isCreator = task.created_by === currentMemberId;

            return (
              <div
                key={task.id}
                style={{
                  background: 'var(--ts-card)',
                  border: `1px solid var(--ts-line)`,
                  borderLeft: effectiveStatus === 'overdue' ? '3px solid var(--ts-err)' : `1px solid var(--ts-line)`,
                  borderRadius: 14,
                  boxShadow: 'var(--ts-shadow-sm)',
                  opacity: effectiveStatus === 'done' ? 0.65 : 1,
                }}
              >
                <div style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                        border: `1.5px solid ${effectiveStatus === 'done' ? 'var(--ts-ok)' : effectiveStatus === 'overdue' ? 'var(--ts-err)' : 'var(--ts-line-2)'}`,
                        background: effectiveStatus === 'done' ? 'var(--ts-ok)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                      onClick={e => { e.stopPropagation(); if (effectiveStatus === 'done') { handleStatusUpdate(task.id, 'assigned'); } else if (isAssignee || isOrganizer || isCreator) { handleStatusUpdate(task.id, 'done'); } }}
                    >
                      {effectiveStatus === 'done' && <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                      {effectiveStatus === 'in_progress' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ts-warn)' }}/>}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ts-ink)', textDecoration: effectiveStatus === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
                        {effectiveStatus === 'overdue' && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ts-err)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Overdue</span>}
                      </div>
                      {task.assignee && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatar_url} size={20} />
                          <span style={{ fontSize: 11.5, color: 'var(--ts-ink-2)' }}>{task.assignee.name}</span>
                          {isAssignee && <span style={{ fontSize: 10, background: 'rgba(217,107,63,.1)', color: 'var(--ts-terra)', padding: '2px 6px', borderRadius: 999, fontWeight: 700 }}>You</span>}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      {task.deadline && (
                        <span style={{ fontSize: 11, color: effectiveStatus === 'overdue' ? 'var(--ts-err)' : 'var(--ts-ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          📅 {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--ts-line)', padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {task.description && <p style={{ fontSize: 12.5, color: 'var(--ts-ink-2)', lineHeight: 1.5 }}>{task.description}</p>}
                    {task.creator && <p style={{ fontSize: 11, color: 'var(--ts-ink-3)' }}>Created by {task.creator.name} · {new Date(task.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>{getActionButton(task)}</div>
                      {(isOrganizer || isCreator) && (
                        <button onClick={() => handleDelete(task.id)} style={{ fontSize: 12, color: 'var(--ts-ink-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ts-sans)' }}>Delete</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateTask && <CreateTaskModal slug={slug} members={members} onClose={() => setShowCreateTask(false)} onCreated={handleTaskCreated} />}

      {/* FAB */}
      <button
        onClick={() => setShowCreateTask(true)}
        style={{ position: 'fixed', bottom: 88, right: 'max(16px, calc(50% - 304px))', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'var(--ts-terra)', color: 'white', border: 'none', borderRadius: 'var(--ts-r-pill)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px -4px rgba(217,107,63,.5)', fontFamily: 'var(--ts-sans)', zIndex: 20 }}
      >
        + New Task
      </button>
    </div>
  );
}
