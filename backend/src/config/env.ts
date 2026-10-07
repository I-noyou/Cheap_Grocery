import "dotenv/config";

function parsePort(value: string | undefined): number {
  if (!value) return 3000;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function parseBoundedInteger(value: string | undefined, fallback: number, name: string, min: number, max: number): number {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }

  return parsed;
}

export const env = {
  port: parsePort(process.env.PORT),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongoUri: process.env.MONGODB_URI,
  sessionTtlDays: parseBoundedInteger(process.env.SESSION_TTL_DAYS, 7, "SESSION_TTL_DAYS", 1, 30),
  authRateLimitMax: parseBoundedInteger(process.env.AUTH_RATE_LIMIT_MAX, 10, "AUTH_RATE_LIMIT_MAX", 1, 100),
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5500,http://127.0.0.1:5500")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
};
