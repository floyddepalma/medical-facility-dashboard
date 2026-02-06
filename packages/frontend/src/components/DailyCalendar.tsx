import { Appointment, TimeBlock } from '../types/calendar';
import AppointmentCard from './AppointmentCard';

interface DailyCalendarProps {
  date: Date;
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  onAppointmentClick: (id: string) => void;
}

export default function DailyCalendar({ date, appointments, timeBlocks, onAppointmentClick }: DailyCalendarProps) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 6); // 6 AM to 8 PM

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const isAppointmentInHour = (apt: Appointment, hour: number) => {
    const aptHour = apt.startTime.getHours();
    return aptHour === hour;
  };

  const isTimeBlockInHour = (tb: TimeBlock, hour: number) => {
    const tbHour = tb.startTime.getHours();
    return tbHour === hour;
  };

  const checkOverlap = (apt: Appointment) => {
    return appointments.some(other => 
      other.id !== apt.id &&
      apt.startTime < other.endTime &&
      apt.endTime > other.startTime
    );
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '16px' }}>
      <div style={{ marginBottom: '16px', fontWeight: 600, fontSize: '18px' }}>
        {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {hours.map(hour => {
          const hourAppointments = appointments.filter(apt => isAppointmentInHour(apt, hour));
          const hourTimeBlocks = timeBlocks.filter(tb => isTimeBlockInHour(tb, hour));

          return (
            <div
              key={hour}
              style={{
                display: 'flex',
                minHeight: '80px',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <div
                style={{
                  width: '80px',
                  padding: '8px',
                  fontSize: '13px',
                  color: '#6b7280',
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {formatHour(hour)}
              </div>
              <div style={{ flex: 1, padding: '8px', position: 'relative' }}>
                {hourTimeBlocks.map(tb => (
                  <div
                    key={tb.id}
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '2px dashed var(--border-color-hover)',
                      borderRadius: '4px',
                      padding: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {tb.reason.charAt(0).toUpperCase() + tb.reason.slice(1)}
                    </div>
                    {tb.description && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {tb.description}
                      </div>
                    )}
                  </div>
                ))}
                {hourAppointments.map(apt => {
                  const hasOverlap = checkOverlap(apt);
                  return (
                    <div
                      key={apt.id}
                      style={{
                        position: 'relative',
                        border: hasOverlap ? '2px solid #ef4444' : 'none',
                        borderRadius: hasOverlap ? '4px' : '0',
                        padding: hasOverlap ? '4px' : '0',
                      }}
                    >
                      {hasOverlap && (
                        <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, marginBottom: '4px' }}>
                          ⚠ CONFLICT
                        </div>
                      )}
                      <AppointmentCard
                        appointment={apt}
                        onClick={() => onAppointmentClick(apt.id)}
                      />
                    </div>
                  );
                })}
                {hourAppointments.length === 0 && hourTimeBlocks.length === 0 && (
                  <div style={{ color: '#d1d5db', fontSize: '13px', fontStyle: 'italic' }}>
                    No appointments
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
