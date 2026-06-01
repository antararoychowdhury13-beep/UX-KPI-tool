"use server";

import { revalidatePath } from "next/cache";
import { updateProject } from "@/lib/db";
import { getCurrentUserId, getOwnedProject } from "@/lib/auth";

export async function updateProjectSettings(formData: FormData) {
  const id = String(formData.get("projectId") ?? "");
  if (!(await getOwnedProject(id, await getCurrentUserId()))) return;
  await updateProject(id, {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    flow_type: String(formData.get("flow_type") ?? "custom"),
  });
  revalidatePath(`/projects/${id}/upload`);
}
