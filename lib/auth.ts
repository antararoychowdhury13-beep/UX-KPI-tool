// Auth helper. In mock mode (no Supabase) it returns a seeded demo user so the app is fully usable
// without sign-in. When Supabase is configured, this should read the authenticated session via
// lib/supabase/server.ts and look up the matching users row.
import { CURRENT_USER_ID, getUser } from "@/lib/db";
import type { User } from "@/types/project";

export function getCurrentUser(): User {
  const user = getUser(CURRENT_USER_ID);
  if (!user) throw new Error("Mock demo user not seeded");
  return user;
}

export function getCurrentUserId(): string {
  return CURRENT_USER_ID;
}
