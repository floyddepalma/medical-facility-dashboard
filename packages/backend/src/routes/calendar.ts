import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CalendarService } from '../services/calendar-service';
import { authenticateToken } from '../middleware/auth';
import { validateQuery, validateParams } from '../middleware/validation';
import { Pool } from 'pg';

const router = Router();

// Validation schemas
const appointmentsQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  doctorId: z.string().uuid().optional(),
});

const doctorParamsSchema = z.object({
  id: z.string().uuid(),
});

const doctorAppointmentsQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export function createCalendarRouter(db: Pool): Router {
  const calendarService = new CalendarService(db);

  /**
   * GET /api/calendar/appointments
   * Get appointments for current user's calendar
   */
  router.get(
    '/appointments',
    authenticateToken,
    validateQuery(appointmentsQuerySchema),
    async (req: Request, res: Response) => {
      try {
        const { startDate, endDate, doctorId } = req.query;
        const user = (req as any).user;

        // Parse dates
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        // Validate date range
        const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 31) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Date range cannot exceed 31 days',
              field: 'dateRange',
              retryable: false,
              timestamp: new Date(),
            },
          });
        }

        if (start >= end) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Start date must be before end date',
              field: 'startDate',
              retryable: false,
              timestamp: new Date(),
            },
          });
        }

        // Determine which doctor's calendar to fetch
        let targetDoctorId: string;

        if (user.role === 'doctor') {
          // Doctors can only view their own calendar
          if (!user.doctorId) {
            return res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Doctor user has no associated doctor ID',
                retryable: false,
                timestamp: new Date(),
              },
            });
          }
          targetDoctorId = user.doctorId;
        } else if (user.role === 'medical_assistant' || user.role === 'admin') {
          // Medical assistants and admins must specify doctorId
          if (!doctorId) {
            return res.status(400).json({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'doctorId is required for medical assistants and admins',
                field: 'doctorId',
                retryable: false,
                timestamp: new Date(),
              },
            });
          }
          targetDoctorId = doctorId as string;
        } else {
          return res.status(403).json({
            error: {
              code: 'PERMISSION_DENIED',
              message: 'Insufficient permissions to view calendar',
              retryable: false,
              timestamp: new Date(),
            },
          });
        }

        // Get calendar data
        const calendarData = await calendarService.getCalendarData(
          user.id,
          user.role,
          targetDoctorId,
          start,
          end
        );

        res.json(calendarData);
      } catch (err: any) {
        console.error('Error fetching appointments:', err);

        if (err.message === 'UNAUTHORIZED') {
          return res.status(403).json({
            error: {
              code: 'PERMISSION_DENIED',
              message: "You don't have permission to view this calendar",
              retryable: false,
              timestamp: new Date(),
            },
          });
        }

        if (err.message === 'DOCTOR_NOT_FOUND') {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: 'Doctor not found',
              retryable: false,
              timestamp: new Date(),
            },
          });
        }

        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch appointments',
            retryable: true,
            timestamp: new Date(),
          },
        });
      }
    }
  );

  /**
   * GET /api/calendar/doctors/:id/appointments
   * Get appointments for a specific doctor (medical assistants and admins only)
   */
  router.get(
    '/doctors/:id/appointments',
    authenticateToken,
    validateParams(doctorParamsSchema),
    validateQuery(doctorAppointmentsQuerySchema),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        const user = (req as any).user;

        // Only medical assistants and admins can use this endpoint
        if (user.role === 'doctor') {
          return res.status(403).json({
            error: {
              code: 'PERMISSION_DENIED',
              message: 'Doctors must use /api/calendar/appointments endpoint',
              retryable: false,
              timestamp: new Date(),
            },
          });
        }

        // Parse dates
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        // Validate date range
        const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 31) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Date range cannot exceed 31 days',
              field: 'dateRange',
              retryable: false,
              timestamp: new Date(),
            },
          });
        }

        if (start >= end) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Start date must be before end date',
              field: 'startDate',
              retryable: false,
              timestamp: new Date(),
            },
          });
        }

        // Get calendar data
        const calendarData = await calendarService.getCalendarData(
          user.id,
          user.role,
          id,
          start,
          end
        );

        res.json(calendarData);
      } catch (err: any) {
        console.error('Error fetching doctor appointments:', err);

        if (err.message === 'UNAUTHORIZED') {
          return res.status(403).json({
            error: {
              code: 'PERMISSION_DENIED',
              message: "You don't have permission to view this calendar",
              retryable: false,
              timestamp: new Date(),
            },
          });
        }

        if (err.message === 'DOCTOR_NOT_FOUND') {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: 'Doctor not found',
              retryable: false,
              timestamp: new Date(),
            },
          });
        }

        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch appointments',
            retryable: true,
            timestamp: new Date(),
          },
        });
      }
    }
  );

  return router;
}
