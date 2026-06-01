// PATCH /api/admin/quota — update a user's analysis quota (admin only).
import { NextResponse } from "next/server";
import { setQuota } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readJson, badRequest } from "@/lib/http";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  if ((await getCurrentUser()).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await readJson<{ userId?: string; quota_analyses?: number }>(req);
  if (!body?.userId || typeof body.quota_analyses !== "number") {
    return badRequest("userId and quota_analyses are required");
  }
  const user = await setQuota(body.userId, body.quota_analyses);
  if (!user) return NextResponse.json({ error: "Unknown user" }, { status: 404 });
  return NextResponse.json({ user });
}
