// Simple in-process job queue with optional persistence
// Jobs are processed FIFO with exponential backoff retry logic.

export type BackoffStrategy = "exp";

export interface EnqueueOptions {
  maxAttempts?: number;
  backoff?: BackoffStrategy;
  delayMs?: number;
}

export interface JobRecord {
  id: number;
  type: string;
  payload: unknown;
  status: "pending" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  nextRunAt: number;
  lastError?: string;
}

export type Processor = (payload: unknown, job: JobRecord) => Promise<void>;
export type ProcessorMap = Record<string, Processor>;

let processors: ProcessorMap = {};
let running = false;
let jobIdCounter = 1;
const jobStore = new Map<number, JobRecord>();
let queue: number[] = [];
let backoffBaseMs = 1000; // can be tuned for tests
const backoffCapMs = 30000;
let timer: ReturnType<typeof setTimeout> | null = null;

// Optional persistence via Supabase if available
interface SupabaseTableClient {
  upsert(values: Record<string, unknown>): Promise<unknown>;
}

interface SupabaseClientLike {
  from(table: string): SupabaseTableClient;
}

let supabaseClient: SupabaseClientLike | null = null;
export function setSupabase(client: SupabaseClientLike | null) {
  supabaseClient = client;
}

function sortQueue() {
  queue.sort((a, b) => {
    const ja = jobStore.get(a)!;
    const jb = jobStore.get(b)!;
    return ja.nextRunAt - jb.nextRunAt;
  });
}

async function persist(job: JobRecord) {
  if (!supabaseClient) return;
  try {
    const record: Record<string, unknown> = {
      id: job.id,
      type: job.type,
      payload: job.payload,
      status: job.status,
      attempts: job.attempts,
      next_run_at: new Date(job.nextRunAt).toISOString(),
      last_error: job.lastError ?? null,
    };
    await supabaseClient.from("jobs").upsert(record);
  } catch (_) {
    // ignore persistence errors
  }
}

export function setBackoffBase(ms: number) {
  backoffBaseMs = ms;
}

export function enqueue(
  type: string,
  payload: unknown,
  opts: EnqueueOptions = {},
) {
  const job: JobRecord = {
    id: jobIdCounter++,
    type,
    payload,
    status: "pending",
    attempts: 0,
    maxAttempts: opts.maxAttempts ?? 5,
    nextRunAt: Date.now() + (opts.delayMs ?? 0),
  };
  jobStore.set(job.id, job);
  queue.push(job.id);
  sortQueue();
  persist(job);
  if (running) scheduleNext();
  return job.id;
}

function calculateBackoff(attempt: number): number {
  const delay = backoffBaseMs * Math.pow(2, attempt - 1);
  return Math.min(delay, backoffCapMs);
}

async function processJob(job: JobRecord) {
  const processor = processors[job.type];
  if (!processor) {
    job.status = "failed";
    job.lastError = "no processor";
    await persist(job);
    return;
  }
  try {
    await processor(job.payload, job);
    job.status = "completed";
    await persist(job);
  } catch (err) {
    job.attempts += 1;
    job.lastError = err instanceof Error ? err.message : String(err);
    if (job.attempts < job.maxAttempts) {
      job.nextRunAt = Date.now() + calculateBackoff(job.attempts);
      queue.push(job.id);
      sortQueue();
    } else {
      job.status = "failed";
    }
    await persist(job);
  }
}

function scheduleNext() {
  if (!running) return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;

  const id = queue[0];
  const job = jobStore.get(id);
  if (!job) {
    queue.shift();
    scheduleNext();
    return;
  }
  const delay = Math.max(job.nextRunAt - Date.now(), 0);
  timer = setTimeout(async () => {
    queue.shift();
    await processJob(job);
    scheduleNext();
  }, delay);
}

export function startWorker(map: ProcessorMap) {
  processors = map;
  if (running) return;
  running = true;
  scheduleNext();
}

export function stopWorker() {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

export function pendingJobs(): JobRecord[] {
  return queue.map((id) => jobStore.get(id)!).filter(Boolean);
}

export function clearQueue() {
  queue = [];
  jobStore.clear();
  jobIdCounter = 1;
}
