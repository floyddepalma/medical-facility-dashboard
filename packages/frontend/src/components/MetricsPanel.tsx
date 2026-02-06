import { DailyMetrics } from '../types';

interface Props {
  metrics: DailyMetrics;
}

export default function MetricsPanel({ metrics }: Props) {
  return (
    <div className="card">
      <h2>Daily Operations Summary</h2>

      <div className="grid grid-3">
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Patient Metrics</h3>
          <div className="status-grid">
            <div className="status-item">
              <div className="value">{metrics.patientsSeen}</div>
              <div className="label">Patients Seen</div>
            </div>
            <div className="status-item">
              <div className="value">{Math.round(metrics.averageWaitTime)}</div>
              <div className="label">Avg Wait (min)</div>
            </div>
            <div className="status-item">
              <div className="value">{Math.round(metrics.averageVisitDuration)}</div>
              <div className="label">Avg Visit (min)</div>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Task Completion</h3>
          <div className="status-grid">
            <div className="status-item">
              <div className="value" style={{ color: '#3b82f6' }}>{metrics.tasksCompleted.byAgent}</div>
              <div className="label">By AI Agent</div>
            </div>
            <div className="status-item">
              <div className="value" style={{ color: '#10b981' }}>{metrics.tasksCompleted.byStaff}</div>
              <div className="label">By Staff</div>
            </div>
            <div className="status-item">
              <div className="value">{metrics.tasksCompleted.total}</div>
              <div className="label">Total</div>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Room Utilization</h3>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Examination Rooms</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
              {Math.round(metrics.roomUtilization.examinationRooms)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Treatment Rooms</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
              {Math.round(metrics.roomUtilization.treatmentRooms)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
