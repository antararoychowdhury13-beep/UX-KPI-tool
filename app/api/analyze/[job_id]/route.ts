// GET /api/analyze/[job_id] — poll analysis job status.
import { NextResponse } from "next/server";
import { getJob, getAnalysis } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { job_id: string } },
) {
  const job = getJob(params.job_id);
  if (!job) {
    return NextResponse.json({ error: "Unknown job" }, { status: 404 });
  }
  const analysis = job.analysis_id ? getAnalysis(job.analysis_id) : null;
  return NextResponse.json({ job, analysis });
}
