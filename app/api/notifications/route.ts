// GET /api/notifications — list the current user's notifications (newest first).
import { NextResponse } from "next/server";
import { listNotifications } from "@/lib/db";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { unauthorized } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const notifications = await listNotifications(userId);
  return NextResponse.json({
    notifications,
    unread: notifications.filter((n) => !n.is_read).length,
  });
}
