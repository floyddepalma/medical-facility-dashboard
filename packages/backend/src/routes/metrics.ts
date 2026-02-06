import { Router } from 'express';
import { z } from 'zod';
import { pool, getRedisClient } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { asyncHandler } from '../utils/error-handler';
import { DailyMetrics } from '../types';

const router = Router();

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '10');

// GET /api/metrics/daily
router.get(
  '/daily',
  authenticateToken,
  validateQuery(z.object({ date: z.string().date().optional() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const { date } = req.query as any;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const redis = await getRedisClient();
    const cacheKey = `metrics:daily:${targetDate}`;

    // Try cache first (if Redis available)
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    // Calculate metrics
    const metrics = await calculateDailyMetrics(targetDate);

    // Cache the result (if Redis available)
    if (redis) {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(metrics));
    }

    res.json(metrics);
  })
);

// GET /api/metrics/trends
router.get(
  '/trends',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await pool.query(
      `SELECT * FROM daily_metrics_view 
       WHERE date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY date DESC`
    );

    res.json({ trends: result.rows });
  })
);

async function calculateDailyMetrics(date: string): Promise<DailyMetrics> {
  // Get patient metrics
  const patientResult = await pool.query(
    `SELECT 
       COUNT(DISTINCT patient_id) as patients_seen,
       AVG(EXTRACT(EPOCH FROM (checkout_time - arrival_time)) / 60) as avg_visit_duration,
       AVG(EXTRACT(EPOCH FROM (service_start_time - arrival_time)) / 60) as avg_wait_time
     FROM patient_flow
     WHERE DATE(arrival_time) = $1 AND status = 'completed'`,
    [date]
  );

  const patientMetrics = patientResult.rows[0] || {
    patients_seen: 0,
    avg_visit_duration: 0,
    avg_wait_time: 0,
  };

  // Get task completion metrics
  const taskResult = await pool.query(
    `SELECT 
       COUNT(CASE WHEN assignee != 'agent' THEN 1 END) as by_staff,
       COUNT(CASE WHEN assignee = 'agent' THEN 1 END) as by_agent,
       COUNT(*) as total
     FROM tasks
     WHERE DATE(start_time) = $1 AND status = 'completed'`,
    [date]
  );

  const taskMetrics = taskResult.rows[0] || {
    by_staff: 0,
    by_agent: 0,
    total: 0,
  };

  // Get room utilization
  const roomResult = await pool.query(
    `SELECT 
       type,
       AVG(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) * 100 as utilization
     FROM rooms
     GROUP BY type`
  );

  const roomUtilization: any = {
    examinationRooms: 0,
    treatmentRooms: 0,
  };

  for (const row of roomResult.rows) {
    if (row.type === 'examination') {
      roomUtilization.examinationRooms = parseFloat(row.utilization);
    } else if (row.type === 'treatment') {
      roomUtilization.treatmentRooms = parseFloat(row.utilization);
    }
  }

  // Get task breakdown by type
  const taskBreakdownResult = await pool.query(
    `SELECT type, COUNT(*) as count
     FROM tasks
     WHERE DATE(start_time) = $1 AND status = 'completed'
     GROUP BY type`,
    [date]
  );

  const taskBreakdown: Record<string, number> = {};
  for (const row of taskBreakdownResult.rows) {
    taskBreakdown[row.type] = parseInt(row.count);
  }

  // Get 7-day averages for comparison
  const avgResult = await pool.query(
    `SELECT 
       AVG(patients_seen) as avg_patients,
       AVG(avg_visit_duration) as avg_duration,
       AVG(avg_wait_time) as avg_wait
     FROM daily_metrics_view
     WHERE date >= $1::date - INTERVAL '7 days' AND date < $1::date`,
    [date]
  );

  const averages = avgResult.rows[0] || {
    avg_patients: 0,
    avg_duration: 0,
    avg_wait: 0,
  };

  const comparison = {
    patientsSeen: averages.avg_patients > 0
      ? ((parseInt(patientMetrics.patients_seen) - parseFloat(averages.avg_patients)) / parseFloat(averages.avg_patients)) * 100
      : 0,
    averageVisitDuration: averages.avg_duration > 0
      ? ((parseFloat(patientMetrics.avg_visit_duration) - parseFloat(averages.avg_duration)) / parseFloat(averages.avg_duration)) * 100
      : 0,
    averageWaitTime: averages.avg_wait > 0
      ? ((parseFloat(patientMetrics.avg_wait_time) - parseFloat(averages.avg_wait)) / parseFloat(averages.avg_wait)) * 100
      : 0,
  };

  return {
    date: new Date(date),
    patientsSeen: parseInt(patientMetrics.patients_seen),
    averageVisitDuration: parseFloat(patientMetrics.avg_visit_duration) || 0,
    averageWaitTime: parseFloat(patientMetrics.avg_wait_time) || 0,
    tasksCompleted: {
      byStaff: parseInt(taskMetrics.by_staff),
      byAgent: parseInt(taskMetrics.by_agent),
      total: parseInt(taskMetrics.total),
    },
    roomUtilization,
    taskBreakdown,
    comparisonTo7DayAverage: comparison,
  };
}

export default router;
