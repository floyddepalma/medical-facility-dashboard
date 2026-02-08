/**
 * Add Demo Action Items
 * Adds doctor-relevant action items for Dr. Sarah Johnson
 */

import { pool } from './connection';

async function addDemoActions() {
  console.log('Adding demo action items for Dr. Sarah Johnson...\n');

  try {
    const drSarahId = '2f57b49f-c9f6-4415-bd88-d372ce368e05';

    // Clear existing action items for Dr. Sarah
    await pool.query(
      `DELETE FROM action_items WHERE doctor_id = $1`,
      [drSarahId]
    );

    // Add doctor-relevant action items
    await pool.query(`
      INSERT INTO action_items (type, urgency, title, description, status, created_by, doctor_id, created_at)
      VALUES 
        ('policy_conflict', 'urgent', 'Patient requesting after-hours appointment', 
         'Sarah Williams needs urgent follow-up but only available at 5:30 PM today. Approve exception to 5:00 PM end time?', 
         'pending', 'agent', $1, NOW() - INTERVAL '45 minutes'),
        
        ('agent_request', 'normal', 'New patient waitlist at capacity', 
         'New patient slots are fully booked for next 2 weeks. Consider adjusting capacity limits or extending hours?', 
         'pending', 'agent', $1, NOW() - INTERVAL '1 hour'),
        
        ('agent_request', 'normal', 'Double-booking request for urgent case', 
         'Patient with acute symptoms needs same-day appointment. Only option is 2:45 PM (conflicts with existing 2:30 PM slot). Approve 15-min overlap?', 
         'pending', 'agent', $1, NOW() - INTERVAL '30 minutes')
    `, [drSarahId]);

    console.log('✅ Added 3 doctor-relevant action items for Dr. Sarah Johnson\n');
    console.log('Action items:');
    console.log('  1. After-hours appointment request (urgent)');
    console.log('  2. New patient waitlist at capacity (normal)');
    console.log('  3. Double-booking for urgent case (normal)');
    console.log('\nThese will appear in her morning briefing!\n');

  } catch (error) {
    console.error('❌ Error adding demo actions:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  addDemoActions()
    .then(() => {
      console.log('Complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}
