import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { ZodError } from "zod";

export class AppError extends Error {
  statusCode: number;

  constructor(
    message: string,
    statusCode = 400
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;

    Object.setPrototypeOf(
      this,
      AppError.prototype
    );
  }
}

export function notFoundHandler(
  req: Request,
  res: Response
) {
  console.error(
    `[404] ${req.method} ${req.originalUrl}`
  );

  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(
    "\n\n##################################################"
  );

  console.error(
    "GLOBAL ERROR HANDLER"
  );

  console.error(
    "##################################################"
  );

  console.error(
    "Method:",
    req.method
  );

  console.error(
    "URL:",
    req.originalUrl
  );

  console.error(
    "Body:"
  );

  console.dir(
    req.body,
    {
      depth: null,
      colors: true,
    }
  );

  console.error(
    "Error:"
  );

  console.dir(
    err,
    {
      depth: null,
      colors: true,
    }
  );

  /* =====================================================
     ZOD ERROR
  ===================================================== */

  if (
    err instanceof ZodError
  ) {
    const details =
      err.issues.map(
        (issue) => ({
          field:
            issue.path.join(".") ||
            "body",

          code:
            issue.code,

          message:
            issue.message,

          ...(issue.code ===
          "too_small"
            ? {
                minimum:
                  "minimum" in
                  issue
                    ? issue.minimum
                    : undefined,

                type:
                  "type" in issue
                    ? issue.type
                    : undefined,
              }
            : {}),
        })
      );

    console.error(
      "ZOD VALIDATION DETAILS:"
    );

    console.dir(
      details,
      {
        depth: null,
        colors: true,
      }
    );

    console.error(
      "##################################################\n"
    );

    return res.status(400).json({
      error:
        "Validation failed",

      details,
    });
  }

  /* =====================================================
     APP ERROR
  ===================================================== */

  if (
    err instanceof AppError
  ) {
    console.error(
      "APP ERROR:",
      err.message
    );

    console.error(
      "STATUS:",
      err.statusCode
    );

    console.error(
      "##################################################\n"
    );

    return res
      .status(err.statusCode)
      .json({
        error:
          err.message,
      });
  }

  /* =====================================================
     UNKNOWN ERROR
  ===================================================== */

  console.error(
    "UNKNOWN SERVER ERROR"
  );

  console.error(
    "##################################################\n"
  );

  return res.status(500).json({
    error:
      process.env.NODE_ENV ===
      "production"
        ? "Internal server error"
        : err instanceof Error
        ? err.message
        : "Internal server error",
  });
}