// Auth helper. With Supabase configured, resolves the signed-in user from the session cookie and
// ensures a matching public.users row. In mock mode (no Supabase) it returns the seeded demo user.
import { cache } from "react";
import { hasSupabase } from "@/lib/config";
import { CURRENT_USER_ID, getUser } from "@/lib/db";
import { ensureUser } from "@/lib/db/supabase";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types/project";

// Memoized per request so repeated calls (layout + page) don't re-query.
export const getCurrentUser = cache(async (): Promise<User> => {
  if (!hasSupabase) {
    const u = await getUser(CURRENT_USER_ID);
    if (!u) throw new Error("Demo user not seeded — run npm run seed:supabase or unset Supabase env.");
    return u;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return ensureUser({
    id: user.id,
    email: user.email ?? "",
    full_name: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "User",
  });
});

export async function getCurrentUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}

/** Non-throwing variants for API routes that should return 401 (not 500) when unauthenticated. */
export async function getCurrentUserOrNull(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function getCurrentUserIdOrNull(): Promise<string | null> {
  return (await getCurrentUserOrNull())?.id ?? null;
}

/** True when a session exists (used to decide redirects). */
export async function isAuthenticated(): Promise<boolean> {
  if (!hasSupabase) return true;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}
