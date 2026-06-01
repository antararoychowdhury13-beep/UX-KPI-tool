// Pass-through middleware scaffold. Route protection / session refresh is wired in Milestone 1.
import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  // TODO (Milestone 1): refresh Supabase session and guard (dashboard) + /admin routes.
  return NextResponse.next();
}

export const config = {
  // Run on app routes, excluding static assets and image optimization.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
