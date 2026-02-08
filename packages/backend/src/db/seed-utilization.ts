/**
 * Seed realistic room utilization data for the past 7 days + today
 * 
 * Generates a week of historical data so the "Busy Times" chart can show
 * average utilization patterns with today's actual overlaid.
 */

import { pool } from './connection';

interface HourPattern {
  hour: number;
  probability: number;
  avgDuration: number;
  variance: number;
}

const hourlyPatterns: HourPattern[] = [
  { hour: 7,  probability: 0.5,  avgDuration: 20, variance: 10 },
  { hour: 8,  probability: 0.95, avgDuration: 25, variance: 10 },
  { hour: 9,  probability: 1.0,  avgDuration: 30, variance: 15 },
  { hour: 10, probability: 1.0,  avgDuration: 25, variance: 10 },
  { hour: 11, probability: 0.95, avgDuration: 20, variance: 10 },
  { hour: 12, probability: 0.6,  avgDuration: 15, variance: 5  },  // Lunch dip
  { hour: 13, probability: 0.95, avgDuration: 25, variance: 10 },
  { hour: 14, probability: 1.0,  avgDuration: 30, variance: 15 },
  { hour: 15, probability: 1.0,  avgDuration: 25, variance: 10 },
  { hour: 16, probability: 0.9,  avgDuration: 20, variance: 10 },
  { hour: 17, probability: 0.5,  avgDuration: 15, variance: 5  },
];

async function seedUtilization() {
  console.log('Seeding room utilization data (7 days + today)...\n');

  const dbTime = await pool.query('SELECT NOW() as now, CURRENT_DATE as today');
  console.log(`Database time: ${dbTime.rows[0].now}`);
  console.log(`Database date: ${dbTime.rows[0].today}\n`);

  const roomsResult = await pool.query('SELECT id, name, type FROM rooms ORDER BY name');
  const rooms = roomsResult.rows;

  console.log(`Found ${rooms.length} rooms:`);
  rooms.forEach((r: { name: string; type: string }) => console.log(`  - ${r.name} (${r.type})`));
  console.log('');

  // Clear existing seed data but keep live camera data (short durations from vision service)
  await pool.query('DELETE FROM room_utilization WHERE duration_seconds > 100 OR duration_seconds IS NULL');
  console.log('Cleared existing seed data (kept live camera sessions)\n');

  let totalSessions = 0;
  const daysToSeed = 7; // 7 historical days + today

  for (let dayOffset = daysToSeed; dayOffset >= 0; dayOffset--) {
    let daySessions = 0;

    for (const room of rooms) {
      // Skip Exam Room 1 (reserved for live camera demo)
      if (room.name === 'Exam Room 1') continue;

      for (const pattern of hourlyPatterns) {
        if (Math.random() > pattern.probability) continue;

        const sessionsThisHour = Math.random() > 0.7 ? 2 : 1;

        for (let s = 0; s < sessionsThisHour; s++) {
          const startMinute = Math.floor(Math.random() * (s === 0 ? 30 : 25)) + (s === 1 ? 35 : 0);
          const duration = Math.max(5, pattern.avgDuration + (Math.random() - 0.5) * 2 * pattern.variance);
          const durationSeconds = Math.round(duration * 60);

          await pool.query(
            `INSERT INTO room_utilization (room_id, started_at, ended_at, duration_seconds, source)
             VALUES ($1, 
                     CURRENT_DATE - INTERVAL '1 day' * $2 + INTERVAL '1 hour' * $3 + INTERVAL '1 minute' * $4,
                     CURRENT_DATE - INTERVAL '1 day' * $2 + INTERVAL '1 hour' * $3 + INTERVAL '1 minute' * $4 + INTERVAL '1 second' * $5,
                     $5, 
                     'seed')`,
            [room.id, dayOffset, pattern.hour, startMinute, durationSeconds]
          );
          daySessions++;
          totalSessions++;
        }
      }
    }

    const dayLabel = dayOffset === 0 ? 'Today' : `${dayOffset} day(s) ago`;
    console.log(`${dayLabel}: ${daySessions} sessions`);
  }

  console.log(`\n✓ Created ${totalSessions} utilization sessions across ${daysToSeed + 1} days`);

  // Show today's summary
  const summary = await pool.query(`
    SELECT r.name, COUNT(ru.id) as sessions, COALESCE(SUM(ru.duration_seconds), 0) as total_seconds
    FROM rooms r
    LEFT JOIN room_utilization ru ON r.id = ru.room_id AND DATE(ru.started_at) = CURRENT_DATE AND ru.ended_at IS NOT NULL
    GROUP BY r.id, r.name ORDER BY r.name
  `);

  console.log('\n--- Today\'s Summary ---');
  for (const row of summary.rows) {
    const mins = Math.round(row.total_seconds / 60);
    console.log(`  ${row.name}: ${row.sessions} sessions, ${mins}m`);
  }

  // Show hourly breakdown for today
  const hourly = await pool.query(`
    SELECT EXTRACT(HOUR FROM started_at)::INTEGER as hour, COUNT(*) as sessions, SUM(duration_seconds) as total_secs
    FROM room_utilization WHERE DATE(started_at) = CURRENT_DATE AND ended_at IS NOT NULL
    GROUP BY EXTRACT(HOUR FROM started_at) ORDER BY hour
  `);

  console.log('\n--- Today\'s Hourly ---');
  for (const row of hourly.rows) {
    console.log(`  ${row.hour}:00 - ${row.sessions} sessions, ${Math.round(row.total_secs / 60)}m`);
  }

  // Show average hourly across all days
  const avgHourly = await pool.query(`
    SELECT hour, ROUND(AVG(total_minutes)) as avg_minutes, ROUND(AVG(session_count)) as avg_sessions
    FROM (
      SELECT DATE(started_at) as day, EXTRACT(HOUR FROM started_at)::INTEGER as hour,
             SUM(duration_seconds) / 60.0 as total_minutes, COUNT(*) as session_count
      FROM room_utilization WHERE ended_at IS NOT NULL
      GROUP BY DATE(started_at), EXTRACT(HOUR FROM started_at)
    ) daily_hours
    GROUP BY hour ORDER BY hour
  `);

  console.log('\n--- Average Hourly (across all days) ---');
  for (const row of avgHourly.rows) {
    console.log(`  ${row.hour}:00 - avg ${row.avg_sessions} sessions, ${row.avg_minutes}m`);
  }

  await pool.end();
  console.log('\n✓ Done!');
}

seedUtilization().catch(err => {
  console.error('Error seeding utilization:', err);
  process.exit(1);
});
