import test from 'node:test';
import { deepEqual as assertEquals, rejects as assertRejects } from 'node:assert/strict';

function setEnv() {
  process.env.SUPABASE_URL = 'http://local';
  process.env.SUPABASE_ANON_KEY = 'anon';
}

function cleanupEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
}

test('resolveTargets accepts array', async () => {
  setEnv();
  const { resolveTargets } = await import(`../broadcast/index.ts?${Math.random()}`);
  const ids = await resolveTargets([1, 2]);
  assertEquals(ids, [1, 2]);
  cleanupEnv();
});

test('resolveTargets accepts object with userIds', async () => {
  setEnv();
  const { resolveTargets } = await import(`../broadcast/index.ts?${Math.random()}`);
  const ids = await resolveTargets({ userIds: [3, 4] });
  assertEquals(ids, [3, 4]);
  cleanupEnv();
});

test('resolveTargets rejects invalid input', async () => {
  setEnv();
  const { resolveTargets } = await import(`../broadcast/index.ts?${Math.random()}`);
  await assertRejects(
    () => resolveTargets({ foo: 'bar' } as unknown as number[]),
    Error,
    'Invalid broadcast segment',
  );
  cleanupEnv();
});
