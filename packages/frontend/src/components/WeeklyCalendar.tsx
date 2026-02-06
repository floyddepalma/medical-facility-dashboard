import { Appointment, TimeBlock } from '../types/calendar';
import AppointmentCard from './AppointmentCard';

interface WeeklyCalendarProps {
  startDate: Date;
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  onAppointmentClick: (id: string) => void;
}

export default function WeeklyCalendar({ startDate, appointments, timeBlocks, onAppointmentClick }: WeeklyCalendarProps) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 6);
  const now = new Date();
  const todayStr = now.toDateString();
  const currentHour = now.getHours();

  // Build 7 days starting from startDate (Monday of the week)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour} ${period}`;
  };

  const formatDayHeader = (date: Date) => {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.getDate();
    return { weekday, day };
  };

  const getAppointmentsForSlot = (date: Date, hour: number) =>
    appointments.filter(apt => apt.startTime.toDateString() === date.toDateString() && apt.startTime.getHours() === hour);

  const getTimeBlocksForSlot = (date: Date, hour: number) =>
    timeBlocks.filter(tb => tb.startTime.toDateString() === date.toDateString() && tb.startTime.getHours() === hour);

  const getDayAppointmentCount = (date: Date) =>
    appointments.filter(apt => apt.startTime.toDateString() === date.toDateString()).length;

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)', borderRadius: '12px',
      border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Scrollable container for both header and body */}
      <div style={{ overflowY: 'auto', maxHeight: '70vh' }}>
        {/* Column Headers - sticky within scroll container */}
        <div style={{
          display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)',
          borderBottom: '1px solid var(--border-default)',
          position: 'sticky', top: 0, zIndex: 2,
          backgroundColor: 'var(--bg-surface)',
        }}>
          <div style={{ padding: '12px 8px', borderRight: '1px solid var(--border-subtle)' }} />
          {days.map((date, i) => {
            const { weekday, day } = formatDayHeader(date);
            const isToday = date.toDateString() === todayStr;
            const count = getDayAppointmentCount(date);
            return (
              <div key={i} style={{
                padding: '10px 6px', textAlign: 'center',
                borderRight: i < 6 ? '1px solid var(--border-subtle)' : 'none',
                backgroundColor: isToday ? 'var(--color-primary-light)' : 'transparent',
              }}>
                <div style={{
                  fontSize: '11px', fontWeight: 500, textTransform: 'uppercase',
                  color: isToday ? 'var(--color-primary)' : 'var(--text-tertiary)',
                  letterSpacing: '0.05em',
                }}>{weekday}</div>
                <div style={{
                  fontSize: '20px', fontWeight: 700, lineHeight: 1.3,
                  color: isToday ? 'var(--color-primary)' : 'var(--text-heading)',
                }}>{day}</div>
                {count > 0 && (
                  <div style={{
                    fontSize: '10px', fontWeight: 600, marginTop: '2px',
                    color: 'var(--text-tertiary)',
                  }}>{count} appt{count !== 1 ? 's' : ''}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time Grid */}
        <div>
        {hours.map(hour => {
          const isCurrentHour = todayStr === now.toDateString() && hour === currentHour;
          return (
            <div key={hour} style={{
              display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)',
              minHeight: '64px', borderBottom: '1px solid var(--border-subtle)',
            }}>
              {/* Hour label */}
              <div style={{
                padding: '6px 6px', fontSize: '11px', textAlign: 'right',
                color: isCurrentHour ? 'var(--color-primary)' : 'var(--text-tertiary)',
                fontWeight: isCurrentHour ? 600 : 400,
                borderRight: '1px solid var(--border-subtle)', flexShrink: 0,
              }}>{formatHour(hour)}</div>

              {/* Day cells */}
              {days.map((date, di) => {
                const slotAppts = getAppointmentsForSlot(date, hour);
                const slotBlocks = getTimeBlocksForSlot(date, hour);
                const isToday = date.toDateString() === todayStr;
                const isCurrent = isToday && hour === currentHour;

                return (
                  <div key={di} style={{
                    padding: '4px 4px', position: 'relative',
                    borderRight: di < 6 ? '1px solid var(--border-subtle)' : 'none',
                    backgroundColor: isCurrent ? 'var(--color-primary-light)' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}>
                    {slotBlocks.map(tb => (
                      <div key={tb.id} style={{
                        backgroundColor: 'var(--bg-surface-raised)',
                        border: '1px dashed var(--border-default)', borderRadius: '4px',
                        padding: '3px 6px', marginBottom: '3px', fontSize: '11px',
                        color: 'var(--text-secondary)', fontWeight: 500,
                      }}>
                        {tb.reason.charAt(0).toUpperCase() + tb.reason.slice(1)}
                      </div>
                    ))}
                    {slotAppts.map(apt => (
                      <AppointmentCard key={apt.id} appointment={apt} compact onClick={() => onAppointmentClick(apt.id)} />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
