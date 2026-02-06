// Calendar-specific data model types

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type TimeBlockReason = 'lunch' | 'meeting' | 'personal' | 'other';

export interface Appointment {
  id: string;
  doctorId: string;
  patientName: string;
  patientContact?: string; // Only visible to authorized roles
  appointmentType: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  status: AppointmentStatus;
  notes?: string;
  policyId?: string; // Associated scheduling policy
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeBlock {
  id: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  reason: TimeBlockReason;
  description?: string;
}

export interface CalendarViewState {
  viewMode: 'daily' | 'weekly';
  selectedDate: Date;
  selectedDoctorId: string;
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  loading: boolean;
  error: string | null;
  selectedAppointmentId: string | null;
}

export interface AppointmentEvent {
  type: 'created' | 'updated' | 'cancelled';
  doctorId: string;
  appointmentId: string;
  appointment?: Appointment;
  changes?: Partial<Appointment>;
  timestamp: Date;
}

export interface CalendarQueryParams {
  doctorId: string;
  startDate: Date;
  endDate: Date;
}

export interface CalendarResponse {
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  doctor: {
    id: string;
    name: string;
  };
}
