import { pool } from '../db/connection.js';

async function getRoomId() {
  try {
    const result = await pool.query(
      `SELECT id, name, type, status FROM rooms LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log('No rooms found. Run: npm run db:seed');
      process.exit(1);
    }

    const room = result.rows[0];
    console.log('\n==========================================');
    console.log('Room Information');
    console.log('==========================================');
    console.log(`Name: ${room.name}`);
    console.log(`Type: ${room.type}`);
    console.log(`Status: ${room.status}`);
    console.log(`\nRoom ID: ${room.id}`);
    console.log('==========================================\n');
    console.log('Copy this ID to packages/vision-service/.env:');
    console.log(`ROOM_ID=${room.id}\n`);

    process.exit(0);
  } catch (err) {
    console.error('Failed to get room ID:', err);
    process.exit(1);
  }
}

getRoomId();
