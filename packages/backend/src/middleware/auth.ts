import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      doctorId: user.doctorId,
      managedDoctorIds: user.managedDoctorIds,
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || '30m' }
  );
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
        retryable: false,
        timestamp: new Date(),
      },
    });
    return;
  }

  // Check if it's the CLAW API key (for Cara agent)
  const clawApiKey = process.env.CLAW_API_KEY;
  if (clawApiKey && token === clawApiKey) {
    // Create a service account user for Cara
    req.user = {
      id: 'cara-agent',
      email: 'cara@caresync.local',
      name: 'Cara (AI Agent)',
      role: 'admin', // Give Cara admin access to create tasks/actions
      doctorId: null,
      managedDoctorIds: [],
      createdAt: new Date(),
      lastLogin: new Date(),
    };
    next();
    return;
  }

  // Check if it's the Vision Service API key
  const visionApiKey = process.env.VISION_API_KEY;
  if (visionApiKey && token === visionApiKey) {
    // Create a service account user for Vision Service
    req.user = {
      id: 'vision-service',
      email: 'vision@caresync.local',
      name: 'Vision Service',
      role: 'admin', // Give Vision Service admin access to update rooms/create actions
      doctorId: null,
      managedDoctorIds: [],
      createdAt: new Date(),
      lastLogin: new Date(),
    };
    next();
    return;
  }

  // Otherwise, verify JWT token
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name || '',
      role: decoded.role,
      doctorId: decoded.doctorId,
      managedDoctorIds: decoded.managedDoctorIds,
      createdAt: new Date(),
      lastLogin: new Date(),
    };
    next();
  } catch (err) {
    res.status(403).json({
      error: {
        code: 'AUTH_INVALID',
        message: 'Invalid or expired token',
        retryable: false,
        timestamp: new Date(),
      },
    });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          retryable: false,
          timestamp: new Date(),
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions',
          retryable: false,
          timestamp: new Date(),
        },
      });
      return;
    }

    next();
  };
}

export function requireDoctorAccess(doctorIdParam: string = 'doctorId') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          retryable: false,
          timestamp: new Date(),
        },
      });
      return;
    }

    const requestedDoctorId = req.params[doctorIdParam] || req.query[doctorIdParam] || req.body[doctorIdParam];

    // Admin has access to all doctors
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Doctor can only access their own data
    if (req.user.role === 'doctor' && req.user.doctorId === requestedDoctorId) {
      next();
      return;
    }

    // Medical assistant can access their managed doctors
    if (
      req.user.role === 'medical_assistant' &&
      req.user.managedDoctorIds?.includes(requestedDoctorId)
    ) {
      next();
      return;
    }

    res.status(403).json({
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Access denied to this doctor',
        retryable: false,
        timestamp: new Date(),
      },
    });
  };
}
