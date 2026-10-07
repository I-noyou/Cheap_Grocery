import type { SafeUser } from "../models/user.js";

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: SafeUser;
    }
  }
}

export {};
