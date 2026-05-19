import type { User } from "../../drizzle/schema";

export const AUTH_BYPASS_ENABLED = true;

export function createAuthBypassUser(): User {
  const now = new Date();

  return {
    id: 1,
    openId: "auth-bypass-open-id",
    name: "Admin User",
    email: "admin@local.test",
    loginMethod: "auth-bypass",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}
