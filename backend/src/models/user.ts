import type { ObjectId } from "mongodb";

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
  createdAt: Date;
}

export function toSafeUser(user: UserDocument): SafeUser {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}
