import { ActionItem } from '../types';

interface Props {
  actions: ActionItem[];
  onUpdate: (id: string, status: string) => void;
}

export default function ActionItemsList({ actions, onUpdate }: Props) {
  function formatTimeWaiting(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  return (
    <div className="card">
      <h2>Action Required ({actions.length})</h2>

      {actions.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          No action items requiring attention
        </div>
      ) : (
        <div>
          {actions.map((action) => (
            <div key={action.id} className="list-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className={`badge ${action.urgency}`}>
                      {action.urgency}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      Waiting: {formatTimeWaiting(action.timeWaiting)}
                    </span>
                  </div>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{action.title}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>{action.description}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onUpdate(action.id, 'in_progress')}
                    className="secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Start
                  </button>
                  <button
                    onClick={() => onUpdate(action.id, 'completed')}
                    className="primary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Complete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
