import { useState, useEffect } from 'react';
import { User, Doctor } from '../types';
import { Appointment, TimeBlock, ViewMode } from '../types/calendar';
import { calendarService } from '../services/calendar';
import { api } from '../services/api';
import DailyCalendar from './DailyCalendar';
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
  const [doctorName, setDoctorName] = useState<string>('');

  // Initialize doctor selection based on user role
  useEffect(() => {
    async function initializeDoctors() {
      try {
        if (user.role === 'doctor') {
          // Doctors view their own calendar
          if (user.doctorId) {
            setSelectedDoctorId(user.doctorId);
          }
        } else if (user.role === 'medical_assistant' || user.role === 'admin') {
          // Medical assistants and admins need to select a doctor
          const response = await api.getDoctors();
          setDoctors(response.doctors);
          
          // Select first doctor by default
          if (response.doctors.length > 0) {
            setSelectedDoctorId(response.doctors[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
        setError('Failed to load doctor list');
      }
    }

    initializeDoctors();
  }, [user]);

  // Load calendar data when doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId) return;

    async function loadCalendarData() {
      try {
        setLoading(true);
        setError(null);

        // Calculate date range based on view mode
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(selectedDate);
        if (viewMode === 'daily') {
          endDate.setDate(endDate.getDate() + 1);
        } else {
          endDate.setDate(endDate.getDate() + 7);
        }
        endDate.setHours(0, 0, 0, 0);

        const data = await calendarService.fetchAppointments(
          user.role === 'doctor' ? undefined : selectedDoctorId,
          startDate,
          endDate
        );

        setAppointments(data.appointments);
        setTimeBlocks(data.timeBlocks);
        setDoctorName(data.doctor.name);
      } catch (err: any) {
        console.error('Failed to load calendar:', err);
        setError(err.message || 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    }

    loadCalendarData();
  }, [selectedDoctorId, selectedDate, viewMode, user.role]);

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleAppointmentClick = (id: string) => {
    setSelectedAppointmentId(id);
  };

  const handleCloseDetail = () => {
    setSelectedAppointmentId(null);
  };

  const selectedAppointment = appointments.find(apt => apt.id === selectedAppointmentId) || null;

  if (loading && appointments.length === 0) {
    return (
      <div className="container" style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          Loading calendar...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container" style={{ padding: '24px' }}>
        {/* Doctor Selector for Medical Assistants and Admins */}
        {(user.role === 'medical_assistant' || user.role === 'admin') && doctors.length > 0 && (
          <DoctorSelector
            doctors={doctors}
            selectedDoctorId={selectedDoctorId}
            onChange={setSelectedDoctorId}
          />
        )}

        {/* Navigation Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            backgroundColor: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePreviousDay} className="secondary">
              ← Previous
            </button>
            <button onClick={handleToday} className="secondary">
              Today
            </button>
            <button onClick={handleNextDay} className="secondary">
              Next →
            </button>
          </div>

          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewMode('daily')}
              className={viewMode === 'daily' ? 'primary' : 'secondary'}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={viewMode === 'weekly' ? 'primary' : 'secondary'}
              disabled
              title="Weekly view coming soon"
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '16px',
              color: '#991b1b',
            }}
          >
            <strong>Error:</strong> {error}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginLeft: '12px',
                padding: '4px 12px',
                fontSize: '13px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Calendar Display */}
        {viewMode === 'daily' && (
          <DailyCalendar
            date={selectedDate}
            appointments={appointments}
            timeBlocks={timeBlocks}
            onAppointmentClick={handleAppointmentClick}
          />
        )}

        {/* Appointment Detail Panel */}
        <AppointmentDetailPanel
          appointment={selectedAppointment}
          onClose={handleCloseDetail}
        />
      </div>
    </>
  );
}
