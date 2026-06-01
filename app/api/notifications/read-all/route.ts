// PATCH /api/notifications/read-all — mark all of the current user's notifications read.
import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/db";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function PATCH() {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  await markAllNotificationsRead(userId);
  return NextResponse.json({ ok: true });
}
