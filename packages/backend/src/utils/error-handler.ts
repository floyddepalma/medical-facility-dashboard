import { Response } from 'express';
import { ErrorResponse } from '../types';

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function sendError(res: Response, error: AppError | Error): void {
  if (error instanceof AppError) {
    const errorResponse: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        retryable: error.retryable,
        timestamp: new Date(),
      },
    };

    res.status(error.statusCode).json(errorResponse);
  } else {
    // Unexpected error
    console.error('Unexpected error:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        retryable: true,
        timestamp: new Date(),
      },
    };

    res.status(500).json(errorResponse);
  }
}

export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      sendError(res, err);
    });
  };
}
