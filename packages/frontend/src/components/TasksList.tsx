import { Task } from '../types';

interface Props {
  tasks: Task[];
  onUpdate: (id: string, status: string) => void;
}

export default function TasksList({ tasks, onUpdate }: Props) {
  const agentTasks = tasks.filter(t => t.assignee === 'agent');
  const staffTasks = tasks.filter(t => t.assignee !== 'agent');

  return (
    <div className="card">
      <h2>Operational Tasks ({tasks.length})</h2>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', fontSize: '14px' }}>
        <div>
          <span style={{ fontWeight: '500' }}>AI Agent:</span> {agentTasks.length} tasks
        </div>
        <div>
          <span style={{ fontWeight: '500' }}>Staff:</span> {staffTasks.length} tasks
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          No active tasks
        </div>
      ) : (
        <div>
          {tasks.map((task) => (
            <div key={task.id} className="list-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={`badge ${task.status === 'completed' ? 'available' : 'normal'}`}>
                  {task.status}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {task.assignee === 'agent' ? '🤖 AI Agent' : `👤 ${task.assignee}`}
                </span>
              </div>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>{task.type}</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {task.description}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                Started: {new Date(task.startTime).toLocaleTimeString()}
              </div>
              {task.status !== 'completed' && (
                <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                  {task.status === 'pending' && (
                    <button
                      onClick={() => onUpdate(task.id, 'in_progress')}
                      className="secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => onUpdate(task.id, 'completed')}
                    className="primary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Complete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
