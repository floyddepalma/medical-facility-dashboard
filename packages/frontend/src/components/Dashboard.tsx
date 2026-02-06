import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, FacilityStatus, ActionItem, Task, DailyMetrics } from '../types';
import FacilityStatusPanel from './FacilityStatusPanel';
import ActionItemsList from './ActionItemsList';
import TasksList from './TasksList';
import MetricsPanel from './MetricsPanel';

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

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
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
      await loadData();
    } catch (err) {
      console.error('Failed to update action:', err);
    }
  }

  async function handleTaskUpdate(id: string, status: string) {
    try {
      await api.updateTask(id, { status });
      await loadData();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 600 }}>
        Medical Facility Dashboard
      </h2>

      {facilityStatus && <FacilityStatusPanel status={facilityStatus} />}

      <div className="grid grid-2">
        <ActionItemsList actions={actions} onUpdate={handleActionUpdate} />
        <TasksList tasks={tasks} onUpdate={handleTaskUpdate} />
      </div>

      {metrics && <MetricsPanel metrics={metrics} />}
    </div>
  );
}
