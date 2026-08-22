'use strict';
/**
 * BullMQ worker for deep-diagnostic AND blueprint-generation jobs. Run as its
 * own PM2 process: pm2 start worker.js --name diag-worker
 * Shares the bridge's env (OPENROUTER_API_KEY, REDIS_*, DIAGNOSTIC_MODEL,
 * ZEROCLAW_URL, INTERNAL_TOKEN).
 *
 * Two independent BullMQ Workers in one process — deliberately not two pm2
 * processes, since both are lightweight and this avoids adding a second
 * always-on process for what's still a single logical "job runner" role.
 */
require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { QUEUE_NAME, redisOptions, runDeepDiagnostic } = require('./lib/diagnosticQueue');
const { QUEUE_NAME: BLUEPRINT_QUEUE_NAME, runBlueprintGeneration } = require('./lib/blueprintQueue');

const concurrency = parseInt(process.env.DIAGNOSTIC_WORKER_CONCURRENCY || '5', 10);
const blueprintConcurrency = parseInt(process.env.BLUEPRINT_WORKER_CONCURRENCY || '3', 10);

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`[diag-worker] processing job ${job.id}`);
    return await runDeepDiagnostic(job.data.payload);
  },
  { connection: new IORedis(redisOptions), concurrency }
);

worker.on('completed', (job) => {
  console.log(`[diag-worker] completed ${job.id} (score ${job.returnvalue?.ai_readiness_score})`);
});
worker.on('failed', (job, err) => {
  console.error(`[diag-worker] failed ${job?.id}: ${err?.message}`);
});

const blueprintWorker = new Worker(
  BLUEPRINT_QUEUE_NAME,
  async (job) => {
    console.log(`[blueprint-worker] processing job ${job.id}`);
    return await runBlueprintGeneration(job.data);
  },
  { connection: new IORedis(redisOptions), concurrency: blueprintConcurrency }
);

blueprintWorker.on('completed', (job) => {
  console.log(`[blueprint-worker] completed ${job.id} (${job.returnvalue?.content?.length || 0} chars)`);
});
blueprintWorker.on('failed', (job, err) => {
  console.error(`[blueprint-worker] failed ${job?.id}: ${err?.message}`);
});

console.log(`[diag-worker] started, queue=${QUEUE_NAME}, concurrency=${concurrency}`);
console.log(`[blueprint-worker] started, queue=${BLUEPRINT_QUEUE_NAME}, concurrency=${blueprintConcurrency}`);
