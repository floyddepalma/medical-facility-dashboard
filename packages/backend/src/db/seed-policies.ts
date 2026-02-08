/**
 * Seed Scheduling Policies & Weekly Appointments for Dr. Sarah Johnson
 * 
 * Run from packages/backend:
 *   npx ts-node src/db/seed-policies.ts
 * 
 * Seeds:
 * - Scheduling policies (availability, blocks, appointment types, capacity, booking window)
 * - A full week of appointments (Mon-Fri) for Dr. Sarah
 * - Time blocks (lunch daily, staff meeting Wed)
 * 
 * IMPORTANT: Uses CURRENT_DATE SQL expressions for Neon PostgreSQL (GMT timezone).
 */

import { pool } from './connection.js';

async function seedPolicies() {
  try {
    console.log('Seeding policies and weekly calendar for Dr. Sarah Johnson...\n');

    // Get Dr. Sarah's ID
    const doctorResult = await pool.query(
      `SELECT id FROM doctors WHERE name = 'Dr. Sarah Johnson' LIMIT 1`
    );

    if (doctorResult.rows.length === 0) {
      console.error('Dr. Sarah Johnson not found. Run the main seed first: npx ts-node src/db/seed.ts');
      process.exit(1);
    }

    const doctorId = doctorResult.rows[0].id;
    console.log(`Found Dr. Sarah Johnson: ${doctorId}`);

    // =========================================================================
    // 1. Create policies table if not exists
    // =========================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID NOT NULL,
        policy_type VARCHAR(50) NOT NULL,
        label VARCHAR(255) NOT NULL,
        policy_data JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 5,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255) NOT NULL,
        last_modified_by VARCHAR(255),
        CONSTRAINT fk_policy_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_policies_doctor ON policies(doctor_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(policy_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_policies_active ON policies(is_active)`);

    // Clear existing policies for Dr. Sarah
    const deleted = await pool.query(
      `DELETE FROM policies WHERE doctor_id = $1 RETURNING id`,
      [doctorId]
    );
    console.log(`Cleared ${deleted.rowCount} existing policies`);

    // =========================================================================
    // 2. Seed Scheduling Policies
    // =========================================================================

    // AVAILABILITY: Mon-Fri 8:00 AM - 5:00 PM
    await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, 'AVAILABILITY', 'Standard Working Hours', $2, 10, 'system')`,
      [doctorId, JSON.stringify({
        policyType: 'AVAILABILITY',
        recurrence: {
          type: 'weekly',
          daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
          startDate: '2026-01-01',
          endDate: null,
        },
        timeWindows: [{ start: '08:00', end: '17:00' }],
        location: 'Main Clinic',
      })]
    );
    console.log('✓ Policy: Standard Working Hours (Mon-Fri 8:00 AM - 5:00 PM)');

    // BLOCK: Lunch break 12:00 - 1:00 PM daily
    await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, 'BLOCK', 'Lunch Break', $2, 8, 'system')`,
      [doctorId, JSON.stringify({
        policyType: 'BLOCK',
        recurrence: {
          type: 'weekly',
          daysOfWeek: [1, 2, 3, 4, 5],
          startDate: '2026-01-01',
          endDate: null,
        },
        timeWindows: [{ start: '12:00', end: '13:00' }],
        reason: 'Lunch break',
        allowOverride: false,
      })]
    );
    console.log('✓ Policy: Lunch Break (12:00 PM - 1:00 PM)');

    // BLOCK: Wednesday afternoon admin time
    await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, 'BLOCK', 'Wednesday Admin Time', $2, 7, 'system')`,
      [doctorId, JSON.stringify({
        policyType: 'BLOCK',
        recurrence: {
          type: 'weekly',
          daysOfWeek: [3], // Wednesday
          startDate: '2026-01-01',
          endDate: null,
        },
        timeWindows: [{ start: '16:00', end: '17:00' }],
        reason: 'Administrative tasks and chart review',
        allowOverride: true,
      })]
    );
    console.log('✓ Policy: Wednesday Admin Time (4:00 PM - 5:00 PM)');

    // APPOINTMENT_TYPE: Annual Checkup (30 min)
    await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, 'APPOINTMENT_TYPE', 'Annual Checkup', $2, 5, 'system')`,
      [doctorId, JSON.stringify({
        policyType: 'APPOINTMENT_TYPE',
        typeName: 'Annual Checkup',
        duration: 30,
        bufferAfter: 5,
        color: '#4CAF50',
        requiresRoom: true,
        roomType: 'examination',
        maxConcurrent: 1,
      })]
    );
    console.log('✓ Policy: Annual Checkup (30 min + 5 min buffer)');

    // APPOINTMENT_TYPE: Follow-up (15 min)
    await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, 'APPOINTMENT_TYPE', 'Follow-up Visit', $2, 5, 'system')`,
      [doctorId, JSON.stringify({
        policyType: 'APPOINTMENT_TYPE',
        typeName: 'Follow-up',
        duration: 15,
        bufferAfter: 5,
        color: '#2196F3',
        requiresRoom: true,
        roomType: 'examination',
        maxConcurrent: 1,
      })]
    );
    console.log('✓ Policy: Follow-up Visit (15 min + 5 min buffer)');

    // APPOINTMENT_TYPE: Consultation (45 min)
    await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, 'APPOINTMENT_TYPE', 'Consultation', $2, 5, 'system')`,
      [doctorId, JSON.stringify({
        policyType: 'APPOINTMENT_TYPE',
        typeName: 'Consultation',
        duration: 45,
        bufferAfter: 10,
        color: '#FF9800',
        requiresRoom: true,
        roomType: 'examination',
        maxConcurrent: 1,
      })]
    );
    console.log('✓ Policy: Consultation (45 min + 10 min buffer)');

    // APPOINTMENT_TYPE: Urgent Visit (20 min)
    await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, 'APPOINTMENT_TYPE', 'Urgent Visit', $2, 5, 'system')`,
      [doctorId, JSON.stringify({
        policyType: 'APPOINTMENT_TYPE',
        typeName: 'Urgent Visit',
        duration: 20,
        bufferAfter: 5,
        color: '#F44336',
        requiresRoom: true,
        roomType: 'any',
        maxConcurrent: 1,
      })]
    );
    console.log('✓ Policy: Urgent Visit (20 min + 5 min buffer)');

    // DURATION: Default appointment length
    await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, 'DURATION', 'Default Appointment Duration', $2, 3, 'system')`,
      [doctorId, JSON.stringify({
        policyType: 'DURATION',
        defaultLength: 30,
        bufferBefore: 0,
        bufferAfter: 5,
        maxPerDay: 20,
        allowVariance: true,
        varianceMinutes: 10,
      })]
    );
    console.log('✓ Policy: Default Duration (30 min, max 20/day)');

    // CAPACITY: Daily limits
    await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, 'CAPACITY', 'Daily Capacity Limits', $2, 6, 'system')`,
      [doctorId, JSON.stringify({
        policyType: 'CAPACITY',
        maxAppointmentsPerHour: 3,
        maxAppointmentsPerDay: 20,
        maxNewPatientsPerDay: 5,
      })]
    );
    console.log('✓ Policy: Daily Capacity (max 3/hr, 20/day, 5 new patients/day)');

    // BOOKING_WINDOW: Advance booking rules
    await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, 'BOOKING_WINDOW', 'Booking Window', $2, 4, 'system')`,
      [doctorId, JSON.stringify({
        policyType: 'BOOKING_WINDOW',
        minAdvanceHours: 2,
        maxAdvanceDays: 60,
        allowSameDayBooking: true,
        cutoffTime: '15:00',
      })]
    );
    console.log('✓ Policy: Booking Window (2hr min advance, 60 day max, same-day before 3 PM)');

    // PATIENT_TYPE: New patients need longer slots
    await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, 'PATIENT_TYPE', 'New Patient Rules', $2, 5, 'system')`,
      [doctorId, JSON.stringify({
        policyType: 'PATIENT_TYPE',
        patientType: 'new',
        allowedDays: [1, 2, 3, 4, 5],
        allowedTimeWindows: [{ start: '09:00', end: '15:00' }],
        duration: 45,
        requiresApproval: false,
      })]
    );
    console.log('✓ Policy: New Patient Rules (45 min, mornings only)');

    console.log('\n--- Policies seeded ---\n');

    // =========================================================================
    // 3. Seed Weekly Appointments (Mon-Fri of current week)
    // =========================================================================
    //
    // TIMEZONE FIX: Neon PostgreSQL is in UTC. To make appointments appear at
    // the correct local hours in the UI, we add a UTC offset. The frontend
    // converts Date objects using the browser's local timezone, so we need
    // to store e.g. 15:00 UTC for a 9:00 AM CT appointment (UTC-6).
    //
    // Change this value if the demo machine is in a different timezone.
    const TZ_OFFSET_HOURS = 6; // Central Time = UTC-6, so add 6 hours

    // Clear existing appointments for Dr. Sarah (keep completed ones from past)
    await pool.query(
      `DELETE FROM appointments 
       WHERE doctor_id = $1 
       AND start_time >= CURRENT_DATE 
       AND status = 'scheduled'`,
      [doctorId]
    );

    // Clear existing time blocks for Dr. Sarah from today forward
    await pool.query(
      `DELETE FROM time_blocks 
       WHERE doctor_id = $1 
       AND start_time >= CURRENT_DATE`,
      [doctorId]
    );

    console.log(`Cleared future appointments and time blocks for Dr. Sarah`);
    console.log(`Using timezone offset: UTC-${TZ_OFFSET_HOURS} (add ${TZ_OFFSET_HOURS}h to local times)`);

    // Helper: Insert appointment using SQL date math (avoids JS timezone issues)
    // Hours are in LOCAL time — the TZ_OFFSET is added automatically
    const insertAppointment = async (
      dayOffset: number,
      hour: number,
      minute: number,
      durationMin: number,
      patientName: string,
      patientContact: string,
      appointmentType: string,
      status: string = 'scheduled',
      notes: string | null = null
    ) => {
      const utcHour = hour + TZ_OFFSET_HOURS;
      const utcEndMin = minute + durationMin;
      await pool.query(
        `INSERT INTO appointments (doctor_id, patient_name, patient_contact, appointment_type, start_time, end_time, duration, status, notes)
         VALUES ($1, $2, $3, $4, 
           CURRENT_DATE + INTERVAL '${dayOffset} days' + INTERVAL '${utcHour} hours' + INTERVAL '${minute} minutes',
           CURRENT_DATE + INTERVAL '${dayOffset} days' + INTERVAL '${utcHour} hours' + INTERVAL '${utcEndMin} minutes',
           $5, $6, $7)`,
        [doctorId, patientName, patientContact, appointmentType, durationMin, status, notes]
      );
    };

    // Helper: Insert time block (hours in LOCAL time)
    const insertTimeBlock = async (
      dayOffset: number,
      startHour: number,
      startMin: number,
      endHour: number,
      endMin: number,
      reason: string,
      description: string
    ) => {
      const utcStartHour = startHour + TZ_OFFSET_HOURS;
      const utcEndHour = endHour + TZ_OFFSET_HOURS;
      await pool.query(
        `INSERT INTO time_blocks (doctor_id, start_time, end_time, reason, description)
         VALUES ($1,
           CURRENT_DATE + INTERVAL '${dayOffset} days' + INTERVAL '${utcStartHour} hours' + INTERVAL '${startMin} minutes',
           CURRENT_DATE + INTERVAL '${dayOffset} days' + INTERVAL '${utcEndHour} hours' + INTERVAL '${endMin} minutes',
           $2, $3)`,
        [doctorId, reason, description]
      );
    };

    // --- TODAY (day 0) ---
    await insertAppointment(0, 9, 0, 30, 'John Smith', '555-0101', 'Annual Checkup', 'scheduled', 'Returning patient, annual wellness');
    await insertAppointment(0, 9, 35, 15, 'Mary Williams', '555-0102', 'Follow-up', 'scheduled', 'Blood pressure check');
    await insertAppointment(0, 10, 0, 45, 'Robert Brown', '555-0103', 'Consultation', 'scheduled', 'New patient referral');
    await insertAppointment(0, 11, 0, 30, 'Lisa Anderson', '555-0104', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(0, 11, 35, 15, 'David Martinez', '555-0105', 'Follow-up', 'scheduled', 'Post-surgery follow-up');
    await insertAppointment(0, 13, 0, 30, 'Karen Taylor', '555-0106', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(0, 13, 35, 45, 'James Wilson', '555-0107', 'Consultation', 'scheduled', 'Chronic pain management');
    await insertAppointment(0, 14, 30, 20, 'Patricia Moore', '555-0108', 'Urgent Visit', 'scheduled', 'Acute symptoms');
    await insertAppointment(0, 15, 0, 15, 'Thomas Jackson', '555-0109', 'Follow-up', 'scheduled', 'Lab results review');
    await insertTimeBlock(0, 12, 0, 13, 0, 'lunch', 'Lunch break');
    console.log('✓ Today: 9 appointments + lunch block');

    // --- TOMORROW (day 1) ---
    await insertAppointment(1, 8, 30, 45, 'Jennifer Davis', '555-0110', 'Consultation', 'scheduled', 'New patient intake');
    await insertAppointment(1, 9, 30, 30, 'Michael White', '555-0111', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(1, 10, 5, 15, 'Sarah Harris', '555-0112', 'Follow-up', 'scheduled', 'Medication adjustment');
    await insertAppointment(1, 10, 30, 30, 'Christopher Clark', '555-0113', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(1, 11, 15, 20, 'Amanda Lewis', '555-0114', 'Urgent Visit', 'scheduled', 'Persistent cough');
    await insertAppointment(1, 13, 0, 45, 'Daniel Robinson', '555-0115', 'Consultation', 'scheduled', 'Second opinion');
    await insertAppointment(1, 14, 0, 15, 'Michelle Walker', '555-0116', 'Follow-up', 'scheduled', null);
    await insertAppointment(1, 14, 30, 30, 'Steven Hall', '555-0117', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(1, 15, 15, 15, 'Laura Allen', '555-0118', 'Follow-up', 'scheduled', 'Allergy check');
    await insertTimeBlock(1, 12, 0, 13, 0, 'lunch', 'Lunch break');
    console.log('✓ Tomorrow: 9 appointments + lunch block');

    // --- DAY +2 ---
    await insertAppointment(2, 9, 0, 30, 'Kevin Young', '555-0119', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(2, 9, 40, 45, 'Nancy King', '555-0120', 'Consultation', 'scheduled', 'Referral from Dr. Chen');
    await insertAppointment(2, 10, 30, 15, 'Brian Wright', '555-0121', 'Follow-up', 'scheduled', null);
    await insertAppointment(2, 11, 0, 30, 'Sandra Lopez', '555-0122', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(2, 13, 0, 20, 'Jason Hill', '555-0123', 'Urgent Visit', 'scheduled', 'Fever and chills');
    await insertAppointment(2, 13, 30, 30, 'Betty Scott', '555-0124', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(2, 14, 15, 15, 'Mark Green', '555-0125', 'Follow-up', 'scheduled', 'Diabetes management');
    await insertAppointment(2, 15, 0, 45, 'Dorothy Adams', '555-0126', 'Consultation', 'scheduled', 'New patient');
    await insertTimeBlock(2, 12, 0, 13, 0, 'lunch', 'Lunch break');
    console.log('✓ Day +2: 8 appointments + lunch block');

    // --- DAY +3 ---
    await insertAppointment(3, 8, 30, 30, 'Paul Baker', '555-0127', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(3, 9, 15, 15, 'Helen Nelson', '555-0128', 'Follow-up', 'scheduled', 'Thyroid check');
    await insertAppointment(3, 9, 45, 45, 'George Carter', '555-0129', 'Consultation', 'scheduled', null);
    await insertAppointment(3, 10, 45, 30, 'Ruth Mitchell', '555-0130', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(3, 11, 30, 20, 'Edward Perez', '555-0131', 'Urgent Visit', 'scheduled', 'Chest tightness');
    await insertAppointment(3, 13, 0, 15, 'Margaret Roberts', '555-0132', 'Follow-up', 'scheduled', null);
    await insertAppointment(3, 13, 30, 30, 'Frank Turner', '555-0133', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(3, 14, 15, 45, 'Carol Phillips', '555-0134', 'Consultation', 'scheduled', 'Weight management');
    await insertTimeBlock(3, 12, 0, 13, 0, 'lunch', 'Lunch break');
    await insertTimeBlock(3, 16, 0, 17, 0, 'meeting', 'Staff meeting');
    console.log('✓ Day +3: 8 appointments + lunch + staff meeting');

    // --- DAY +4 ---
    await insertAppointment(4, 9, 0, 45, 'Virginia Campbell', '555-0135', 'Consultation', 'scheduled', 'New patient');
    await insertAppointment(4, 10, 0, 30, 'Raymond Parker', '555-0136', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(4, 10, 40, 15, 'Deborah Evans', '555-0137', 'Follow-up', 'scheduled', 'Post-procedure');
    await insertAppointment(4, 11, 0, 30, 'Jerry Edwards', '555-0138', 'Annual Checkup', 'scheduled', null);
    await insertAppointment(4, 13, 0, 20, 'Diane Collins', '555-0139', 'Urgent Visit', 'scheduled', 'Migraine');
    await insertAppointment(4, 13, 30, 15, 'Gary Stewart', '555-0140', 'Follow-up', 'scheduled', null);
    await insertAppointment(4, 14, 0, 45, 'Brenda Morris', '555-0141', 'Consultation', 'scheduled', 'Preventive care plan');
    await insertAppointment(4, 15, 0, 30, 'Dennis Rogers', '555-0142', 'Annual Checkup', 'scheduled', null);
    await insertTimeBlock(4, 12, 0, 13, 0, 'lunch', 'Lunch break');
    console.log('✓ Day +4: 8 appointments + lunch block');

    // =========================================================================
    // Summary
    // =========================================================================

    const policyCount = await pool.query(
      `SELECT COUNT(*) FROM policies WHERE doctor_id = $1`,
      [doctorId]
    );
    const apptCount = await pool.query(
      `SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND start_time >= CURRENT_DATE AND status = 'scheduled'`,
      [doctorId]
    );
    const blockCount = await pool.query(
      `SELECT COUNT(*) FROM time_blocks WHERE doctor_id = $1 AND start_time >= CURRENT_DATE`,
      [doctorId]
    );

    console.log('\n========================================');
    console.log('Seed complete for Dr. Sarah Johnson');
    console.log(`  Policies: ${policyCount.rows[0].count}`);
    console.log(`  Upcoming appointments: ${apptCount.rows[0].count}`);
    console.log(`  Time blocks: ${blockCount.rows[0].count}`);
    console.log('========================================');
    console.log('\nPolicies summary:');
    console.log('  - Working Hours: Mon-Fri 8:00 AM - 5:00 PM');
    console.log('  - Lunch Block: 12:00 PM - 1:00 PM daily');
    console.log('  - Wed Admin Time: 4:00 PM - 5:00 PM');
    console.log('  - Appointment Types: Annual Checkup (30m), Follow-up (15m), Consultation (45m), Urgent (20m)');
    console.log('  - Capacity: Max 3/hr, 20/day, 5 new patients/day');
    console.log('  - Booking Window: 2hr min advance, 60 day max');
    console.log('  - New Patients: 45 min slots, 9 AM - 3 PM only');

    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seedPolicies();
