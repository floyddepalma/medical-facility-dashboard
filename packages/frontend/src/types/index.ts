// Shared types matching backend
export type UserRole = 'doctor' | 'medical_assistant' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  doctorId?: string;
  managedDoctorIds?: string[];
}

export interface Room {
  id: string;
  name: string;
  type: 'examination' | 'treatment';
  status: 'available' | 'occupied' | 'needs_cleaning' | 'maintenance';
  currentDoctorId?: string;
  estimatedAvailableAt?: string;
  lastUpdated: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  status: 'operational' | 'in_use' | 'needs_maintenance' | 'offline';
}

export interface ActionItem {
  id: string;
  type: string;
  urgency: 'urgent' | 'normal' | 'low';
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  timeWaiting: number;
  createdAt: string;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  notes: string[];
}

export interface FacilityStatus {
  timestamp: string;
  operatingHours: {
    open: string;
    close: string;
  };
  patientCounts: {
    waiting: number;
    inExamination: number;
    inTreatment: number;
    checkingOut: number;
  };
  roomSummary: {
    examinationRooms: {
      total: number;
      available: number;
      occupied: number;
      needsCleaning: number;
    };
    treatmentRooms: {
      total: number;
      available: number;
      occupied: number;
      needsCleaning: number;
    };
  };
  equipmentSummary: {
    operational: number;
    inUse: number;
    needsMaintenance: number;
    offline: number;
  };
  actionItemCounts: {
    urgent: number;
    normal: number;
    low: number;
  };
}

export interface DailyMetrics {
  date: string;
  patientsSeen: number;
  averageVisitDuration: number;
  averageWaitTime: number;
  tasksCompleted: {
    byStaff: number;
    byAgent: number;
    total: number;
  };
  roomUtilization: {
    examinationRooms: number;
    treatmentRooms: number;
  };
}
