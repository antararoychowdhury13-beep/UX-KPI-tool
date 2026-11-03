// Supabase Storage helpers for screenshots (and report PDFs). Service-role client; no-store fetch.
// In mock mode (no Supabase) uploads are skipped and a mock:// path is returned.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabase } from "@/lib/config";

const SCREENSHOTS = "project-screenshots";
const REPORTS = "reports";

/**
 * Mock-mode blob store. Without Supabase we used to throw uploaded bytes away,
 * which silently made real vision analysis impossible even with a provider key
 * configured. Bytes now live here for the process lifetime so the vision path is
 * reachable in demo mode. Not durable: cleared on restart, single-process only.
 */
const memoryBlobs = new Map<string, { bytes: Uint8Array; contentType: string }>();
const MAX_MEMORY_BLOBS = 200;

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (i: RequestInfo | URL, init?: RequestInit) => fetch(i, { ...init, cache: "no-store" }) },
      },
    );
  }
  return client;
}

/** Upload screenshot bytes; returns the storage path (or a mock path in mock mode). */
export async function uploadScreenshot(
  projectId: string,
  type: string,
  seq: number,
  fileName: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const path = `${projectId}/${type}/${String(seq).padStart(2, "0")}-${fileName}`;
  if (!hasSupabase) {
    const mockPath = `mock://${SCREENSHOTS}/${path}`;
    if (memoryBlobs.size >= MAX_MEMORY_BLOBS) {
      const oldest = memoryBlobs.keys().next().value;
      if (oldest) memoryBlobs.delete(oldest);
    }
    memoryBlobs.set(mockPath, { bytes, contentType });
    return mockPath;
  }
  const { error } = await sb().storage.from(SCREENSHOTS).upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

/** Remove a screenshot object from storage (best-effort; no-op in mock mode). */
export async function removeScreenshot(path: string): Promise<void> {
  if (!hasSupabase || !path || path.startsWith("mock://")) return;
  try {
    await sb().storage.from(SCREENSHOTS).remove([path]);
  } catch {
    /* best-effort */
  }
}

/** Signed, time-limited URL for displaying a private screenshot; null in mock mode / on error. */
export async function signedScreenshotUrl(path: string, expiresIn = 3600): Promise<string | null> {
  if (!hasSupabase || !path || path.startsWith("mock://")) return null;
  const { data, error } = await sb().storage.from(SCREENSHOTS).createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Download a screenshot as base64 for the vision model; null if unavailable/mock. */
export async function downloadScreenshotBase64(
  path: string,
): Promise<{ data: string; mimeType: string } | null> {
  if (path.startsWith("mock://")) {
    const blob = memoryBlobs.get(path);
    if (!blob) return null;
    return {
      data: Buffer.from(blob.bytes).toString("base64"),
      mimeType: blob.contentType || "image/png",
    };
  }
  if (!hasSupabase) return null;
  const { data, error } = await sb().storage.from(SCREENSHOTS).download(path);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  return { data: buf.toString("base64"), mimeType: data.type || "image/png" };
}

/** Upload a report PDF; returns the storage path (or null in mock mode). */
export async function uploadReportPdf(reportId: string, bytes: Uint8Array): Promise<string | null> {
  if (!hasSupabase) return null;
  const path = `${reportId}.pdf`;
  const { error } = await sb().storage.from(REPORTS).upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}
