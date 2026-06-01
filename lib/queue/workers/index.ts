// BullMQ worker entrypoint (`npm run worker`). Runs as a separate process in production
// (Railway per spec §11). In mock/local mode analysis runs inline, so this worker only does
// real work when Redis is configured.
import { hasRedis } from "@/lib/config";
import { ANALYSIS_QUEUE } from "@/lib/queue/analysisQueue";
import { processAnalysis } from "@/lib/queue/workers/analyzeScreenshots";

async function main() {
  if (!hasRedis) {
    console.log(
      "[worker] No Redis configured — analysis runs inline in the app. Worker idle.",
    );
    return;
  }

  const { Worker } = await import("bullmq");

  new Worker(
    ANALYSIS_QUEUE,
    async (job) => {
      const { projectId, jobId } = job.data as {
        projectId: string;
        jobId: string;
      };
      await processAnalysis(projectId, jobId);
    },
    { connection: { url: process.env.UPSTASH_REDIS_REST_URL! } },
  );

  console.log(`[worker] Listening on queue "${ANALYSIS_QUEUE}"`);
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
