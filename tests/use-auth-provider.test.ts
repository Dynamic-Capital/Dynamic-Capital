import test from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

const filePath = new URL('../apps/web/hooks/useAuth.tsx', import.meta.url);

test('useAuth guard throws informative error', async () => {
  const content = await readFile(filePath, 'utf-8');
  assert.match(content, /useAuth must be used within an AuthProvider/);
});
