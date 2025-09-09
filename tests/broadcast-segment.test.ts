import "./setup.ts";
import test from 'node:test';
import { deepEqual as assertEquals, rejects as assertRejects } from 'node:assert/strict';
import { resolveTargets } from "../src/broadcast/index.ts";

test('resolveTargets accepts array', async () => {
  const ids = await resolveTargets([1, 2]);
  assertEquals(ids, [1, 2]);
});

test('resolveTargets accepts object with userIds', async () => {
  const ids = await resolveTargets({ userIds: [3, 4] });
  assertEquals(ids, [3, 4]);
});

test('resolveTargets rejects invalid input', async () => {
  await assertRejects(
    () => resolveTargets({ foo: 'bar' } as unknown as number[]),
    Error,
    'Invalid broadcast segment',
  );
});
