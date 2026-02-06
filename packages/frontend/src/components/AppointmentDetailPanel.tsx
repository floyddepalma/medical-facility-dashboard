import { Appointment } from '../types/calendar';

interface AppointmentDetailPanelProps {
  appointment: Appointment | null;
  onClose: () => void;
}

export default function AppointmentDetailPanel({ appointment, onClose }: AppointmentDetailPanelProps) {
  if (!appointment) return null;

  const formatDateTime = (date: Date) =>
    date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

  const statusConfig: Record<string, { color: string; bg: string }> = {
    scheduled: { color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
    completed: { color: 'var(--color-accent-success)', bg: 'var(--color-accent-success-light)' },
    cancelled: { color: 'var(--color-accent-danger)', bg: 'var(--color-accent-danger-light)' },
    no_show: { color: 'var(--color-accent-warn)', bg: 'var(--color-accent-warn-light)' },
  };
  const status = statusConfig[appointment.status] || { color: 'var(--text-tertiary)', bg: 'var(--bg-surface-raised)' };

  const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-heading)', lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 999, transition: 'opacity 0.2s ease',
      }} />

      {/* Panel */}
      <div role="dialog" aria-label="Appointment details" style={{
        position: 'fixed', top: 0, right: 0, width: '420px', height: '100vh',
        backgroundColor: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)',
        zIndex: 1000, overflowY: 'auto',
      }}>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)' }}>
              Appointment Details
            </h2>
            <button onClick={onClose} aria-label="Close panel" style={{
              background: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)',
              width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', color: 'var(--text-secondary)', padding: 0, minHeight: 'auto',
              transition: 'all 0.15s ease',
            }}>
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <DetailRow label="Status">
              <span style={{
                display: 'inline-block', fontSize: '12px', padding: '4px 12px',
                borderRadius: '16px', backgroundColor: status.bg, color: status.color,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {appointment.status.replace('_', ' ')}
              </span>
            </DetailRow>

            <DetailRow label="Patient">
              <div style={{ fontWeight: 600, fontSize: '16px' }}>{appointment.patientName}</div>
              {appointment.patientContact && (
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {appointment.patientContact}
                </div>
              )}
            </DetailRow>

            <DetailRow label="Type">
              {appointment.appointmentType}
            </DetailRow>

            <DetailRow label="Time">
              <div>{formatDateTime(appointment.startTime)}</div>
              <div style={{ marginTop: '2px' }}>to {formatDateTime(appointment.endTime)}</div>
            </DetailRow>

            <DetailRow label="Duration">
              {appointment.duration} minutes
            </DetailRow>

            {appointment.notes && (
              <DetailRow label="Notes">
                <div style={{
                  padding: '12px 14px', borderRadius: '8px',
                  background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)',
                  fontSize: '14px', lineHeight: 1.6, color: 'var(--text-body)',
                }}>
                  {appointment.notes}
                </div>
              </DetailRow>
            )}

            {appointment.policyId && (
              <DetailRow label="Scheduling Policy">
                <code style={{
                  fontSize: '12px', color: 'var(--text-secondary)',
                  background: 'var(--bg-surface-raised)', padding: '2px 8px',
                  borderRadius: '4px', fontFamily: 'monospace',
                }}>
                  {appointment.policyId}
                </code>
              </DetailRow>
            )}

            <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                Created {formatDateTime(appointment.createdAt)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Updated {formatDateTime(appointment.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
