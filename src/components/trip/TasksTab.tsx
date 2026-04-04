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
    <div className="space-y-4">
      {/* Header with summary + filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-neutral-500">
            {completedCount}/{tasks.length} complete
            {overdueCount > 0 ? (
              <span className="text-red-500 ml-1">· {overdueCount} overdue</span>
            ) : null}
          </p>
        </div>
        <button
          onClick={() => setShowCreateTask(true)}
          className="text-sm text-primary font-medium hover:text-primary-dark transition-colors"
        >
          + New Task
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {(['all', 'mine', 'overdue'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'mine' ? 'My Tasks' : 'Overdue'}
            {f === 'overdue' && overdueCount > 0 ? ` (${overdueCount})` : ''}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-neutral-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-green-500 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
        />
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={filter === 'overdue' ? '🎉' : '📋'}
          title={filter === 'mine' ? 'No tasks for you' : 'No overdue tasks'}
          description={filter === 'mine'
            ? 'You have no tasks assigned. Enjoy the free time!'
            : 'Everything is on track. No overdue tasks right now.'}
        />
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const effectiveStatus = getEffectiveStatus(task);
            const isExpanded = expandedTask === task.id;
            const isAssignee = task.assigned_to === currentMemberId;
            const isCreator = task.created_by === currentMemberId;

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border shadow-sm transition-all ${
                  effectiveStatus === 'overdue'
                    ? 'border-red-200 bg-red-50/30'
                    : effectiveStatus === 'done'
                    ? 'border-green-100 opacity-75'
                    : 'border-neutral-100'
                }`}
              >
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* Done checkbox visual */}
                        <div
                          className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            effectiveStatus === 'done'
                              ? 'bg-green-500 border-green-500'
                              : effectiveStatus === 'overdue'
                              ? 'border-red-400'
                              : effectiveStatus === 'in_progress'
                              ? 'border-amber-400'
                              : 'border-neutral-300'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (effectiveStatus === 'done') {
                              handleStatusUpdate(task.id, 'assigned');
                            } else if (isAssignee || isOrganizer || isCreator) {
                              handleStatusUpdate(task.id, 'done');
                            }
                          }}
                        >
                          {effectiveStatus === 'done' && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {effectiveStatus === 'in_progress' && (
                            <div className="w-2 h-2 bg-amber-400 rounded-full" />
                          )}
                        </div>

                        <p className={`text-sm font-medium truncate ${
                          effectiveStatus === 'done' ? 'line-through text-neutral-400' : 'text-neutral-900'
                        }`}>
                          {task.title}
                        </p>
                      </div>

                      {task.assignee && (
                        <div className="flex items-center gap-1.5 mt-1.5 ml-6.5">
                          <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatar_url} size="sm" />
                          <span className="text-xs text-neutral-500">{task.assignee.name}</span>
                          {isAssignee && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">You</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={effectiveStatus} />
                      {task.deadline && <DeadlineCountdown deadline={task.deadline} />}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 px-3 pb-3 pt-2 space-y-3">
                    {task.description && (
                      <p className="text-xs text-neutral-500 leading-relaxed">{task.description}</p>
                    )}

                    {task.creator && (
                      <p className="text-xs text-neutral-400">
                        Created by {task.creator.name}
                        {task.created_at && (
                          <> · {new Date(task.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</>
                        )}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {getActionButton(task)}
                      </div>

                      {/* Delete */}
                      {(isOrganizer || isCreator) && (
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          slug={slug}
          members={members}
          onClose={() => setShowCreateTask(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}
