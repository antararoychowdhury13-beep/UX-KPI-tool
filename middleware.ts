// Refreshes the Supabase session and guards protected routes. In mock mode (no Supabase env),
// it's a pass-through so the app still runs without auth configured.
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabase } from "@/lib/config";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (!hasSupabase) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  // Run on app routes, excluding static assets and image optimization.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
