import type { NextFunction, Request, Response } from "express";

// Wraps async route handlers so thrown errors (including AppError) reach
// the centralized error-handling middleware instead of crashing the process.
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
