import { useState, useEffect } from 'react';
import { ActionItem } from '../types';

interface Props {
  actions: ActionItem[];
  onUpdate: (id: string, status: string) => void;
}

const MAX_QUEUE_SIZE = 10;

export default function ActionItemsList({ actions, onUpdate }: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedActions, setCompletedActions] = useState<ActionItem[]>([]);

  // Track completed actions for brief display
  useEffect(() => {
    const newCompleted = actions.filter(a => a.status === 'completed');
    if (newCompleted.length > completedActions.length) {
      setCompletedActions(newCompleted);
    }
  }, [actions]);

  // Queue behavior: show only the most recent MAX_QUEUE_SIZE items
  const activeActions = actions.filter(a => a.status !== 'completed');
  const displayActions = activeActions.slice(0, MAX_QUEUE_SIZE);

  function formatTimeWaiting(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

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

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Action Required</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeActions.length > MAX_QUEUE_SIZE && (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              +{activeActions.length - MAX_QUEUE_SIZE} more
            </span>
          )}
          <span style={{
            fontSize: '12px', fontWeight: 600, padding: '3px 10px',
            borderRadius: '20px', background: activeActions.length > 0 ? 'var(--color-accent-danger-light)' : 'var(--bg-surface-raised)',
            color: activeActions.length > 0 ? 'var(--color-accent-danger)' : 'var(--text-tertiary)',
          }}>
            {activeActions.length}
          </span>
        </div>
      </div>

      {completedActions.length > 0 && (
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 12px',
            marginBottom: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-accent-success)',
            fontWeight: 600,
            fontSize: '13px',
            borderRadius: '6px',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-accent-success-light)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <span>✓ {completedActions.length} resolved today</span>
          <span style={{ fontSize: '10px' }}>{showCompleted ? '▼' : '▶'}</span>
        </button>
      )}

      {displayActions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">✓</div>
          <div className="empty-state-text">All clear</div>
          <div className="empty-state-hint">No items require your attention right now</div>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          {displayActions.map((action) => {
            const isUpdating = updatingId === action.id;
            const isCompleting = completingIds.has(action.id);
            return (
              <div key={action.id} className="list-item"
                style={{
                  display: 'flex', flexDirection: 'column',
                  opacity: isUpdating ? 0.5 : 1,
                  background: isCompleting ? 'var(--color-accent-success-light)' : undefined,
                  borderColor: isCompleting ? 'var(--color-accent-success)' : undefined,
                  transition: 'all 0.3s ease',
                }}>
                {/* Top row: badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className={`badge ${action.urgency}`}>{action.urgency}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {formatTimeWaiting(action.timeWaiting)} waiting
                  </span>
                  {action.status === 'in_progress' && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      marginLeft: 'auto',
                    }}>
                      In Progress
                    </span>
                  )}
                </div>
                {/* Title */}
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)', marginBottom: '4px' }}>
                  {action.title}
                </div>
                {/* Description */}
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                  {action.description}
                </div>
                {/* Buttons — right-aligned at bottom */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto' }}>
                  {action.status === 'pending' && (
                    <button onClick={() => handleUpdate(action.id, 'in_progress')}
                      className="secondary" disabled={isUpdating}
                      style={{ fontSize: '13px', padding: '6px 14px', minHeight: '34px' }}>
                      {isUpdating ? '...' : 'Start'}
                    </button>
                  )}
                  <button onClick={() => handleUpdate(action.id, 'completed')}
                    className="primary" disabled={isUpdating}
                    style={{ fontSize: '13px', padding: '6px 14px', minHeight: '34px' }}>
                    {isUpdating ? '...' : action.status === 'in_progress' ? '✓ Resolve' : 'Resolve'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Actions Section */}
      {showCompleted && completedActions.length > 0 && (
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
            Resolved Today
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completedActions.slice(0, 5).map((action) => (
              <div key={action.id} style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-surface-raised)',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-accent-success)' }}>✓</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)', flex: 1 }}>
                    {action.title}
                  </span>
                  <span className={`badge ${action.urgency}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                    {action.urgency}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                  {action.description}
                </div>
              </div>
            ))}
            {completedActions.length > 5 && (
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '8px' }}>
                +{completedActions.length - 5} more resolved
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
