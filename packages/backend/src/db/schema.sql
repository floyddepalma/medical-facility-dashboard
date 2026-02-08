-- Medical Facility Dashboard Database Schema

-- Doctors table (create first since users references it)
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  specialization VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('doctor', 'medical_assistant', 'admin')),
  doctor_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

-- User-Doctor mapping for medical assistants
CREATE TABLE IF NOT EXISTS user_managed_doctors (
  user_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  PRIMARY KEY (user_id, doctor_id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_managed_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('examination', 'treatment')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('available', 'occupied', 'needs_cleaning', 'maintenance')),
  current_doctor_id UUID,
  current_patient_id VARCHAR(255),
  estimated_available_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_current_doctor FOREIGN KEY (current_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

-- Equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  room_id UUID,
  status VARCHAR(50) NOT NULL CHECK (status IN ('operational', 'in_use', 'needs_maintenance', 'offline')),
  last_maintenance_date DATE NOT NULL,
  next_maintenance_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Action items table
CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('policy_conflict', 'equipment_issue', 'agent_request', 'manual', 'room_issue')),
  urgency VARCHAR(50) NOT NULL CHECK (urgency IN ('urgent', 'normal', 'low')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  context JSONB,
  reasoning TEXT,
  doctor_id UUID,
  room_id UUID,
  equipment_id UUID,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  CONSTRAINT fk_action_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_action_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  CONSTRAINT fk_action_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL,
  CONSTRAINT fk_assigned_user FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_completed_user FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  assignee VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  doctor_id UUID,
  room_id UUID,
  equipment_id UUID,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  notes JSONB DEFAULT '[]'::jsonb,
  created_by VARCHAR(255) NOT NULL,
  CONSTRAINT fk_task_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type VARCHAR(255) NOT NULL,
  resource_type VARCHAR(255) NOT NULL,
  resource_id VARCHAR(255),
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Patient flow tracking (anonymized)
CREATE TABLE IF NOT EXISTS patient_flow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('waiting', 'in_examination', 'in_treatment', 'checking_out', 'completed')),
  doctor_id UUID,
  room_id UUID,
  arrival_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  service_start_time TIMESTAMP WITH TIME ZONE,
  service_end_time TIMESTAMP WITH TIME ZONE,
  checkout_time TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_patient_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_patient_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Appointments table (for calendar view)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  patient_contact VARCHAR(255),
  appointment_type VARCHAR(255) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  policy_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Time blocks table (blocked time periods)
CREATE TABLE IF NOT EXISTS time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('lunch', 'meeting', 'personal', 'other')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_timeblock_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_type ON rooms(type);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_room ON equipment(room_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_urgency ON action_items(urgency);
CREATE INDEX idx_action_items_doctor ON action_items(doctor_id);
CREATE INDEX idx_action_items_created_at ON action_items(created_at);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_tasks_doctor ON tasks(doctor_id);
CREATE INDEX idx_tasks_start_time ON tasks(start_time);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_patient_flow_status ON patient_flow(status);
CREATE INDEX idx_patient_flow_doctor ON patient_flow(doctor_id);
CREATE INDEX idx_patient_flow_arrival ON patient_flow(arrival_time);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, start_time);
CREATE INDEX idx_time_blocks_doctor ON time_blocks(doctor_id);
CREATE INDEX idx_time_blocks_start_time ON time_blocks(start_time);
CREATE INDEX idx_time_blocks_doctor_date ON time_blocks(doctor_id, start_time);

-- View for daily metrics calculation
CREATE OR REPLACE VIEW daily_metrics_view AS
SELECT
  DATE(pf.arrival_time) as date,
  COUNT(DISTINCT pf.patient_id) as patients_seen,
  AVG(EXTRACT(EPOCH FROM (pf.checkout_time - pf.arrival_time)) / 60) as avg_visit_duration,
  AVG(EXTRACT(EPOCH FROM (pf.service_start_time - pf.arrival_time)) / 60) as avg_wait_time,
  COUNT(CASE WHEN t.assignee != 'agent' THEN 1 END) as tasks_by_staff,
  COUNT(CASE WHEN t.assignee = 'agent' THEN 1 END) as tasks_by_agent,
  COUNT(t.id) as total_tasks
FROM patient_flow pf
LEFT JOIN tasks t ON DATE(t.start_time) = DATE(pf.arrival_time) AND t.status = 'completed'
WHERE pf.status = 'completed'
GROUP BY DATE(pf.arrival_time);

-- Room utilization tracking table
CREATE TABLE IF NOT EXISTS room_utilization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  source VARCHAR(50) DEFAULT 'vision' CHECK (source IN ('vision', 'manual', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_utilization_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Indexes for room utilization
CREATE INDEX IF NOT EXISTS idx_room_utilization_room ON room_utilization(room_id);
CREATE INDEX IF NOT EXISTS idx_room_utilization_started ON room_utilization(started_at);
CREATE INDEX IF NOT EXISTS idx_room_utilization_room_date ON room_utilization(room_id, started_at);
