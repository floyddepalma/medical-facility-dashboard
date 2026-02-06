import bcrypt from 'bcrypt';
import { pool } from './connection';

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

    // Create sample patient flow
    await pool.query(
      `INSERT INTO patient_flow (patient_id, status, doctor_id, arrival_time, service_start_time)
       VALUES 
         ('PATIENT_001', 'waiting', $1, CURRENT_TIMESTAMP - INTERVAL '15 minutes', NULL),
         ('PATIENT_002', 'in_examination', $2, CURRENT_TIMESTAMP - INTERVAL '45 minutes', CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
         ('PATIENT_003', 'in_treatment', $3, CURRENT_TIMESTAMP - INTERVAL '90 minutes', CURRENT_TIMESTAMP - INTERVAL '60 minutes')`,
      [doctor1.id, doctor2.id, doctor3.id]
    );

    console.log('✓ Created sample patient flow');

    // Create sample tasks
    await pool.query(
      `INSERT INTO tasks (type, description, assignee, status, doctor_id, created_by)
       VALUES 
         ('room_preparation', 'Prepare Exam Room 1 for next patient', 'agent', 'in_progress', $1, $2),
         ('equipment_check', 'Daily equipment check for Treatment Room A', 'agent', 'completed', $1, $2),
         ('supply_restock', 'Restock supplies in Exam Room 2', $3, 'pending', $1, $2)`,
      [doctor1.id, assistantUser?.id || userResult.rows[0].id, assistantUser?.id || userResult.rows[0].id]
    );

    console.log('✓ Created sample tasks');

    // Create sample action items
    await pool.query(
      `INSERT INTO action_items (type, urgency, title, description, status, created_by)
       VALUES 
         ('agent_request', 'normal', 'Confirm appointment rescheduling', 'AI agent requests approval to reschedule patient appointment due to doctor availability conflict', 'pending', 'agent'),
         ('equipment_issue', 'low', 'Schedule equipment maintenance', 'EKG Machine in Treatment Room A is due for maintenance in 30 days', 'pending', 'agent')`
    );

    console.log('✓ Created sample action items');

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
