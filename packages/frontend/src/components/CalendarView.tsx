import { useState, useEffect } from 'react';
import { User, Doctor } from '../types';
import { Appointment, TimeBlock, ViewMode } from '../types/calendar';
import { calendarService } from '../services/calendar';
import { api } from '../services/api';
import DailyCalendar from './DailyCalendar';
import WeeklyCalendar from './WeeklyCalendar';
import AppointmentDetailPanel from './AppointmentDetailPanel';
import DoctorSelector from './DoctorSelector';

interface CalendarViewProps {
  user: User;
}

export default function CalendarView({ user }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    async function initializeDoctors() {
      try {
        if (user.role === 'doctor') {
          if (user.doctorId) setSelectedDoctorId(user.doctorId);
        } else if (user.role === 'medical_assistant' || user.role === 'admin') {
          const response = await api.getDoctors();
          setDoctors(response.doctors);
          if (response.doctors.length > 0) setSelectedDoctorId(response.doctors[0].id);
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
        setError('Failed to load doctor list');
      }
    }
    initializeDoctors();
  }, [user]);

  useEffect(() => {
    if (!selectedDoctorId) return;
    async function loadCalendarData() {
      try {
        setLoading(true);
        setError(null);
        let startDate: Date;
        let endDate: Date;
        if (viewMode === 'weekly') {
          startDate = getWeekStart(selectedDate);
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7);
        } else {
          startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setDate(endDate.getDate() + 1);
          endDate.setHours(0, 0, 0, 0);
        }

        const data = await calendarService.fetchAppointments(
          user.role === 'doctor' ? undefined : selectedDoctorId, startDate, endDate
        );
        setAppointments(data.appointments);
        setTimeBlocks(data.timeBlocks);
      } catch (err: any) {
        console.error('Failed to load calendar:', err);
        setError(err.message || 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    }
    loadCalendarData();
  }, [selectedDoctorId, selectedDate, viewMode, user.role]);

  const stepSize = viewMode === 'weekly' ? 7 : 1;
  const handlePrevious = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - stepSize); setSelectedDate(d); };
  const handleNext = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + stepSize); setSelectedDate(d); };
  const handleToday = () => { setSelectedDate(new Date()); };

  // For weekly view, compute the Monday of the selected week
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday = 1
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const handleAppointmentClick = (id: string) => { setSelectedAppointmentId(id); };
  const handleCloseDetail = () => { setSelectedAppointmentId(null); };
  const selectedAppointment = appointments.find(apt => apt.id === selectedAppointmentId) || null;

  if (loading && appointments.length === 0) {
    return (
      <div className="container">
        <div className="skeleton" style={{ height: '48px', marginBottom: '16px', borderRadius: '10px' }} />
        <div className="skeleton" style={{ height: '600px', borderRadius: '12px' }} />
      </div>
    );
  }

  return (
    <>
      <div className="container">
        {(user.role === 'medical_assistant' || user.role === 'admin') && doctors.length > 0 && (
          <DoctorSelector doctors={doctors} selectedDoctorId={selectedDoctorId} onChange={setSelectedDoctorId} />
        )}

        {/* Navigation Controls */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '20px', backgroundColor: 'var(--bg-surface)', padding: '14px 20px',
          borderRadius: '12px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handlePrevious} className="secondary"
              aria-label={viewMode === 'weekly' ? 'Previous week' : 'Previous day'}
              style={{ padding: '8px 14px', minHeight: '36px', fontSize: '13px' }}>← Prev</button>
            <button onClick={handleToday} className="secondary"
              style={{ padding: '8px 14px', minHeight: '36px', fontSize: '13px', fontWeight: 600 }}>Today</button>
            <button onClick={handleNext} className="secondary"
              aria-label={viewMode === 'weekly' ? 'Next week' : 'Next day'}
              style={{ padding: '8px 14px', minHeight: '36px', fontSize: '13px' }}>Next →</button>
          </div>

          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)' }}>
            {viewMode === 'weekly'
              ? `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            }
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setViewMode('daily')}
              className={viewMode === 'daily' ? 'primary' : 'secondary'}
              style={{ padding: '8px 14px', minHeight: '36px', fontSize: '13px' }}>Daily</button>
            <button onClick={() => setViewMode('weekly')}
              className={viewMode === 'weekly' ? 'primary' : 'secondary'}
              style={{ padding: '8px 14px', minHeight: '36px', fontSize: '13px' }}>Weekly</button>
          </div>
        </div>

        {error && (
          <div className="error" role="alert" style={{ marginBottom: '20px' }}>
            {error}
            <button onClick={() => window.location.reload()} className="secondary"
              style={{ marginLeft: '12px', fontSize: '12px', padding: '4px 12px', minHeight: '28px' }}>Retry</button>
          </div>
        )}

        {viewMode === 'daily' && (
          <DailyCalendar date={selectedDate} appointments={appointments}
            timeBlocks={timeBlocks} onAppointmentClick={handleAppointmentClick} />
        )}

        {viewMode === 'weekly' && (
          <WeeklyCalendar startDate={weekStart} appointments={appointments}
            timeBlocks={timeBlocks} onAppointmentClick={handleAppointmentClick} />
        )}

        <AppointmentDetailPanel appointment={selectedAppointment} onClose={handleCloseDetail} />
      </div>
    </>
  );
}
