import "dotenv/config";

function parsePort(value: string | undefined): number {
  if (!value) return 3000;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

export const env = {
  port: parsePort(process.env.PORT),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongoUri: process.env.MONGODB_URI,
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5500,http://127.0.0.1:5500")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
};
