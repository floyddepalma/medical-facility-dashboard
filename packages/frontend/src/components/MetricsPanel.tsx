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
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Patient Metrics
          </h3>
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
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Task Completion
          </h3>
          <div className="status-grid">
            <div className="status-item">
              <div className="value" style={{ color: 'var(--color-primary)' }}>{metrics.tasksCompleted.byAgent}</div>
              <div className="label">AI Agent</div>
            </div>
            <div className="status-item">
              <div className="value" style={{ color: 'var(--color-accent-success)' }}>{metrics.tasksCompleted.byStaff}</div>
              <div className="label">Staff</div>
            </div>
            <div className="status-item">
              <div className="value">{metrics.tasksCompleted.total}</div>
              <div className="label">Total</div>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Room Utilization
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Examination', value: metrics.roomUtilization.examinationRooms },
              { label: 'Treatment', value: metrics.roomUtilization.treatmentRooms },
            ].map(room => {
              const pct = Math.round(room.value);
              return (
                <div key={room.label} style={{
                  padding: '12px 14px', borderRadius: '10px',
                  background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{room.label}</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>{pct}%</span>
                  </div>
                  <div style={{
                    height: '6px', borderRadius: '3px',
                    background: 'var(--border-subtle)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '3px',
                      width: `${pct}%`,
                      background: pct > 80 ? 'var(--color-accent-warn)' : 'var(--color-primary)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
