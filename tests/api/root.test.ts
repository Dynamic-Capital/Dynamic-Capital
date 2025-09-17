import assert from 'node:assert/strict'

async function run() {
  const { GET } = await import(/* webpackIgnore: true */ '../../apps/web/app/api/route.ts')
  const res = await GET()
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.deepEqual(data, { message: 'API is running' })
}

if (typeof Deno !== 'undefined') {
  Deno.test('GET /api returns status', run)
} else {
  const { default: test } = await import(/* webpackIgnore: true */ 'node:test')
  test('GET /api returns status', run)
}
