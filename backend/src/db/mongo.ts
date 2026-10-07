import { Db, MongoClient } from "mongodb";

import { env } from "../config/env.js";

let client: MongoClient | null = null;
let connectionPromise: Promise<MongoClient> | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (client) return client;

  if (!connectionPromise) {
    const pendingClient = new MongoClient(env.mongoUri, {
      serverSelectionTimeoutMS: 5_000
    });
    connectionPromise = pendingClient.connect().then((connectedClient) => {
      client = connectedClient;
      return connectedClient;
    }).finally(() => {
      connectionPromise = null;
    });
  }

  return connectionPromise;
}

export async function getDatabase(): Promise<Db> {
  const connectedClient = await getMongoClient();
  return connectedClient.db();
}

export async function checkDatabaseConnection(): Promise<"connected" | "unconfigured" | "unavailable"> {
  if (!env.mongoUri) return "unconfigured";

  try {
    const database = await getDatabase();
    await database.command({ ping: 1 });
    return "connected";
  } catch {
    return "unavailable";
  }
}

export async function closeMongoClient(): Promise<void> {
  if (client) {
    await client.close();
  }

  client = null;
  connectionPromise = null;
}
