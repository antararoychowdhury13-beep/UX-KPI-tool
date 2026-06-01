"use server";

import { revalidatePath } from "next/cache";
import { updateProject, getProject } from "@/lib/db";

export async function updateProjectSettings(formData: FormData) {
  const id = String(formData.get("projectId") ?? "");
  if (!getProject(id)) return;
  updateProject(id, {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    flow_type: String(formData.get("flow_type") ?? "custom"),
  });
  revalidatePath(`/projects/${id}/upload`);
}
