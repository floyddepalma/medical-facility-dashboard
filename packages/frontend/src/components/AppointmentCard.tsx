import { Appointment } from '../types/calendar';

interface AppointmentCardProps {
  appointment: Appointment;
  compact?: boolean;
  onClick: () => void;
}

export default function AppointmentCard({ appointment, compact = false, onClick }: AppointmentCardProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#2563eb'; // blue
      case 'completed':
        return '#16a34a'; // green
      case 'cancelled':
        return '#dc2626'; // red
      case 'no_show':
        return '#ea580c'; // orange
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'no_show':
        return 'No Show';
      default:
        return status;
    }
  };

  const isPast = appointment.endTime < new Date() && appointment.status === 'scheduled';
  const opacity = appointment.status === 'cancelled' ? 0.6 : 1;

  return (
    <div
      className="appointment-card"
      style={{
        borderLeft: `4px solid ${getStatusColor(appointment.status)}`,
        opacity,
        cursor: 'pointer',
        padding: compact ? '8px' : '12px',
        marginBottom: compact ? '4px' : '8px',
        backgroundColor: isPast ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: compact ? '13px' : '14px', marginBottom: '4px' }}>
            {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
          </div>
          <div style={{ fontSize: compact ? '12px' : '13px', color: '#374151', marginBottom: '2px' }}>
            {appointment.patientName}
          </div>
          {!compact && (
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {appointment.appointmentType}
            </div>
          )}
        </div>
        <div style={{ marginLeft: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: `${getStatusColor(appointment.status)}20`,
              color: getStatusColor(appointment.status),
              fontWeight: 500,
            }}
          >
            {getStatusLabel(appointment.status)}
          </span>
        </div>
      </div>
      {isPast && (
        <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px', fontWeight: 500 }}>
          ⚠ Needs status update
        </div>
      )}
    </div>
  );
}
