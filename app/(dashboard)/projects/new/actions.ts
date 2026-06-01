"use server";

import { redirect } from "next/navigation";
import { createProject } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/projects/new?error=name");

  const project = await createProject({
    user_id: getCurrentUserId(),
    name,
    description: String(formData.get("description") ?? ""),
    flow_type: String(formData.get("flow_type") ?? "custom"),
  });

  redirect(`/projects/${project.id}/upload`);
}
