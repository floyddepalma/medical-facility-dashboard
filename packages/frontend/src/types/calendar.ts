// Calendar-specific data model types for frontend

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type TimeBlockReason = 'lunch' | 'meeting' | 'personal' | 'other';
export type ViewMode = 'daily' | 'weekly';

export interface Appointment {
  id: string;
  doctorId: string;
  patientName: string;
  patientContact?: string;
  appointmentType: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: AppointmentStatus;
  notes?: string;
  policyId?: string;
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
  viewMode: ViewMode;
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

export interface CalendarResponse {
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  doctor: {
    id: string;
    name: string;
  };
}
