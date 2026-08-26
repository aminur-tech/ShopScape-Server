import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",

  JWT_SECRET: required("JWT_SECRET", "dev-secret-change-me"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",

  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  SMTP_FROM: process.env.SMTP_FROM ?? "ShopScape <no-reply@shopnofashion.com>",

  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3000",

  SUPABASE_URL: process.env.SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET ?? "shop-uploads",

  BKASH_RECEIVE_NUMBER: process.env.BKASH_RECEIVE_NUMBER ?? "01XXXXXXXXX",
  NAGAD_RECEIVE_NUMBER: process.env.NAGAD_RECEIVE_NUMBER ?? "01XXXXXXXXX",

  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL ?? "admin@shopnofashion.com",
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!",
};
