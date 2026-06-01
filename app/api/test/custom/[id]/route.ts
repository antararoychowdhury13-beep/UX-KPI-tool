// DELETE /api/test/custom/[id] — remove a custom test (scoped to the user).
import { NextResponse } from "next/server";
import { deleteCustomTest, recordAudit } from "@/lib/db";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  await deleteCustomTest(params.id, userId);
  await recordAudit({ user_id: userId, action: "custom_test.deleted", entity_type: "custom_test", entity_id: params.id });
  return NextResponse.json({ ok: true });
}
