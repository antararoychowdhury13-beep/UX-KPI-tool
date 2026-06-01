// /api/admin/service — manage AI services (admin only).
//   POST   create a new service
//   PATCH  update an existing service (incl. enable/disable)
//   DELETE remove a service
import { NextResponse } from "next/server";
import { createAIService, updateAIService, deleteAIService, listAIServices } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readJson, badRequest } from "@/lib/http";

export const runtime = "nodejs";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  if (getCurrentUser().role !== "admin") return forbidden();
  const body = await readJson<{
    name?: string;
    slug?: string;
    role?: string;
    provider?: string;
    model?: string;
    env_var?: string;
  }>(req);
  if (!body?.name) return badRequest("name is required");
  const { service, error } = createAIService(body as { name: string });
  if (error) return badRequest(error);
  return NextResponse.json({ service, services: listAIServices() }, { status: 201 });
}

export async function PATCH(req: Request) {
  if (getCurrentUser().role !== "admin") return forbidden();
  const body = await readJson<{
    id?: string;
    name?: string;
    role?: string;
    provider?: string;
    model?: string;
    env_var?: string;
    enabled?: boolean;
  }>(req);
  if (!body?.id) return badRequest("id is required");
  const { id, ...patch } = body;
  const { service, error } = updateAIService(id, patch);
  if (error) return NextResponse.json({ error }, { status: 404 });
  return NextResponse.json({ service, services: listAIServices() });
}

export async function DELETE(req: Request) {
  if (getCurrentUser().role !== "admin") return forbidden();
  const body = await readJson<{ id?: string }>(req);
  if (!body?.id) return badRequest("id is required");
  const ok = deleteAIService(body.id);
  if (!ok) return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  return NextResponse.json({ services: listAIServices() });
}
