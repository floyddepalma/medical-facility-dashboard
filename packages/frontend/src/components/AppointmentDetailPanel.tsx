import { Appointment } from '../types/calendar';

interface AppointmentDetailPanelProps {
  appointment: Appointment | null;
  onClose: () => void;
}

export default function AppointmentDetailPanel({ appointment, onClose }: AppointmentDetailPanelProps) {
  if (!appointment) return null;

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#2563eb';
      case 'completed':
        return '#16a34a';
      case 'cancelled':
        return '#dc2626';
      case 'no_show':
        return '#ea580c';
      default:
        return '#6b7280';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '400px',
        height: '100vh',
        backgroundColor: 'white',
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Appointment Details</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status */}
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
              STATUS
            </div>
            <span
              style={{
                display: 'inline-block',
                fontSize: '13px',
                padding: '4px 12px',
                borderRadius: '16px',
                backgroundColor: `${getStatusColor(appointment.status)}20`,
                color: getStatusColor(appointment.status),
                fontWeight: 600,
              }}
            >
              {appointment.status.toUpperCase()}
            </span>
          </div>

          {/* Patient Information */}
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
              PATIENT
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              {appointment.patientName}
            </div>
            {appointment.patientContact && (
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                {appointment.patientContact}
              </div>
            )}
          </div>

          {/* Appointment Type */}
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
              TYPE
            </div>
            <div style={{ fontSize: '14px', color: '#111827' }}>
              {appointment.appointmentType}
            </div>
          </div>

          {/* Time */}
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
              TIME
            </div>
            <div style={{ fontSize: '14px', color: '#111827' }}>
              {formatDateTime(appointment.startTime)}
            </div>
            <div style={{ fontSize: '14px', color: '#111827', marginTop: '4px' }}>
              to {formatDateTime(appointment.endTime)}
            </div>
          </div>

          {/* Duration */}
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
              DURATION
            </div>
            <div style={{ fontSize: '14px', color: '#111827' }}>
              {appointment.duration} minutes
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
                NOTES
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                }}
              >
                {appointment.notes}
              </div>
            </div>
          )}

          {/* Policy ID */}
          {appointment.policyId && (
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
                SCHEDULING POLICY
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', fontFamily: 'monospace' }}>
                {appointment.policyId}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div style={{ paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
              Created: {formatDateTime(appointment.createdAt)}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              Updated: {formatDateTime(appointment.updatedAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
