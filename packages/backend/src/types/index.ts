// Core data model types

export type UserRole = 'doctor' | 'medical_assistant' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  doctorId?: string;
  managedDoctorIds?: string[];
  createdAt: Date;
  lastLogin: Date;
}

export interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  active: boolean;
}

export type RoomType = 'examination' | 'treatment';
export type RoomStatus = 'available' | 'occupied' | 'needs_cleaning' | 'maintenance';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  currentDoctorId?: string;
  currentPatientId?: string;
  equipment?: Equipment[];
  estimatedAvailableAt?: Date;
  lastUpdated: Date;
}

export type EquipmentStatus = 'operational' | 'in_use' | 'needs_maintenance' | 'offline';

export interface Equipment {
  id: string;
  name: string;
  type: string;
  roomId?: string;
  status: EquipmentStatus;
  lastMaintenanceDate: Date;
  nextMaintenanceDate: Date;
}

export type ActionItemType = 'policy_conflict' | 'equipment_issue' | 'agent_request' | 'manual' | 'room_issue';
export type ActionItemUrgency = 'urgent' | 'normal' | 'low';
export type ActionItemStatus = 'pending' | 'in_progress' | 'completed';

export interface ActionItem {
  id: string;
  type: ActionItemType;
  urgency: ActionItemUrgency;
  title: string;
  description: string;
  context: Record<string, any>;
  reasoning?: string;
  doctorId?: string;
  roomId?: string;
  equipmentId?: string;
  status: ActionItemStatus;
  assignedTo?: string;
  createdAt: Date;
  createdBy: string;
  completedAt?: Date;
  completedBy?: string;
  timeWaiting: number;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface Task {
  id: string;
  type: string;
  description: string;
  assignee: string;
  status: TaskStatus;
  doctorId?: string;
  roomId?: string;
  equipmentId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  notes: string[];
  createdBy: string;
}

export type PolicyType = 
  | 'AVAILABILITY'
  | 'BLOCK'
  | 'OVERRIDE'
  | 'DURATION'
  | 'APPOINTMENT_TYPE'
  | 'BOOKING_WINDOW';

export interface Policy {
  id: string;
  doctorId: string;
  type: PolicyType;
  active: boolean;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyConflict {
  policyId: string;
  policyType: PolicyType;
  reason: string;
  suggestedResolution?: string;
}

export interface PolicyCheckResult {
  valid: boolean;
  conflicts: PolicyConflict[];
  reasoning: string;
}

export interface FacilityStatus {
  timestamp: Date;
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
  date: Date;
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
  taskBreakdown: Record<string, number>;
  comparisonTo7DayAverage: {
    patientsSeen: number;
    averageVisitDuration: number;
    averageWaitTime: number;
  };
}

export type AgentStatus = 'active' | 'idle' | 'processing' | 'error' | 'offline';

export interface AgentStatusInfo {
  status: AgentStatus;
  lastActivity: Date;
  uptime: number;
  currentTaskCount: number;
  errorMessage?: string;
}

// Error response type
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
    retryable: boolean;
    timestamp: Date;
  };
}
