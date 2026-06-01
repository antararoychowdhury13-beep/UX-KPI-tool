// Analysis queue. Always go through here — never run AI analysis directly in an HTTP handler.
// With Redis (Upstash) configured this enqueues a BullMQ job; in mock/local mode it processes
// inline so the app works end-to-end without a queue.
import { hasRedis } from "@/lib/config";
import { createJob } from "@/lib/db";
import { processAnalysis } from "@/lib/queue/workers/analyzeScreenshots";

export const ANALYSIS_QUEUE = "analysis";

/** Queue (or inline-run) an analysis job for a project. Returns the job id to poll. */
export async function enqueueAnalysis(projectId: string): Promise<string> {
  const job = createJob(projectId);

  if (hasRedis) {
    const { Queue } = await import("bullmq");
    // BullMQ needs a redis:// connection (not the Upstash REST URL). Let it manage its own
    // ioredis instance from options to avoid dual-package type/version skew.
    const queue = new Queue(ANALYSIS_QUEUE, {
      connection: { url: process.env.UPSTASH_REDIS_REST_URL! },
    });
    await queue.add("analyze", { projectId, jobId: job.id });
  } else {
    // Inline processing for local/mock mode. Fire-and-forget so the route can return the job id;
    // the client polls GET /api/analyze/[job_id]. In a single dev process the store is shared.
    void processAnalysis(projectId, job.id);
  }

  return job.id;
}
