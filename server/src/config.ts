import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Load the repo-root .env (one file configures both server and the values the
// browser fetches via GET /api/config).
loadEnv({ path: resolve(process.cwd(), "../.env") });
loadEnv(); // also allow a local server/.env to override, if present

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  get isProd() {
    return this.nodeEnv === "production";
  },
  port: Number(process.env.PORT ?? 8787),
  dbPath: process.env.DB_PATH ?? "./data/openavail.db",
  googleClientId: required("GOOGLE_CLIENT_ID", "missing-client-id"),
  adminEmail: required("ADMIN_EMAIL", "admin@example.com").toLowerCase(),
  ownerName: process.env.OWNER_NAME ?? "OpenAvail",
  publicUrl: (process.env.PUBLIC_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  inviteTtlMs: 24 * 60 * 60 * 1000,
  sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
};
