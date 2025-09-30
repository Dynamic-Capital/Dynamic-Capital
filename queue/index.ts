// Simple job queue with optional persistence.
// Jobs are processed FIFO with exponential backoff retry logic. The queue
// stores state in Redis when available, falling back to an in-memory store for
// tests.

import process from "node:process";
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

type RedisScoreMember = { score: number; member: string };

type RedisClient = {
  set(key: string, value: string): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  zadd(
    key: string,
    member: RedisScoreMember | RedisScoreMember[],
  ): Promise<number>;
  zrem(key: string, ...members: string[]): Promise<number>;
  zrange(
    key: string,
    start: number,
    stop: number,
    options?: {
      withScores?: boolean;
      byScore?: { min: string; max: string };
      limit?: { offset: number; count: number };
    },
  ): Promise<string[]>;
  eval<T = unknown>(script: string, keys: string[], args: string[]): Promise<T>;
};

interface QueueBackend {
  init(): Promise<void>;
  nextId(): Promise<number>;
  storeJob(job: JobRecord): Promise<void>;
  requeueJob(job: JobRecord): Promise<void>;
  markJobDone(job: JobRecord): Promise<void>;
  popDueJob(now: number): Promise<JobRecord | null>;
  peekNext(): Promise<JobRecord | null>;
  listPending(): Promise<JobRecord[]>;
  clear(): Promise<void>;
}

const QUEUE_KEY = "dct:queue:schedule";
const JOB_KEY_PREFIX = "dct:queue:job:";
const JOB_ID_KEY = "dct:queue:next_id";

const POP_READY_LUA = `
local id = redis.call("ZRANGEBYSCORE", KEYS[1], "-inf", ARGV[1], "LIMIT", 0, 1)[1]
if not id then return nil end
redis.call("ZREM", KEYS[1], id)
return id
`;

function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && typeof process.env !== "undefined") {
    const value = process.env[name];
    if (value !== undefined) return value;
  }
  if (typeof Deno !== "undefined") {
    try {
      const value = Deno.env?.get?.(name);
      if (value !== undefined) return value;
    } catch (_) {
      // ignore when env access is not permitted
    }
  }
  return undefined;
}

function isTestEnvironment(): boolean {
  const nodeEnv = getEnv("NODE_ENV");
  if (nodeEnv && nodeEnv.toLowerCase() === "test") return true;
  const denoTesting = getEnv("DENO_TESTING") ?? getEnv("DENO_TEST");
  if (denoTesting === "1" || denoTesting?.toLowerCase() === "true") {
    return true;
  }
  return false;
}

class MemoryQueueBackend implements QueueBackend {
  #jobStore = new Map<number, JobRecord>();
  #queue: number[] = [];
  #nextId = 1;

  init(): Promise<void> {
    return Promise.resolve();
  }

  nextId(): Promise<number> {
    return Promise.resolve(this.#nextId++);
  }

  storeJob(job: JobRecord): Promise<void> {
    this.#jobStore.set(job.id, job);
    this.#queue.push(job.id);
    this.#sortQueue();
    return Promise.resolve();
  }

  requeueJob(job: JobRecord): Promise<void> {
    this.#jobStore.set(job.id, job);
    this.#queue = this.#queue.filter((id) => id !== job.id);
    this.#queue.push(job.id);
    this.#sortQueue();
    return Promise.resolve();
  }

  markJobDone(job: JobRecord): Promise<void> {
    this.#jobStore.set(job.id, job);
    this.#queue = this.#queue.filter((id) => id !== job.id);
    return Promise.resolve();
  }

  popDueJob(now: number): Promise<JobRecord | null> {
    for (let i = 0; i < this.#queue.length; i++) {
      const id = this.#queue[i];
      const job = this.#jobStore.get(id);
      if (!job) continue;
      if (job.nextRunAt <= now) {
        this.#queue.splice(i, 1);
        return Promise.resolve(job);
      }
    }
    return Promise.resolve(null);
  }

  peekNext(): Promise<JobRecord | null> {
    if (this.#queue.length === 0) return null;
    const id = this.#queue[0];
    return Promise.resolve(this.#jobStore.get(id) ?? null);
  }

  listPending(): Promise<JobRecord[]> {
    const pending = this.#queue
      .map((id) => this.#jobStore.get(id))
      .filter((job): job is JobRecord => Boolean(job));
    return Promise.resolve(pending);
  }

  clear(): Promise<void> {
    this.#queue = [];
    this.#jobStore.clear();
    this.#nextId = 1;
    return Promise.resolve();
  }

  #sortQueue() {
    this.#queue.sort((a, b) => {
      const ja = this.#jobStore.get(a)!;
      const jb = this.#jobStore.get(b)!;
      return ja.nextRunAt - jb.nextRunAt;
    });
  }
}

class RedisQueueBackend implements QueueBackend {
  #clientPromise: Promise<RedisClient> | null = null;

  async init(): Promise<void> {
    await this.#getClient();
  }

  async nextId(): Promise<number> {
    const client = await this.#getClient();
    return await client.incr(JOB_ID_KEY);
  }

  async storeJob(job: JobRecord): Promise<void> {
    const client = await this.#getClient();
    await client.set(this.#jobKey(job.id), JSON.stringify(job));
    await client.zadd(QUEUE_KEY, {
      score: job.nextRunAt,
      member: String(job.id),
    });
  }

  async requeueJob(job: JobRecord): Promise<void> {
    const client = await this.#getClient();
    await client.set(this.#jobKey(job.id), JSON.stringify(job));
    await client.zadd(QUEUE_KEY, {
      score: job.nextRunAt,
      member: String(job.id),
    });
  }

  async markJobDone(job: JobRecord): Promise<void> {
    const client = await this.#getClient();
    await client.zrem(QUEUE_KEY, String(job.id));
    await client.del(this.#jobKey(job.id));
  }

  async popDueJob(now: number): Promise<JobRecord | null> {
    const client = await this.#getClient();
    const id = await client.eval<string | null>(POP_READY_LUA, [QUEUE_KEY], [
      String(now),
    ]);
    if (!id) return null;
    const job = await this.#getJob(client, id);
    if (!job) {
      return await this.popDueJob(now);
    }
    return job;
  }

  async peekNext(): Promise<JobRecord | null> {
    const client = await this.#getClient();
    const response = await client.zrange(QUEUE_KEY, 0, 0, { withScores: true });
    if (response.length < 2) return null;
    const [id] = response;
    const job = await this.#getJob(client, id);
    return job;
  }

  async listPending(): Promise<JobRecord[]> {
    const client = await this.#getClient();
    const ids = await client.zrange(QUEUE_KEY, 0, -1);
    const jobs: JobRecord[] = [];
    for (const id of ids) {
      const job = await this.#getJob(client, id);
      if (job) jobs.push(job);
    }
    return jobs;
  }

  async clear(): Promise<void> {
    const client = await this.#getClient();
    const ids = await client.zrange(QUEUE_KEY, 0, -1);
    if (ids.length > 0) {
      const keys = ids.map((id) => this.#jobKey(Number(id)));
      await client.del(...keys);
    }
    await client.del(QUEUE_KEY);
    await client.del(JOB_ID_KEY);
  }

  async #getClient(): Promise<RedisClient> {
    if (!this.#clientPromise) {
      const url = getEnv("UPSTASH_REDIS_REST_URL");
      const token = getEnv("UPSTASH_REDIS_REST_TOKEN");
      if (!url || !token) {
        throw new Error(
          "Redis queue requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
        );
      }
      this.#clientPromise = (async () => {
        const mod = await import("@upstash/redis");
        return new mod.Redis({ url, token }) as RedisClient;
      })();
    }
    return this.#clientPromise;
  }

  async #getJob(client: RedisClient, id: string): Promise<JobRecord | null> {
    const raw = await client.get(this.#jobKey(Number(id)));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as JobRecord;
    } catch (_) {
      return null;
    }
  }

  #jobKey(id: number): string {
    return `${JOB_KEY_PREFIX}${id}`;
  }
}

let processors: ProcessorMap = {};
let running = false;
let backoffBaseMs = 1000; // can be tuned for tests
const backoffCapMs = 30000;
let timer: ReturnType<typeof setTimeout> | null = null;
const backend: QueueBackend = isTestEnvironment()
  ? new MemoryQueueBackend()
  : new RedisQueueBackend();
let backendInit: Promise<void> | null = null;

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

async function ensureBackend() {
  if (!backendInit) {
    backendInit = backend.init().catch((error) => {
      backendInit = null;
      throw error;
    });
  }
  await backendInit;
}

export async function enqueue(
  type: string,
  payload: unknown,
  opts: EnqueueOptions = {},
): Promise<number> {
  await ensureBackend();
  const job: JobRecord = {
    id: await backend.nextId(),
    type,
    payload,
    status: "pending",
    attempts: 0,
    maxAttempts: opts.maxAttempts ?? 5,
    nextRunAt: Date.now() + (opts.delayMs ?? 0),
  };
  await backend.storeJob(job);
  await persist(job);
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
    await backend.markJobDone(job);
    await persist(job);
    return;
  }
  try {
    await processor(job.payload, job);
    job.status = "completed";
    await backend.markJobDone(job);
    await persist(job);
  } catch (err) {
    job.attempts += 1;
    job.lastError = err instanceof Error ? err.message : String(err);
    if (job.attempts < job.maxAttempts) {
      job.status = "pending";
      job.nextRunAt = Date.now() + calculateBackoff(job.attempts);
      await backend.requeueJob(job);
    } else {
      job.status = "failed";
      await backend.markJobDone(job);
    }
    await persist(job);
  }
}

function scheduleNext() {
  void (async () => {
    if (!running) return;
    await ensureBackend();
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const next = await backend.peekNext();
    if (!next) return;
    const delay = Math.max(next.nextRunAt - Date.now(), 0);
    timer = setTimeout(async () => {
      try {
        await ensureBackend();
        const job = await backend.popDueJob(Date.now());
        if (job) {
          await processJob(job);
        }
      } catch (error) {
        console.error("queue worker error", error);
      } finally {
        scheduleNext();
      }
    }, delay);
  })().catch((error) => {
    console.error("failed to schedule queue", error);
  });
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

export async function pendingJobs(): Promise<JobRecord[]> {
  await ensureBackend();
  return await backend.listPending();
}

export async function clearQueue() {
  await ensureBackend();
  await backend.clear();
}
