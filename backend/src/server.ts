import { app } from "./app.js";
import { env } from "./config/env.js";
import { closeMongoClient } from "./db/mongo.js";
import { ensureAuthIndexes } from "./db/auth-indexes.js";
import { ensureStoreIndexes } from "./db/store-indexes.js";

async function startServer(): Promise<void> {
  if (env.mongoUri) {
    try {
      await Promise.all([ensureAuthIndexes(), ensureStoreIndexes()]);
    } catch {
      console.error("Database initialization failed; the health endpoint will report the database as unavailable.");
    }
  }

  server = app.listen(env.port, () => {
    console.log(`Cheap Grocery API listening on port ${env.port}`);
  });
}

let server: ReturnType<typeof app.listen>;

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received; shutting down.`);
  if (!server) {
    await closeMongoClient();
    process.exit(0);
  }

  server.close(async () => {
    await closeMongoClient();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void startServer();
