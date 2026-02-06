import { useState } from 'react';
import { ActionItem } from '../types';

interface Props {
  actions: ActionItem[];
  onUpdate: (id: string, status: string) => void;
}

const MAX_QUEUE_SIZE = 10;

export default function ActionItemsList({ actions, onUpdate }: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Queue behavior: show only the most recent MAX_QUEUE_SIZE items
  const displayActions = actions.slice(0, MAX_QUEUE_SIZE);

  function formatTimeWaiting(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  async function handleUpdate(id: string, status: string) {
    setUpdatingId(id);
    await onUpdate(id, status);
    setUpdatingId(null);
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Action Required</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {actions.length > MAX_QUEUE_SIZE && (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              +{actions.length - MAX_QUEUE_SIZE} more
            </span>
          )}
          <span style={{
            fontSize: '12px', fontWeight: 600, padding: '3px 10px',
            borderRadius: '20px', background: actions.length > 0 ? 'var(--color-accent-danger-light)' : 'var(--bg-surface-raised)',
            color: actions.length > 0 ? 'var(--color-accent-danger)' : 'var(--text-tertiary)',
          }}>
            {actions.length}
          </span>
        </div>
      </div>

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
            return (
              <div key={action.id} className="list-item"
                style={{
                  display: 'flex', flexDirection: 'column',
                  opacity: isUpdating ? 0.5 : 1,
                  transition: 'opacity 0.2s ease',
                }}>
                {/* Top row: badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className={`badge ${action.urgency}`}>{action.urgency}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {formatTimeWaiting(action.timeWaiting)} waiting
                  </span>
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
                  <button onClick={() => handleUpdate(action.id, 'in_progress')}
                    className="secondary" disabled={isUpdating}
                    style={{ fontSize: '13px', padding: '6px 14px', minHeight: '34px' }}>
                    {isUpdating ? '...' : 'Start'}
                  </button>
                  <button onClick={() => handleUpdate(action.id, 'completed')}
                    className="primary" disabled={isUpdating}
                    style={{ fontSize: '13px', padding: '6px 14px', minHeight: '34px' }}>
                    {isUpdating ? '...' : 'Complete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
