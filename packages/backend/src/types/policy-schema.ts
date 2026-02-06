/**
 * CareSync Policy Schema Definitions
 * 
 * Defines the structure of scheduling policies for medical facility management.
 * Uses Zod for runtime validation with TypeScript type inference.
 * 
 * NOTE: We call these "policies" not "rules"
 * 
 * This schema is shared between:
 * - CareSync MCP Server (policy validation engine)
 * - CareSync Dashboard Backend (policy storage and API)
 * - CareSync Dashboard Frontend (policy management UI)
 */

import { z } from "zod";

// =============================================================================
// Base Types
// =============================================================================

/** Days of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday */
export const DayOfWeekSchema = z.number().min(0).max(6);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

/** Time window (e.g., 09:00 - 17:00) */
export const TimeWindowSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
}).refine(
  (data) => data.start < data.end,
  { message: "Start time must be before end time" }
);
export type TimeWindow = z.infer<typeof TimeWindowSchema>;

/** Recurrence pattern for repeating policies */
export const RecurrenceSchema = z.object({
  type: z.enum(["daily", "weekly", "biweekly", "monthly", "once"]),
  daysOfWeek: z.array(DayOfWeekSchema).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});
export type Recurrence = z.infer<typeof RecurrenceSchema>;

// =============================================================================
// Policy Types (Discriminated Union)
// =============================================================================

/** AVAILABILITY - When the doctor is working */
export const AvailabilityPolicySchema = z.object({
  policyType: z.literal("AVAILABILITY"),
  recurrence: RecurrenceSchema,
  timeWindows: z.array(TimeWindowSchema).min(1),
  location: z.string().optional(),
});

/** BLOCK - Time blocks unavailable for appointments (lunch, admin, etc.) */
export const BlockPolicySchema = z.object({
  policyType: z.literal("BLOCK"),
  recurrence: RecurrenceSchema,
  timeWindows: z.array(TimeWindowSchema).min(1),
  reason: z.string().optional(),
  allowOverride: z.boolean().default(false),
});

/** OVERRIDE - One-time exceptions (vacation, special hours) */
export const OverridePolicySchema = z.object({
  policyType: z.literal("OVERRIDE"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  action: z.enum(["block", "available"]),
  timeWindows: z.array(TimeWindowSchema).min(1),
  reason: z.string().optional(),
  priority: z.number().min(1).max(10).default(5),
});

/** DURATION - Default appointment lengths */
export const DurationPolicySchema = z.object({
  policyType: z.literal("DURATION"),
  defaultLength: z.number().min(5).max(480),
  bufferBefore: z.number().min(0).max(60).optional(),
  bufferAfter: z.number().min(0).max(60).optional(),
  maxPerDay: z.number().min(1).max(100).optional(),
  allowVariance: z.boolean().default(true),
  varianceMinutes: z.number().min(0).max(30).default(5),
});

/** APPOINTMENT_TYPE - Define appointment types with durations */
export const AppointmentTypePolicySchema = z.object({
  policyType: z.literal("APPOINTMENT_TYPE"),
  typeName: z.string().min(1),
  duration: z.number().min(5).max(480),
  bufferBefore: z.number().min(0).max(60).optional(),
  bufferAfter: z.number().min(0).max(60).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  requiresRoom: z.boolean().default(true),
  roomType: z.enum(["examination", "treatment", "any"]).optional(),
  maxConcurrent: z.number().min(1).max(10).default(1),
});

/** BOOKING_WINDOW - How far in advance patients can book */
export const BookingWindowPolicySchema = z.object({
  policyType: z.literal("BOOKING_WINDOW"),
  minAdvanceHours: z.number().min(0),
  maxAdvanceDays: z.number().min(1).max(365),
  allowSameDayBooking: z.boolean().default(true),
  cutoffTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

/** CAPACITY - Limit appointments per time period */
export const CapacityPolicySchema = z.object({
  policyType: z.literal("CAPACITY"),
  maxAppointmentsPerHour: z.number().min(1).max(20).optional(),
  maxAppointmentsPerDay: z.number().min(1).max(100).optional(),
  maxNewPatientsPerDay: z.number().min(0).max(50).optional(),
  timeWindow: TimeWindowSchema.optional(),
});

/** PATIENT_TYPE - Different rules for new vs existing patients */
export const PatientTypePolicySchema = z.object({
  policyType: z.literal("PATIENT_TYPE"),
  patientType: z.enum(["new", "existing", "followup", "urgent"]),
  allowedDays: z.array(DayOfWeekSchema).optional(),
  allowedTimeWindows: z.array(TimeWindowSchema).optional(),
  duration: z.number().min(5).max(480).optional(),
  requiresApproval: z.boolean().default(false),
});

// =============================================================================
// Combined Policy Schema
// =============================================================================

export const PolicyDataSchema = z.discriminatedUnion("policyType", [
  AvailabilityPolicySchema,
  BlockPolicySchema,
  OverridePolicySchema,
  DurationPolicySchema,
  AppointmentTypePolicySchema,
  BookingWindowPolicySchema,
  CapacityPolicySchema,
  PatientTypePolicySchema,
]);

export type PolicyData = z.infer<typeof PolicyDataSchema>;

export type PolicyType = 
  | "AVAILABILITY" 
  | "BLOCK" 
  | "OVERRIDE" 
  | "DURATION" 
  | "APPOINTMENT_TYPE" 
  | "BOOKING_WINDOW"
  | "CAPACITY"
  | "PATIENT_TYPE";

// =============================================================================
// Full Policy (with metadata)
// =============================================================================

export interface Policy {
  id: string;
  doctorId: string;
  policyType: PolicyType;
  label: string;
  policyData: PolicyData;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy?: string;
}

// =============================================================================
// Scheduling Action (for validation)
// =============================================================================

export const SchedulingActionSchema = z.object({
  doctorId: z.string(),
  appointmentType: z.string().optional(),
  patientType: z.enum(["new", "existing", "followup", "urgent"]).optional(),
  startTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, "Must be ISO 8601 datetime"),
  duration: z.number().min(5).max(480),
  roomId: z.string().optional(),
  roomType: z.enum(["examination", "treatment", "any"]).optional(),
  overrideConflicts: z.boolean().default(false),
  overrideReason: z.string().optional(),
});

export type SchedulingAction = z.infer<typeof SchedulingActionSchema>;

// =============================================================================
// Policy Validation Result
// =============================================================================

export interface PolicyConflict {
  policyId: string;
  policyType: PolicyType;
  policyLabel: string;
  severity: "error" | "warning" | "info";
  reason: string;
  suggestedResolution?: string;
  canOverride: boolean;
}

export interface PolicyValidationResult {
  valid: boolean;
  conflicts: PolicyConflict[];
  reasoning: string;
  suggestedAlternatives?: Array<{
    startTime: string;
    reason: string;
  }>;
}

// =============================================================================
// Validation Functions
// =============================================================================

export function validatePolicy(data: unknown): 
  | { success: true; data: PolicyData } 
  | { success: false; errors: string[] } 
{
  const result = PolicyDataSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(
    e => `${e.path.join(".")}: ${e.message}`
  );
  return { success: false, errors };
}

export function validateSchedulingAction(data: unknown):
  | { success: true; data: SchedulingAction }
  | { success: false; errors: string[] }
{
  const result = SchedulingActionSchema.safeParse(data);
  
  if (result.success) {
    if (result.data.overrideConflicts && !result.data.overrideReason) {
      return { 
        success: false, 
        errors: ["overrideReason is required when overrideConflicts is true"] 
      };
    }
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(
    e => `${e.path.join(".")}: ${e.message}`
  );
  return { success: false, errors };
}

// =============================================================================
// Policy Type Labels (for UI/explanations)
// =============================================================================

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  AVAILABILITY: "Working Hours",
  BLOCK: "Blocked Time",
  OVERRIDE: "Schedule Override",
  DURATION: "Appointment Duration",
  APPOINTMENT_TYPE: "Appointment Type",
  BOOKING_WINDOW: "Booking Window",
  CAPACITY: "Capacity Limits",
  PATIENT_TYPE: "Patient Type Rules",
};

export const POLICY_TYPE_DESCRIPTIONS: Record<PolicyType, string> = {
  AVAILABILITY: "Define when the doctor is available for appointments",
  BLOCK: "Block time for lunch, admin work, or other non-appointment activities",
  OVERRIDE: "One-time exceptions for vacation, special hours, or events",
  DURATION: "Set default appointment lengths and buffers",
  APPOINTMENT_TYPE: "Define different appointment types with specific durations",
  BOOKING_WINDOW: "Control how far in advance patients can book",
  CAPACITY: "Limit the number of appointments per time period",
  PATIENT_TYPE: "Different rules for new patients, follow-ups, etc.",
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get human-readable explanation of a policy
 */
export function explainPolicy(policy: Policy): string {
  const { policyType, policyData } = policy;
  
  switch (policyType) {
    case "AVAILABILITY":
      const avail = policyData as z.infer<typeof AvailabilityPolicySchema>;
      const days = avail.recurrence.daysOfWeek?.map(d => 
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]
      ).join(", ") || "all days";
      const times = avail.timeWindows.map(tw => `${tw.start}-${tw.end}`).join(", ");
      return `Available ${days} during ${times}`;
      
    case "BLOCK":
      const block = policyData as z.infer<typeof BlockPolicySchema>;
      const blockTimes = block.timeWindows.map(tw => `${tw.start}-${tw.end}`).join(", ");
      return `Blocked ${blockTimes}${block.reason ? ` for ${block.reason}` : ""}`;
      
    case "OVERRIDE":
      const override = policyData as z.infer<typeof OverridePolicySchema>;
      return `${override.action === "block" ? "Blocked" : "Available"} on ${override.date}${override.reason ? ` - ${override.reason}` : ""}`;
      
    case "DURATION":
      const duration = policyData as z.infer<typeof DurationPolicySchema>;
      return `Default ${duration.defaultLength} min appointments${duration.bufferBefore ? ` with ${duration.bufferBefore} min buffer before` : ""}`;
      
    case "APPOINTMENT_TYPE":
      const apptType = policyData as z.infer<typeof AppointmentTypePolicySchema>;
      return `${apptType.typeName}: ${apptType.duration} minutes`;
      
    case "BOOKING_WINDOW":
      const booking = policyData as z.infer<typeof BookingWindowPolicySchema>;
      return `Book ${booking.minAdvanceHours}h to ${booking.maxAdvanceDays}d in advance`;
      
    case "CAPACITY":
      const capacity = policyData as z.infer<typeof CapacityPolicySchema>;
      const limits = [];
      if (capacity.maxAppointmentsPerHour) limits.push(`${capacity.maxAppointmentsPerHour}/hour`);
      if (capacity.maxAppointmentsPerDay) limits.push(`${capacity.maxAppointmentsPerDay}/day`);
      return `Capacity: ${limits.join(", ")}`;
      
    case "PATIENT_TYPE":
      const patientType = policyData as z.infer<typeof PatientTypePolicySchema>;
      return `${patientType.patientType} patients${patientType.requiresApproval ? " (requires approval)" : ""}`;
      
    default:
      return "Unknown policy type";
  }
}

/**
 * Check if two policies conflict with each other
 */
export function policiesConflict(policy1: Policy, policy2: Policy): boolean {
  if (policy1.doctorId !== policy2.doctorId) return false;
  
  if (
    (policy1.policyType === "AVAILABILITY" && policy2.policyType === "BLOCK") ||
    (policy1.policyType === "BLOCK" && policy2.policyType === "AVAILABILITY")
  ) {
    return true;
  }
  
  if (policy1.policyType === "DURATION" && policy2.policyType === "DURATION") {
    return true;
  }
  
  if (policy1.policyType === "BOOKING_WINDOW" && policy2.policyType === "BOOKING_WINDOW") {
    return true;
  }
  
  return false;
}

/**
 * Sort policies by priority (for conflict resolution)
 */
export function sortPoliciesByPriority(policies: Policy[]): Policy[] {
  return [...policies].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    if (a.policyType === "OVERRIDE" && b.policyType !== "OVERRIDE") return -1;
    if (b.policyType === "OVERRIDE" && a.policyType !== "OVERRIDE") return 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}
