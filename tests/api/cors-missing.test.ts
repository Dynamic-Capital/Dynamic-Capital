import assert from 'node:assert/strict';

Deno.test('missing ALLOWED_ORIGINS allows wildcard origin', async () => {
  Deno.env.delete('ALLOWED_ORIGINS');
  const { corsHeaders } = await import(`../../apps/web/utils/http.ts?missing=${Math.random()}`);
  const req = new Request('http://localhost', { headers: { origin: 'https://any.com' } });
  const headers = corsHeaders(req);
  assert.equal(headers['access-control-allow-origin'], '*');
});
