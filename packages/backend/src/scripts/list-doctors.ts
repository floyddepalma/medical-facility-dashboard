import { pool } from '../db/connection';

async function listDoctors() {
  try {
    const result = await pool.query(
      'SELECT id, name, specialization FROM doctors ORDER BY name'
    );

    console.log('\n=== Doctors in Database ===\n');
    
    for (const doctor of result.rows) {
      console.log(`Name: ${doctor.name}`);
      console.log(`ID: ${doctor.id}`);
      if (doctor.specialization) {
        console.log(`Specialization: ${doctor.specialization}`);
      }
      console.log('---');
    }

    console.log('\nUse these IDs in your GOOGLE_CALENDAR_MAPPINGS environment variable.\n');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

listDoctors();
