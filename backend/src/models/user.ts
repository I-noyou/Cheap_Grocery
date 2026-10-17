import type { ObjectId } from "mongodb";

export type UserRole = "user" | "admin";

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  updatedAt: Date;
}

export interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  location?: UserLocation;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDocument {
  _id: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export function getPersistedUserRole(role: unknown): UserRole | null {
  if (role === undefined) return "user";
  return role === "user" || role === "admin" ? role : null;
}

export function toSafeUser(user: UserDocument): SafeUser {
  const role = getPersistedUserRole(user.role);
  if (!role) throw new Error("User has an invalid role.");

  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    role,
    createdAt: user.createdAt
  };
}
