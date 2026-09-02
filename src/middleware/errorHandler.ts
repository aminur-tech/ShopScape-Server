import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: "Route not found" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err && typeof err === "object" && "code" in err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Image must be 5MB or smaller" });
  }
  if (err instanceof Error && err.message.includes("শুধুমাত্র")) {
    return res.status(400).json({ error: err.message });
  }
  if (isDatabaseUnavailable(err)) {
    return res.status(503).json({
      success: false,
      message: "Database is temporarily unavailable. Please try again shortly.",
    });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : undefined;
  return code === "P1001" || code === "P2024" || code === "ETIMEDOUT";
}
