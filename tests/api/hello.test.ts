import test from 'node:test'
import assert from 'node:assert/strict'

if (typeof Deno !== 'undefined') {
  // Skip when running under Deno
  test('skip in deno', () => {})
} else {
  test('GET /api/hello returns greeting', async () => {
    const { GET } = await import('../../app/api/hello/route.ts')
    const res = await GET()
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.deepEqual(data, { message: 'Hello from the API' })
  })
}
