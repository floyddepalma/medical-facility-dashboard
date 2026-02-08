import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, FacilityStatus, ActionItem, Task, DailyMetrics } from '../types';
import FacilityStatusPanel from './FacilityStatusPanel';
import ActionItemsList from './ActionItemsList';
import TasksList from './TasksList';
import MetricsPanel from './MetricsPanel';
import Toast, { useToast } from './Toast';
import StatusDetailModal, { DetailCategory } from './StatusDetailModal';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [facilityStatus, setFacilityStatus] = useState<FacilityStatus | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<DailyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailCategory, setDetailCategory] = useState<DetailCategory | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { messages, addToast, dismissToast } = useToast();

  useEffect(() => {
    loadData();
    const dataInterval = setInterval(loadData, 10000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(timeInterval);
    };
  }, []);

  async function loadData() {
    try {
      const [statusData, actionsData, completedActionsData, tasksData, completedTasksData, metricsData] = await Promise.all([
        api.getFacilityStatus(),
        api.getActions({ status: 'pending' }),
        api.getActions({ status: 'completed' }),
        api.getTasks(),
        api.getTasks({ status: 'completed' }),
        api.getDailyMetrics(),
      ]);
      setFacilityStatus(statusData);
      // Combine active and completed actions for the component to handle
      setActions([...actionsData.actions, ...completedActionsData.actions]);
      // Combine active and completed tasks for the component to handle
      setTasks([...tasksData.tasks, ...completedTasksData.tasks]);
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleActionUpdate(id: string, status: string) {
    try {
      await api.updateAction(id, { status });
      const label = status === 'completed' ? 'completed' : 'started';
      addToast(`Action item ${label} successfully`, 'success');
      await loadData();
    } catch (err) {
      console.error('Failed to update action:', err);
      addToast('Failed to update action item', 'error');
    }
  }

  async function handleTaskUpdate(id: string, status: string) {
    try {
      await api.updateTask(id, { status });
      const label = status === 'completed' ? 'completed' : 'started';
      addToast(`Task ${label} successfully`, 'success');
      await loadData();
    } catch (err) {
      console.error('Failed to update task:', err);
      addToast('Failed to update task', 'error');
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[200, 120, 120].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: `${h}px`, borderRadius: '12px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      {/* Main content area - shrinks when panel is open */}
      <div
        onClick={() => detailCategory && setDetailCategory(null)}
        style={{
          flex: 1,
          transition: 'margin-right 0.3s ease',
          marginRight: detailCategory ? '420px' : '0',
        }}
      >
        <div className="container">
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Dashboard
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Real-time facility overview and operations
                </p>
              </div>
              <div style={{ 
                textAlign: 'right',
                padding: '8px 16px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                  Current Time
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)', fontVariantNumeric: 'tabular-nums' }}>
                  {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </div>
              </div>
            </div>
          </div>

          {facilityStatus && (
            <FacilityStatusPanel
              status={facilityStatus}
              onDrillDown={(cat) => setDetailCategory(cat)}
              activeCategory={detailCategory}
            />
          )}

          <div className="grid grid-2">
            <ActionItemsList actions={actions} onUpdate={handleActionUpdate} />
            <TasksList tasks={tasks} onUpdate={handleTaskUpdate} />
          </div>

          {metrics && <MetricsPanel metrics={metrics} />}
        </div>
      </div>

      {/* Side panel - slides in from right */}
      <StatusDetailModal
        category={detailCategory}
        onClose={() => setDetailCategory(null)}
        isOpen={!!detailCategory}
      />

      <Toast messages={messages} onDismiss={dismissToast} />
    </div>
  );
}
