import { app } from "./app.js";
import { env } from "./config/env.js";
import { closeDatabasePool } from "./db/pool.js";

const server = app.listen(env.port, () => {
  console.log(`Cheap Grocery API listening on port ${env.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await closeDatabasePool();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
