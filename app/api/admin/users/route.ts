// GET /api/admin/users — list all users with quota usage (admin only).
import { NextResponse } from "next/server";
import { listUsers } from "@/lib/db";
import { getCurrentUserOrNull } from "@/lib/auth";
import { unauthorized, forbidden } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUserOrNull();
  if (!me) return unauthorized();
  if (me.role !== "admin") return forbidden();
  return NextResponse.json({ users: await listUsers() });
}
