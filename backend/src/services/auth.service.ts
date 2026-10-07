import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { ObjectId, type ObjectId as MongoObjectId } from "mongodb";

import { env } from "../config/env.js";
import { getDatabase } from "../db/mongo.js";
import type { SafeUser, SessionDocument, UserDocument } from "../models/user.js";
import { toSafeUser } from "../models/user.js";

const PASSWORD_SALT_ROUNDS = 12;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionExpiry(): Date {
  return new Date(Date.now() + env.sessionTtlDays * 24 * 60 * 60 * 1000);
}

export async function createUser(name: string, email: string, password: string): Promise<UserDocument> {
  const database = await getDatabase();
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  const user: UserDocument = { _id: new ObjectId(), name, email, passwordHash, createdAt: now, updatedAt: now };

  await database.collection<UserDocument>("users").insertOne(user);
  return user;
}

export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  const database = await getDatabase();
  return database.collection<UserDocument>("users").findOne({ email });
}

export async function verifyPassword(user: UserDocument, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function createSession(userId: MongoObjectId): Promise<{ token: string; expiresAt: Date }> {
  const database = await getDatabase();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = sessionExpiry();
  const session: SessionDocument = {
    _id: new ObjectId(),
    userId,
    tokenHash: hashSessionToken(token),
    createdAt: new Date(),
    expiresAt
  };

  await database.collection<SessionDocument>("sessions").insertOne(session);
  return { token, expiresAt };
}

export async function getUserForSession(token: string): Promise<SafeUser | null> {
  const database = await getDatabase();
  const session = await database.collection<SessionDocument>("sessions").findOne({
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: new Date() }
  });
  if (!session) return null;

  const user = await database.collection<UserDocument>("users").findOne({ _id: session.userId });
  return user ? toSafeUser(user) : null;
}

export async function deleteSession(token: string): Promise<void> {
  const database = await getDatabase();
  await database.collection<SessionDocument>("sessions").deleteOne({ tokenHash: hashSessionToken(token) });
}
