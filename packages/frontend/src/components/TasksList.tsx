import { useState } from 'react';
import { Task } from '../types';

interface Props {
  tasks: Task[];
  onUpdate: (id: string, status: string) => void;
}

const MAX_QUEUE_SIZE = 10;

export default function TasksList({ tasks, onUpdate }: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Queue behavior: show only the most recent MAX_QUEUE_SIZE items
  const displayTasks = tasks.slice(0, MAX_QUEUE_SIZE);
  const agentTasks = displayTasks.filter(t => t.assignee === 'agent');
  const staffTasks = displayTasks.filter(t => t.assignee !== 'agent');

  async function handleUpdate(id: string, status: string) {
    setUpdatingId(id);
    await onUpdate(id, status);
    setUpdatingId(null);
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Operational Tasks</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {tasks.length > MAX_QUEUE_SIZE && (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              +{tasks.length - MAX_QUEUE_SIZE} more
            </span>
          )}
          <span style={{
            fontSize: '12px', fontWeight: 600, padding: '3px 10px',
            borderRadius: '20px', background: 'var(--bg-surface-raised)',
            color: 'var(--text-secondary)',
          }}>
            {tasks.length}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: '16px', marginBottom: '16px',
        padding: '10px 14px', borderRadius: '8px',
        background: 'var(--bg-surface-raised)', fontSize: '13px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>AI Agent:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{agentTasks.length}</span>
        </div>
        <div style={{ width: '1px', background: 'var(--border-default)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Staff:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{staffTasks.length}</span>
        </div>
      </div>

      {displayTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">📋</div>
          <div className="empty-state-text">No active tasks</div>
          <div className="empty-state-hint">Tasks will appear here when created</div>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          {displayTasks.map((task) => {
            const isUpdating = updatingId === task.id;
            return (
              <div key={task.id} className="list-item"
                style={{
                  display: 'flex', flexDirection: 'column',
                  opacity: isUpdating ? 0.5 : 1,
                  transition: 'opacity 0.2s ease',
                }}>
                {/* Top row: badges and metadata */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className={`badge ${task.status}`}>{task.status.replace('_', ' ')}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {task.assignee === 'agent' ? '🤖 AI Agent' : `👤 ${task.assignee}`}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                    {new Date(task.startTime).toLocaleTimeString()}
                  </span>
                </div>
                {/* Title */}
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)', marginBottom: '4px' }}>
                  {task.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                {/* Description */}
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                  {task.description}
                </div>
                {/* Buttons — right-aligned at bottom, matching ActionItemsList */}
                {task.status !== 'completed' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto' }}>
                    {task.status === 'pending' && (
                      <button onClick={() => handleUpdate(task.id, 'in_progress')}
                        className="secondary" disabled={isUpdating}
                        style={{ fontSize: '13px', padding: '6px 14px', minHeight: '34px' }}>
                        {isUpdating ? '...' : 'Start'}
                      </button>
                    )}
                    <button onClick={() => handleUpdate(task.id, 'completed')}
                      className="primary" disabled={isUpdating}
                      style={{ fontSize: '13px', padding: '6px 14px', minHeight: '34px' }}>
                      {isUpdating ? '...' : 'Complete'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
