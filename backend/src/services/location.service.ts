import { ObjectId } from "mongodb";

import { getDatabase } from "../db/mongo.js";
import type { UserDocument, UserLocation } from "../models/user.js";

export async function saveUserLocation(userId: string, location: UserLocation): Promise<UserLocation | null> {
  const database = await getDatabase();
  const result = await database.collection<UserDocument>("users").findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: { location, updatedAt: location.updatedAt } },
    { returnDocument: "after", projection: { location: 1 } }
  );

  return result?.location ?? null;
}

export async function getUserLocation(userId: string): Promise<UserLocation | null> {
  const database = await getDatabase();
  const user = await database.collection<UserDocument>("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { location: 1 } }
  );

  return user?.location ?? null;
}
