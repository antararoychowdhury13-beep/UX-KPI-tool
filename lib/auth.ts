// Auth helper. In mock mode (no Supabase) it returns the seeded demo user. With Supabase configured
// it looks up the current user row (Stage 1 still uses the fixed demo id; real session auth is Stage 2).
import { CURRENT_USER_ID, getUser } from "@/lib/db";
import type { User } from "@/types/project";

export async function getCurrentUser(): Promise<User> {
  const user = await getUser(CURRENT_USER_ID);
  if (!user) {
    throw new Error(
      "Demo user not found. Seed it into Supabase (npm run seed:supabase) or run without Supabase env vars.",
    );
  }
  return user;
}

export function getCurrentUserId(): string {
  return CURRENT_USER_ID;
}
