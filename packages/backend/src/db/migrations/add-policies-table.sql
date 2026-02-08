-- Add policies table for scheduling policy management
-- Used by CareSync MCP Server and Cara Autonomous Agent

CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN (
    'AVAILABILITY', 'BLOCK', 'OVERRIDE', 'DURATION', 
    'APPOINTMENT_TYPE', 'BOOKING_WINDOW', 'CAPACITY', 'PATIENT_TYPE'
  )),
  label VARCHAR(255) NOT NULL,
  policy_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255) NOT NULL,
  last_modified_by VARCHAR(255),
  CONSTRAINT fk_policy_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_policies_doctor ON policies(doctor_id);
CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_policies_active ON policies(is_active);
CREATE INDEX IF NOT EXISTS idx_policies_doctor_type ON policies(doctor_id, policy_type);
