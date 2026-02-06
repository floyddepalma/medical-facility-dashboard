import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../db/connection';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { asyncHandler, AppError } from '../utils/error-handler';
import { User } from '../types';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req: any, res: any) => {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      `SELECT u.*, 
              ARRAY_AGG(umd.doctor_id) FILTER (WHERE umd.doctor_id IS NOT NULL) as managed_doctor_ids
       FROM users u
       LEFT JOIN user_managed_doctors umd ON u.id = umd.user_id
       WHERE u.email = $1
       GROUP BY u.id`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError('AUTH_INVALID', 'Invalid credentials', 401);
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new AppError('AUTH_INVALID', 'Invalid credentials', 401);
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = $1 WHERE id = $2', [new Date(), user.id]);

    // Generate token
    const userData: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      doctorId: user.doctor_id,
      managedDoctorIds: user.managed_doctor_ids || [],
      createdAt: user.created_at,
      lastLogin: new Date(),
    };

    const token = generateToken(userData);

    res.json({
      token,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        doctorId: userData.doctorId,
        managedDoctorIds: userData.managedDoctorIds,
      },
    });
  })
);

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req: AuthRequest, res) => {
  // In a production system, you might want to blacklist the token
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
      doctorId: req.user!.doctorId,
      managedDoctorIds: req.user!.managedDoctorIds,
    },
  });
});

export default router;
