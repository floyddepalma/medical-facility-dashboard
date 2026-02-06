import { Appointment } from '../types/calendar';

interface AppointmentCardProps {
  appointment: Appointment;
  compact?: boolean;
  onClick: () => void;
}

export default function AppointmentCard({ appointment, compact = false, onClick }: AppointmentCardProps) {
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    scheduled: { color: 'var(--color-primary)', bg: 'var(--color-primary-light)', label: 'Scheduled' },
    completed: { color: 'var(--color-accent-success)', bg: 'var(--color-accent-success-light)', label: 'Completed' },
    cancelled: { color: 'var(--color-accent-danger)', bg: 'var(--color-accent-danger-light)', label: 'Cancelled' },
    no_show: { color: 'var(--color-accent-warn)', bg: 'var(--color-accent-warn-light)', label: 'No Show' },
  };

  const status = statusConfig[appointment.status] || { color: 'var(--text-tertiary)', bg: 'var(--bg-surface-raised)', label: appointment.status };
  const isPast = appointment.endTime < new Date() && appointment.status === 'scheduled';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${appointment.patientName}, ${appointment.appointmentType}, ${formatTime(appointment.startTime)}`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{
        borderLeft: `3px solid ${status.color}`,
        cursor: 'pointer',
        padding: compact ? '8px 12px' : '12px 16px',
        marginBottom: compact ? '4px' : '6px',
        backgroundColor: isPast ? 'var(--color-accent-warn-light)' : 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        opacity: appointment.status === 'cancelled' ? 0.6 : 1,
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: compact ? '13px' : '14px', color: 'var(--text-heading)', marginBottom: '3px' }}>
            {formatTime(appointment.startTime)} – {formatTime(appointment.endTime)}
          </div>
          <div style={{ fontSize: compact ? '12px' : '14px', color: 'var(--text-body)', marginBottom: '2px' }}>
            {appointment.patientName}
          </div>
          {!compact && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {appointment.appointmentType}
            </div>
          )}
        </div>
        <span style={{
          fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
          backgroundColor: status.bg, color: status.color, fontWeight: 600,
          whiteSpace: 'nowrap', marginLeft: '8px',
        }}>
          {status.label}
        </span>
      </div>
      {isPast && (
        <div style={{
          fontSize: '12px', color: 'var(--color-accent-warn)', marginTop: '6px',
          fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <span aria-hidden="true">⚠</span> Needs status update
        </div>
      )}
    </div>
  );
}
