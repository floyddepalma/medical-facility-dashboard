/**
 * Demo Data Seed Script
 * 
 * Seeds the database with realistic demo data for client demonstrations.
 * Uses generic names and typical small practice setup suitable for any client.
 */

import { pool } from './connection';
import bcrypt from 'bcrypt';

export async function seedDemoData() {
  console.log('🏥 Seeding demo data...\n');

  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await pool.query(`
      TRUNCATE users, doctors, rooms, equipment, tasks, action_items CASCADE
    `);

    // Create doctors (generic names, realistic specializations)
    console.log('Creating doctors...');
    await pool.query(`
      INSERT INTO doctors (id, name, specialization, active, created_at, updated_at)
      VALUES 
        ('doc-001', 'Dr. Sarah Mitchell', 'Family Medicine', true, NOW(), NOW()),
        ('doc-002', 'Dr. James Rodriguez', 'Pediatrics', true, NOW(), NOW()),
        ('doc-003', 'Dr. Emily Thompson', 'Internal Medicine', true, NOW(), NOW()),
        ('doc-004', 'Dr. Michael Chen', 'Orthopedics', true, NOW(), NOW())
    `);

    // Create users
    console.log('Creating users...');
    const passwordHash = await bcrypt.hash('demo123', 10);
    await pool.query(`
      INSERT INTO users (id, email, password_hash, name, role, doctor_id, created_at, last_login)
      VALUES 
        (gen_random_uuid(), 'admin@demo.com', $1, 'Admin User', 'admin', NULL, NOW(), NOW()),
        (gen_random_uuid(), 'jessica.martinez@demo.com', $1, 'Jessica Martinez', 'medical_assistant', NULL, NOW(), NOW()),
        (gen_random_uuid(), 'david.kim@demo.com', $1, 'David Kim', 'medical_assistant', NULL, NOW(), NOW()),
        (gen_random_uuid(), 'sarah.mitchell@demo.com', $1, 'Dr. Sarah Mitchell', 'doctor', 'doc-001', NOW(), NOW())
    `, [passwordHash]);

    // Store managed doctors for medical assistants
    await pool.query(`
      UPDATE users 
      SET managed_doctor_ids = ARRAY['doc-001', 'doc-002']
      WHERE email = 'jessica.martinez@demo.com'
    `);
    
    await pool.query(`
      UPDATE users 
      SET managed_doctor_ids = ARRAY['doc-003', 'doc-004']
      WHERE email = 'david.kim@demo.com'
    `);

    // Create rooms
    console.log('Creating rooms...');
    await pool.query(`
      INSERT INTO rooms (id, name, type, status, created_at, updated_at)
      VALUES 
        ('room-1', 'Exam Room 1', 'examination', 'available', NOW(), NOW()),
        ('room-2', 'Exam Room 2', 'examination', 'occupied', NOW(), NOW()),
        ('room-3', 'Exam Room 3', 'examination', 'needs_cleaning', NOW(), NOW()),
        ('room-4', 'Exam Room 4', 'examination', 'available', NOW(), NOW()),
        ('room-5', 'Pediatric Room 1', 'examination', 'available', NOW(), NOW()),
        ('room-6', 'Pediatric Room 2', 'examination', 'available', NOW(), NOW()),
        ('treatment-1', 'Minor Procedures', 'treatment', 'available', NOW(), NOW()),
        ('treatment-2', 'Cardiac Monitoring', 'treatment', 'occupied', NOW(), NOW()),
        ('treatment-3', 'Imaging', 'treatment', 'available', NOW(), NOW())
    `);

    // Set current doctor for occupied rooms
    await pool.query(`
      UPDATE rooms SET current_doctor_id = 'doc-001' WHERE id = 'room-2'
    `);
    await pool.query(`
      UPDATE rooms SET current_doctor_id = 'doc-002' WHERE id = 'treatment-2'
    `);

    // Create equipment
    console.log('Creating equipment...');
    await pool.query(`
      INSERT INTO equipment (id, name, type, room_id, status, last_maintenance_date, next_maintenance_date, created_at, updated_at)
      VALUES 
        ('ekg-1', 'EKG Machine 1', 'diagnostic', 'treatment-2', 'in_use', CURRENT_DATE - 30, CURRENT_DATE + 60, NOW(), NOW()),
        ('ekg-2', 'EKG Machine 2', 'diagnostic', 'room-4', 'operational', CURRENT_DATE - 15, CURRENT_DATE + 75, NOW(), NOW()),
        ('xray-1', 'X-Ray Machine', 'imaging', 'treatment-3', 'operational', CURRENT_DATE - 45, CURRENT_DATE + 45, NOW(), NOW()),
        ('bp-1', 'BP Monitor 1', 'diagnostic', 'room-1', 'operational', CURRENT_DATE - 10, CURRENT_DATE + 80, NOW(), NOW()),
        ('bp-2', 'BP Monitor 2', 'diagnostic', 'room-2', 'operational', CURRENT_DATE - 10, CURRENT_DATE + 80, NOW(), NOW()),
        ('bp-3', 'BP Monitor 3', 'diagnostic', 'room-5', 'operational', CURRENT_DATE - 10, CURRENT_DATE + 80, NOW(), NOW()),
        ('sterilizer-1', 'Autoclave Sterilizer', 'equipment', NULL, 'needs_maintenance', CURRENT_DATE - 95, CURRENT_DATE - 5, NOW(), NOW()),
        ('otoscope-1', 'Otoscope 1', 'diagnostic', 'room-1', 'operational', CURRENT_DATE - 20, CURRENT_DATE + 70, NOW(), NOW()),
        ('otoscope-2', 'Otoscope 2', 'diagnostic', 'room-5', 'operational', CURRENT_DATE - 20, CURRENT_DATE + 70, NOW(), NOW())
    `);

    // Create action items
    console.log('Creating action items...');
    await pool.query(`
      INSERT INTO action_items (id, type, urgency, title, description, status, created_by, doctor_id, room_id, equipment_id, created_at, time_waiting)
      VALUES 
        (gen_random_uuid(), 'equipment_issue', 'urgent', 'Sterilizer needs immediate maintenance', 
         'Autoclave sterilizer is overdue for maintenance by 5 days. This affects our ability to sterilize instruments.', 
         'pending', 'system', NULL, NULL, 'sterilizer-1', NOW() - INTERVAL '2 hours', 7200000),
        
        (gen_random_uuid(), 'room_issue', 'normal', 'Room 3 needs cleaning', 
         'Exam Room 3 marked for cleaning after last patient. Standard sanitization required.', 
         'pending', 'agent', 'doc-001', 'room-3', NULL, NOW() - INTERVAL '15 minutes', 900000),
        
        (gen_random_uuid(), 'policy_conflict', 'normal', 'Double booking detected', 
         'Dr. Rodriguez has overlapping appointments at 2:00 PM today. Please resolve scheduling conflict.', 
         'pending', 'agent', 'doc-002', NULL, NULL, NOW() - INTERVAL '30 minutes', 1800000),
        
        (gen_random_uuid(), 'agent_request', 'low', 'Supply restock recommendation', 
         'Examination gloves inventory is running low in Pediatric Room 1. Consider restocking soon.', 
         'pending', 'agent', NULL, 'room-5', NULL, NOW() - INTERVAL '1 hour', 3600000)
    `);

    // Create tasks
    console.log('Creating tasks...');
    await pool.query(`
      INSERT INTO tasks (id, type, description, assignee, status, created_by, doctor_id, room_id, equipment_id, priority, created_at, start_time)
      VALUES 
        (gen_random_uuid(), 'room_cleaning', 'Clean and sanitize Exam Room 3', 
         'staff', 'pending', 'agent', 'doc-001', 'room-3', NULL, 'normal', NOW() - INTERVAL '15 minutes', NULL),
        
        (gen_random_uuid(), 'equipment_check', 'Perform routine check on EKG Machine 1', 
         'agent', 'in_progress', 'agent', NULL, NULL, 'ekg-1', 'normal', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes'),
        
        (gen_random_uuid(), 'supply_restock', 'Restock examination gloves in Pediatric Room 1', 
         'staff', 'pending', 'system', NULL, 'room-5', NULL, 'low', NOW() - INTERVAL '1 hour', NULL),
        
        (gen_random_uuid(), 'patient_followup', 'Call patient for lab results - Dr. Thompson', 
         'staff', 'pending', 'system', 'doc-003', NULL, NULL, 'normal', NOW() - INTERVAL '30 minutes', NULL),
        
        (gen_random_uuid(), 'equipment_maintenance', 'Schedule sterilizer maintenance with vendor', 
         'staff', 'pending', 'system', NULL, NULL, 'sterilizer-1', 'urgent', NOW() - INTERVAL '2 hours', NULL),
        
        (gen_random_uuid(), 'room_preparation', 'Prepare Treatment Room 1 for minor procedure', 
         'staff', 'completed', 'agent', 'doc-004', 'treatment-1', NULL, 'normal', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 30 minutes'),
        
        (gen_random_uuid(), 'supply_check', 'Verify bandage supplies in all treatment rooms', 
         'agent', 'completed', 'agent', NULL, NULL, NULL, 'low', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 45 minutes'),
        
        (gen_random_uuid(), 'patient_checkin', 'Check in patient for Dr. Mitchell - 10:30 AM appointment', 
         'staff', 'completed', 'system', 'doc-001', NULL, NULL, 'normal', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours 50 minutes')
    `);

    // Add notes to some tasks
    await pool.query(`
      UPDATE tasks 
      SET notes = jsonb_build_array(
        jsonb_build_object(
          'text', 'EKG machine showing normal readings. Calibration check in progress.',
          'timestamp', NOW() - INTERVAL '3 minutes',
          'author', 'agent'
        )
      )
      WHERE type = 'equipment_check' AND status = 'in_progress'
    `);

    console.log('\n✅ Demo data seeded successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Demo Logins:');
    console.log('───────────────────────────────────────────────────────────');
    console.log('  Medical Assistant (Jessica): jessica.martinez@demo.com / demo123');
    console.log('  Medical Assistant (David):   david.kim@demo.com / demo123');
    console.log('  Doctor (Dr. Mitchell):       sarah.mitchell@demo.com / demo123');
    console.log('  Admin:                       admin@demo.com / demo123');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nFacility Status:');
    console.log('  - 4 Doctors (Mitchell, Rodriguez, Thompson, Chen)');
    console.log('  - 9 Rooms (6 examination, 3 treatment)');
    console.log('  - 9 Equipment items');
    console.log('  - 4 Action items requiring attention');
    console.log('  - 8 Tasks (5 pending, 1 in progress, 2 completed)');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoData()
    .then(() => {
      console.log('Seed complete. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
