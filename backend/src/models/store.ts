import type { ObjectId } from "mongodb";

export interface StoreAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface StoreDocument {
  _id: ObjectId;
  name: string;
  address: StoreAddress;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  phone?: string;
  website?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
