import { useState, useEffect } from 'react';
import { Task } from '../types';

interface Props {
  tasks: Task[];
  onUpdate: (id: string, status: string) => void;
}

const MAX_QUEUE_SIZE = 10;

export default function TasksList({ tasks, onUpdate }: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);

  // Track completed tasks for brief display
  useEffect(() => {
    const newCompleted = tasks.filter(t => t.status === 'completed');
    if (newCompleted.length > completedTasks.length) {
      setCompletedTasks(newCompleted);
    }
  }, [tasks]);

  // Queue behavior: show only the most recent MAX_QUEUE_SIZE items
  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const displayTasks = activeTasks.slice(0, MAX_QUEUE_SIZE);
  const agentTasks = displayTasks.filter(t => t.assignee === 'agent');
  const staffTasks = displayTasks.filter(t => t.assignee !== 'agent');

  async function handleUpdate(id: string, status: string) {
    setUpdatingId(id);
    
    if (status === 'completed') {
      // Add to completing set for visual feedback
      setCompletingIds(prev => new Set(prev).add(id));
      
      // Remove from completing set after animation
      setTimeout(() => {
        setCompletingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 2000);
    }
    
    await onUpdate(id, status);
    setUpdatingId(null);
  }

  function formatDuration(startTime: string): string {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const minutes = Math.floor((now - start) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Operational Tasks</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTasks.length > MAX_QUEUE_SIZE && (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              +{activeTasks.length - MAX_QUEUE_SIZE} more
            </span>
          )}
          <span style={{
            fontSize: '12px', fontWeight: 600, padding: '3px 10px',
            borderRadius: '20px', background: 'var(--bg-surface-raised)',
            color: 'var(--text-secondary)',
          }}>
            {activeTasks.length}
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
        {completedTasks.length > 0 && (
          <>
            <div style={{ width: '1px', background: 'var(--border-default)' }} />
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-accent-success)',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              <span>✓ {completedTasks.length} completed today</span>
              <span style={{ fontSize: '10px' }}>{showCompleted ? '▼' : '▶'}</span>
            </button>
          </>
        )}
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
            const isCompleting = completingIds.has(task.id);
            return (
              <div key={task.id} className="list-item"
                style={{
                  display: 'flex', flexDirection: 'column',
                  opacity: isUpdating ? 0.5 : 1,
                  background: isCompleting ? 'var(--color-accent-success-light)' : undefined,
                  borderColor: isCompleting ? 'var(--color-accent-success)' : undefined,
                  transition: 'all 0.3s ease',
                }}>
                {/* Top row: badges and metadata */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className={`badge ${task.status}`}>{task.status.replace('_', ' ')}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {task.assignee === 'agent' ? '🤖 AI Agent' : `👤 ${task.assignee}`}
                  </span>
                  {task.status === 'in_progress' && (
                    <span style={{ 
                      fontSize: '12px', 
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      marginLeft: 'auto',
                    }}>
                      ⏱ {formatDuration(task.startTime)}
                    </span>
                  )}
                  {task.status === 'pending' && (
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                      {new Date(task.startTime).toLocaleTimeString()}
                    </span>
                  )}
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
                      {isUpdating ? '...' : task.status === 'in_progress' ? '✓ Complete' : 'Complete'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Tasks Section */}
      {showCompleted && completedTasks.length > 0 && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-default)',
        }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            Completed Today
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completedTasks.slice(0, 5).map((task) => (
              <div key={task.id} style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-surface-raised)',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-accent-success)' }}>✓</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)', flex: 1 }}>
                    {task.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {task.assignee === 'agent' ? '🤖' : '👤'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                  {task.description}
                </div>
              </div>
            ))}
            {completedTasks.length > 5 && (
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '8px' }}>
                +{completedTasks.length - 5} more completed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
