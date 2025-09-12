import assert from 'node:assert/strict';

Deno.test('missing ALLOWED_ORIGINS defaults to localhost', async () => {
  Deno.env.delete('ALLOWED_ORIGINS');
  const { corsHeaders } = await import(
    `../../apps/web/utils/http.ts?missing=${Math.random()}`,
  );
  const req = new Request('http://localhost', {
    headers: { origin: 'http://localhost:3000' },
  });
  const headers = corsHeaders(req);
  assert.equal(headers['access-control-allow-origin'], 'http://localhost:3000');
});
