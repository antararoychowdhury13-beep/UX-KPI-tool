// Analysis queue. Always go through here — never run AI analysis directly in an HTTP handler.
// With Redis (Upstash) configured this enqueues a BullMQ job; in mock/local mode it processes
// inline so the app works end-to-end without a queue.
import { hasRedis } from "@/lib/config";
import { createJob, getJob } from "@/lib/db";
import { processAnalysis } from "@/lib/queue/workers/analyzeScreenshots";

export const ANALYSIS_QUEUE = "analysis";

export interface EnqueueResult {
  jobId: string;
  /** Job status after enqueue: "completed"/"failed" for inline runs, "queued" when handed to BullMQ. */
  status: "queued" | "completed" | "failed";
}

/** Queue or inline-run an analysis. Inline runs are AWAITED so they complete within the request
 *  (required on serverless/edge where the in-memory job store doesn't survive across requests). */
export async function enqueueAnalysis(projectId: string): Promise<EnqueueResult> {
  const job = createJob(projectId);

  if (hasRedis) {
    const { Queue } = await import("bullmq");
    // BullMQ needs a redis:// connection (not the Upstash REST URL). Let it manage its own
    // ioredis instance from options to avoid dual-package type/version skew.
    const queue = new Queue(ANALYSIS_QUEUE, {
      connection: { url: process.env.UPSTASH_REDIS_REST_URL! },
    });
    await queue.add("analyze", { projectId, jobId: job.id });
    return { jobId: job.id, status: "queued" };
  }

  // Inline: run to completion before returning so the result is ready immediately.
  await processAnalysis(projectId, job.id);
  const finished = getJob(job.id);
  return { jobId: job.id, status: finished?.status === "failed" ? "failed" : "completed" };
}
