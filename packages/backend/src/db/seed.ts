import bcrypt from 'bcrypt';
import { pool } from './connection.js';

async function seed() {
  try {
    console.log('Seeding database...');

    // Create doctors
    const doctorResult = await pool.query(
      `INSERT INTO doctors (name, specialization, active)
       VALUES 
         ('Dr. Sarah Johnson', 'Family Medicine', true),
         ('Dr. Michael Chen', 'Cardiology', true),
         ('Dr. Emily Rodriguez', 'Pediatrics', true)
       RETURNING id, name`
    );

    console.log('✓ Created doctors:', doctorResult.rows.map(r => r.name).join(', '));

    const [doctor1, doctor2, doctor3] = doctorResult.rows;

    // Create users
    const passwordHash = await bcrypt.hash('password123', 10);

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, doctor_id)
       VALUES 
         ('admin@clinic.com', $1, 'Admin User', 'admin', NULL),
         ('sarah.johnson@clinic.com', $1, 'Dr. Sarah Johnson', 'doctor', $2),
         ('michael.chen@clinic.com', $1, 'Dr. Michael Chen', 'doctor', $3),
         ('emily.rodriguez@clinic.com', $1, 'Dr. Emily Rodriguez', 'doctor', $4),
         ('assistant@clinic.com', $1, 'Medical Assistant', 'medical_assistant', NULL)
       RETURNING id, email, role`,
      [passwordHash, doctor1.id, doctor2.id, doctor3.id]
    );

    console.log('✓ Created users:', userResult.rows.map(r => r.email).join(', '));

    const assistantUser = userResult.rows.find(u => u.role === 'medical_assistant');

    // Assign doctors to medical assistant
    if (assistantUser) {
      await pool.query(
        `INSERT INTO user_managed_doctors (user_id, doctor_id)
         VALUES ($1, $2), ($1, $3), ($1, $4)`,
        [assistantUser.id, doctor1.id, doctor2.id, doctor3.id]
      );
      console.log('✓ Assigned all doctors to medical assistant');
    }

    // Create rooms
    await pool.query(
      `INSERT INTO rooms (name, type, status)
       VALUES 
         ('Exam Room 1', 'examination', 'available'),
         ('Exam Room 2', 'examination', 'available'),
         ('Exam Room 3', 'examination', 'available'),
         ('Treatment Room A', 'treatment', 'available'),
         ('Treatment Room B', 'treatment', 'available')`
    );

    console.log('✓ Created 5 rooms');

    // Create equipment
    const roomResult = await pool.query(
      `SELECT id, name FROM rooms WHERE type = 'treatment'`
    );

    for (const room of roomResult.rows) {
      await pool.query(
        `INSERT INTO equipment (name, type, room_id, status, last_maintenance_date, next_maintenance_date)
         VALUES 
           ($1, 'EKG', $2, 'operational', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days'),
           ($3, 'X-Ray', $2, 'operational', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '75 days')`,
        [`EKG Machine - ${room.name}`, room.id, `X-Ray - ${room.name}`]
      );
    }

    console.log('✓ Created equipment for treatment rooms');

    // Create sample patient flow (including completed for metrics)
    await pool.query(
      `INSERT INTO patient_flow (patient_id, status, doctor_id, arrival_time, service_start_time, service_end_time, checkout_time)
       VALUES 
         ('PATIENT_001', 'waiting', $1, CURRENT_TIMESTAMP - INTERVAL '15 minutes', NULL, NULL, NULL),
         ('PATIENT_002', 'in_examination', $2, CURRENT_TIMESTAMP - INTERVAL '45 minutes', CURRENT_TIMESTAMP - INTERVAL '30 minutes', NULL, NULL),
         ('PATIENT_003', 'in_treatment', $3, CURRENT_TIMESTAMP - INTERVAL '90 minutes', CURRENT_TIMESTAMP - INTERVAL '60 minutes', NULL, NULL),
         ('PATIENT_004', 'completed', $1, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours 45 minutes', CURRENT_TIMESTAMP - INTERVAL '3 hours 15 minutes', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
         ('PATIENT_005', 'completed', $2, CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours 50 minutes', CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours 45 minutes'),
         ('PATIENT_006', 'completed', $3, CURRENT_TIMESTAMP - INTERVAL '6 hours', CURRENT_TIMESTAMP - INTERVAL '5 hours 45 minutes', CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours 50 minutes'),
         ('PATIENT_007', 'completed', $1, CURRENT_TIMESTAMP - INTERVAL '7 hours', CURRENT_TIMESTAMP - INTERVAL '6 hours 50 minutes', CURRENT_TIMESTAMP - INTERVAL '6 hours 20 minutes', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
         ('PATIENT_008', 'completed', $2, CURRENT_TIMESTAMP - INTERVAL '8 hours', CURRENT_TIMESTAMP - INTERVAL '7 hours 45 minutes', CURRENT_TIMESTAMP - INTERVAL '7 hours', CURRENT_TIMESTAMP - INTERVAL '6 hours 45 minutes')`,
      [doctor1.id, doctor2.id, doctor3.id]
    );

    console.log('✓ Created sample patient flow (including 5 completed for metrics)');

    // Create sample tasks (mix of pending, in_progress, and completed)
    await pool.query(
      `INSERT INTO tasks (type, description, assignee, status, doctor_id, created_by, start_time, end_time)
       VALUES 
         ('room_preparation', 'Prepare Exam Room 1 for next patient', 'agent', 'in_progress', $1, $2, CURRENT_TIMESTAMP - INTERVAL '10 minutes', NULL),
         ('supply_restock', 'Restock supplies in Exam Room 2', 'staff', 'pending', $1, $2, NULL, NULL),
         ('equipment_check', 'Daily equipment check for Treatment Room A', 'agent', 'completed', $1, $2, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour 45 minutes'),
         ('room_cleaning', 'Clean and sanitize Exam Room 3', 'staff', 'completed', $1, $2, CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours 30 minutes'),
         ('patient_prep', 'Prepare patient files for afternoon appointments', 'agent', 'completed', $1, $2, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours 50 minutes'),
         ('supply_check', 'Verify medical supply inventory', 'staff', 'completed', $1, $2, CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours 30 minutes')`,
      [doctor1.id, assistantUser?.id || userResult.rows[0].id]
    );

    console.log('✓ Created sample tasks (2 active, 4 completed)');

    // Create sample action items
    await pool.query(
      `INSERT INTO action_items (type, urgency, title, description, status, created_by)
       VALUES 
         ('agent_request', 'normal', 'Confirm appointment rescheduling', 'AI agent requests approval to reschedule patient appointment due to doctor availability conflict', 'pending', 'agent'),
         ('equipment_issue', 'low', 'Schedule equipment maintenance', 'EKG Machine in Treatment Room A is due for maintenance in 30 days', 'pending', 'agent')`
    );

    console.log('✓ Created sample action items');

    // Create sample appointments
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Helper to create appointment time
    const createAppointmentTime = (daysOffset: number, hour: number, minute: number = 0) => {
      const date = new Date(today);
      date.setDate(date.getDate() + daysOffset);
      date.setHours(hour, minute, 0, 0);
      return date;
    };

    // Appointments for Dr. Sarah Johnson (today and tomorrow)
    await pool.query(
      `INSERT INTO appointments (doctor_id, patient_name, patient_contact, appointment_type, start_time, end_time, duration, status, notes)
       VALUES 
         ($1, 'John Smith', '555-0101', 'Annual Checkup', $2, $3, 30, 'scheduled', 'First visit'),
         ($1, 'Mary Williams', '555-0102', 'Follow-up', $4, $5, 15, 'scheduled', NULL),
         ($1, 'Robert Brown', '555-0103', 'Consultation', $6, $7, 45, 'scheduled', 'New patient'),
         ($1, 'Jennifer Davis', '555-0104', 'Annual Checkup', $8, $9, 30, 'scheduled', NULL),
         ($1, 'Michael Wilson', '555-0105', 'Follow-up', $10, $11, 15, 'completed', 'Completed yesterday')`,
      [
        doctor1.id,
        createAppointmentTime(0, 9, 0), createAppointmentTime(0, 9, 30),
        createAppointmentTime(0, 10, 0), createAppointmentTime(0, 10, 15),
        createAppointmentTime(0, 14, 0), createAppointmentTime(0, 14, 45),
        createAppointmentTime(1, 9, 0), createAppointmentTime(1, 9, 30),
        createAppointmentTime(-1, 10, 0), createAppointmentTime(-1, 10, 15),
      ]
    );

    // Appointments for Dr. Michael Chen
    await pool.query(
      `INSERT INTO appointments (doctor_id, patient_name, patient_contact, appointment_type, start_time, end_time, duration, status)
       VALUES 
         ($1, 'Patricia Martinez', '555-0201', 'Cardiology Consultation', $2, $3, 60, 'scheduled'),
         ($1, 'James Anderson', '555-0202', 'Follow-up', $4, $5, 30, 'scheduled'),
         ($1, 'Linda Taylor', '555-0203', 'EKG Test', $6, $7, 45, 'scheduled')`,
      [
        doctor2.id,
        createAppointmentTime(0, 10, 0), createAppointmentTime(0, 11, 0),
        createAppointmentTime(0, 15, 0), createAppointmentTime(0, 15, 30),
        createAppointmentTime(1, 11, 0), createAppointmentTime(1, 11, 45),
      ]
    );

    // Appointments for Dr. Emily Rodriguez
    await pool.query(
      `INSERT INTO appointments (doctor_id, patient_name, patient_contact, appointment_type, start_time, end_time, duration, status)
       VALUES 
         ($1, 'Emma Johnson', '555-0301', 'Well-Child Visit', $2, $3, 30, 'scheduled'),
         ($1, 'Oliver Garcia', '555-0302', 'Vaccination', $4, $5, 15, 'scheduled'),
         ($1, 'Sophia Lee', '555-0303', 'Sick Visit', $6, $7, 20, 'scheduled')`,
      [
        doctor3.id,
        createAppointmentTime(0, 9, 30), createAppointmentTime(0, 10, 0),
        createAppointmentTime(0, 13, 0), createAppointmentTime(0, 13, 15),
        createAppointmentTime(1, 14, 0), createAppointmentTime(1, 14, 20),
      ]
    );

    console.log('✓ Created sample appointments');

    // Create sample time blocks
    await pool.query(
      `INSERT INTO time_blocks (doctor_id, start_time, end_time, reason, description)
       VALUES 
         ($1, $2, $3, 'lunch', 'Lunch break'),
         ($4, $5, $6, 'meeting', 'Staff meeting'),
         ($7, $8, $9, 'personal', 'Personal appointment')`,
      [
        doctor1.id, createAppointmentTime(0, 12, 0), createAppointmentTime(0, 13, 0),
        doctor2.id, createAppointmentTime(0, 13, 0), createAppointmentTime(0, 14, 0),
        doctor3.id, createAppointmentTime(1, 12, 0), createAppointmentTime(1, 12, 30),
      ]
    );

    console.log('✓ Created sample time blocks');

    console.log('\n✓ Database seeded successfully!');
    console.log('\nTest credentials:');
    console.log('  Admin: admin@clinic.com / password123');
    console.log('  Doctor: sarah.johnson@clinic.com / password123');
    console.log('  Medical Assistant: assistant@clinic.com / password123');

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
