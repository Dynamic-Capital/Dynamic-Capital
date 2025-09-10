import { Queue as BullQueue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

export type BackoffStrategy = 'exp';

export interface EnqueueOptions {
  maxAttempts?: number;
  backoff?: BackoffStrategy;
  delayMs?: number;
}

export type Processor = (payload: unknown, job: Job) => Promise<void>;
export type ProcessorMap = Record<string, Processor>;

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379');
const queueName = 'jobs';
const queue = new BullQueue(queueName, { connection });
let worker: Worker | null = null;

export async function enqueue(
  type: string,
  payload: unknown,
  opts: EnqueueOptions = {},
) {
  const job = await queue.add(type, payload, {
    attempts: opts.maxAttempts ?? 5,
    backoff: opts.backoff === 'exp' ? { type: 'exponential' } : undefined,
    delay: opts.delayMs ?? 0,
  });
  return Number(job.id);
}

export function startWorker(map: ProcessorMap) {
  if (worker) return;
  worker = new Worker(
    queueName,
    async (job) => {
      const fn = map[job.name];
      if (!fn) throw new Error('no processor');
      await fn(job.data, job);
    },
    { connection },
  );
}

export async function stopWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
}

export interface JobRecord {
  id: number;
  type: string;
  payload: unknown;
  status: 'pending' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  nextRunAt: number;
  lastError?: string;
}

export async function pendingJobs(): Promise<JobRecord[]> {
  const jobs = await queue.getJobs(['waiting', 'delayed']);
  return jobs.map((job) => ({
    id: Number(job.id),
    type: job.name,
    payload: job.data,
    status: 'pending',
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts ?? 0,
    nextRunAt: job.timestamp + (job.delay || 0),
    lastError: job.failedReason ?? undefined,
  }));
}

export async function clearQueue() {
  await queue.drain();
  await queue.clean(0, 0, 'failed');
}
