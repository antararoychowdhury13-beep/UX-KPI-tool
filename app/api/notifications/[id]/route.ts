// PATCH /api/notifications/[id] — mark one notification read (scoped to the current user).
import { NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/db";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  await markNotificationRead(params.id, userId);
  return NextResponse.json({ ok: true });
}
