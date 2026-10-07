import { getDatabase } from "./mongo.js";

export async function ensureAuthIndexes(): Promise<void> {
  const database = await getDatabase();

  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true, name: "users_email_unique" }),
    database.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true, name: "sessions_token_hash_unique" }),
    database.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "sessions_expiry_ttl" })
  ]);
}
