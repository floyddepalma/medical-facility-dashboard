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
  const { messages, addToast, dismissToast } = useToast();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [statusData, actionsData, tasksData, metricsData] = await Promise.all([
        api.getFacilityStatus(),
        api.getActions({ status: 'pending' }),
        api.getTasks(),
        api.getDailyMetrics(),
      ]);
      setFacilityStatus(statusData);
      setActions(actionsData.actions);
      setTasks(tasksData.tasks);
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
    <div className="container">
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Dashboard
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Real-time facility overview and operations
        </p>
      </div>

      {facilityStatus && (
        <FacilityStatusPanel
          status={facilityStatus}
          onDrillDown={(cat) => setDetailCategory(cat)}
        />
      )}

      <div className="grid grid-2">
        <ActionItemsList actions={actions} onUpdate={handleActionUpdate} />
        <TasksList tasks={tasks} onUpdate={handleTaskUpdate} />
      </div>

      {metrics && <MetricsPanel metrics={metrics} />}

      <Toast messages={messages} onDismiss={dismissToast} />
      <StatusDetailModal category={detailCategory} onClose={() => setDetailCategory(null)} />
    </div>
  );
}
