import { Appointment, TimeBlock } from '../types/calendar';
import AppointmentCard from './AppointmentCard';

interface DailyCalendarProps {
  date: Date;
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  onAppointmentClick: (id: string) => void;
}

export default function DailyCalendar({ date, appointments, timeBlocks, onAppointmentClick }: DailyCalendarProps) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 6);

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const isAppointmentInHour = (apt: Appointment, hour: number) => apt.startTime.getHours() === hour;
  const isTimeBlockInHour = (tb: TimeBlock, hour: number) => tb.startTime.getHours() === hour;
  const checkOverlap = (apt: Appointment) =>
    appointments.some(other => other.id !== apt.id && apt.startTime < other.endTime && apt.endTime > other.startTime);

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const currentHour = now.getHours();

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)', borderRadius: '12px',
      border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border-default)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-heading)' }}>
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {hours.map(hour => {
          const hourAppointments = appointments.filter(apt => isAppointmentInHour(apt, hour));
          const hourTimeBlocks = timeBlocks.filter(tb => isTimeBlockInHour(tb, hour));
          const isCurrentHour = isToday && hour === currentHour;

          return (
            <div key={hour} style={{
              display: 'flex', minHeight: '80px',
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: isCurrentHour ? 'var(--color-primary-light)' : 'transparent',
              transition: 'background-color 0.15s ease',
            }}>
              <div style={{
                width: '80px', padding: '10px 12px', fontSize: '12px',
                color: isCurrentHour ? 'var(--color-primary)' : 'var(--text-tertiary)',
                fontWeight: isCurrentHour ? 600 : 500, flexShrink: 0,
                borderRight: '1px solid var(--border-subtle)',
              }}>
                {formatHour(hour)}
              </div>
              <div style={{ flex: 1, padding: '8px 12px', position: 'relative' }}>
                {hourTimeBlocks.map(tb => (
                  <div key={tb.id} style={{
                    backgroundColor: 'var(--bg-surface-raised)',
                    border: '1px dashed var(--border-default)', borderRadius: '8px',
                    padding: '8px 12px', marginBottom: '6px',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>
                      {tb.reason.charAt(0).toUpperCase() + tb.reason.slice(1)}
                    </div>
                    {tb.description && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {tb.description}
                      </div>
                    )}
                  </div>
                ))}
                {hourAppointments.map(apt => {
                  const hasOverlap = checkOverlap(apt);
                  return (
                    <div key={apt.id} style={{
                      position: 'relative',
                      border: hasOverlap ? '2px solid var(--color-accent-danger)' : 'none',
                      borderRadius: hasOverlap ? '8px' : '0', padding: hasOverlap ? '4px' : '0',
                    }}>
                      {hasOverlap && (
                        <div style={{
                          fontSize: '11px', color: 'var(--color-accent-danger)',
                          fontWeight: 600, marginBottom: '4px',
                          display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          <span aria-hidden="true">⚠</span> CONFLICT
                        </div>
                      )}
                      <AppointmentCard appointment={apt} onClick={() => onAppointmentClick(apt.id)} />
                    </div>
                  );
                })}
                {hourAppointments.length === 0 && hourTimeBlocks.length === 0 && (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontStyle: 'italic', padding: '4px 0' }}>
                    —
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
