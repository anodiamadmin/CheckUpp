import { UserRole } from "@prisma/client";

export interface AuthContext {
  userId: string;
  email: string;
  role: UserRole;
  firebaseUid?: string;
}
