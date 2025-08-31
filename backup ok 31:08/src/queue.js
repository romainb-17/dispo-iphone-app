import { Queue, Worker, QueueScheduler } from 'bullmq';
import { connectRedis, redis } from './cache.js';
await connectRedis();
export const checkQueue = new Queue('check-availability', { connection: redis });
new QueueScheduler('check-availability', { connection: redis });
export function startCheckWorker(processor){
  const worker = new Worker('check-availability', async job => processor(job.data), { connection: redis, concurrency: 4 });
  worker.on('failed', (job, err) => console.error('Job failed', job?.id, err?.message));
  worker.on('error', err => console.error('Worker error', err));
  return worker;
}
