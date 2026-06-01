// GET /api/admin/users — list all users with quota usage (admin only).
import { NextResponse } from "next/server";
import { listUsers } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  if (getCurrentUser().role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ users: listUsers() });
}
