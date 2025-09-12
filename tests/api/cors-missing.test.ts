import assert from 'node:assert/strict';

Deno.test('missing ALLOWED_ORIGINS defaults to site URL', async () => {
  Deno.env.delete('ALLOWED_ORIGINS');
  const { corsHeaders } = await import(
    `../../apps/web/utils/http.ts?missing=${Math.random()}`,
  );
  const origin = Deno.env.get('SITE_URL') ?? 'http://localhost:3000';
  const req = new Request('http://localhost', {
    headers: { origin },
  });
  const headers = corsHeaders(req);
  assert.equal(headers['access-control-allow-origin'], origin);
});
