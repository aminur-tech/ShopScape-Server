import "dotenv/config";

/* =========================================================
   REQUIRED ENV HELPER
========================================================= */

function required(
  name: string,
  fallback?: string
): string {
  const value =
    process.env[name] ?? fallback;

  if (
    value === undefined ||
    value.trim() === ""
  ) {
    throw new Error(
      `Missing required env var: ${name}`
    );
  }

  return value;
}

/* =========================================================
   ENV
========================================================= */

export const env = {
  /* =======================================================
     SERVER
  ======================================================= */

  PORT: Number(
    process.env.PORT ?? 4000
  ),

  NODE_ENV:
    process.env.NODE_ENV ??
    "development",

  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
  GEMINI_TIMEOUT_MS: Number(process.env.GEMINI_TIMEOUT_MS ?? 30000),

  isProd:
    process.env.NODE_ENV ===
    "production",

  /* =======================================================
     JWT
  ======================================================= */

  JWT_SECRET: required(
    "JWT_SECRET",
    "dev-secret-change-me"
  ),

  JWT_EXPIRES_IN:
    process.env.JWT_EXPIRES_IN ??
    "7d",

  /* =======================================================
     FRONTEND
  ======================================================= */

  FRONTEND_URL:
    process.env.FRONTEND_URL ??
    "http://localhost:3000",

  /* =======================================================
     SUPABASE
  ======================================================= */

  SUPABASE_URL:
    process.env.SUPABASE_URL ?? "",

  SUPABASE_SERVICE_ROLE_KEY:
    process.env
      .SUPABASE_SERVICE_ROLE_KEY ?? "",

  SUPABASE_STORAGE_BUCKET:
    process.env
      .SUPABASE_STORAGE_BUCKET ??
    "shop-uploads",

  /* =======================================================
     PAYMENT
  ======================================================= */

  BKASH_RECEIVE_NUMBER:
    process.env
      .BKASH_RECEIVE_NUMBER ??
    "01XXXXXXXXX",

  NAGAD_RECEIVE_NUMBER:
    process.env
      .NAGAD_RECEIVE_NUMBER ??
    "01XXXXXXXXX",

  /* =======================================================
     ADMIN
  ======================================================= */

  SEED_ADMIN_EMAIL:
    process.env.SEED_ADMIN_EMAIL ??
    "admin@shopnofashion.com",

  SEED_ADMIN_PASSWORD:
    process.env.SEED_ADMIN_PASSWORD ??
    "ChangeMe123!",
};