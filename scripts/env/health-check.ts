interface Endpoint {
  name: string;
  envKey: string;
  type: 'text' | 'json';
  commitKey?: string;
}

const endpoints: Endpoint[] = [
  { name: 'marketing-site', envKey: 'MARKETING_HEALTH_URL', type: 'text' },
  { name: 'user-app', envKey: 'USER_APP_HEALTH_URL', type: 'json', commitKey: 'commit' },
  { name: 'admin-app', envKey: 'ADMIN_APP_HEALTH_URL', type: 'json', commitKey: 'commit' },
  { name: 'supabase-functions', envKey: 'SUPABASE_FUNCTION_HEALTH_URL', type: 'json' },
  { name: 'bridge', envKey: 'BRIDGE_HEALTH_URL', type: 'json', commitKey: 'commit' }
];

function normalize(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

async function checkEndpoint(endpoint: Endpoint, expectedCommit?: string) {
  const url = normalize(process.env[endpoint.envKey]);
  if (!url) {
    console.log(`${endpoint.name}: skipped (${endpoint.envKey} not set)`);
    return { name: endpoint.name, status: 'skipped' as const };
  }

  try {
    const res = await fetch(url, { method: 'GET', headers: { 'user-agent': 'env-health-check/1.0' } });
    if (!res.ok) {
      console.error(`${endpoint.name}: HTTP ${res.status}`);
      return { name: endpoint.name, status: 'failed' as const };
    }

    if (endpoint.type === 'text') {
      const text = (await res.text()).trim().toLowerCase();
      if (text !== 'ok') {
        console.error(`${endpoint.name}: unexpected body`);
        return { name: endpoint.name, status: 'failed' as const };
      }
    } else {
      const body = (await res.json()) as Record<string, unknown>;
      if (body.status !== 'ok') {
        console.error(`${endpoint.name}: status field missing or not ok`);
        return { name: endpoint.name, status: 'failed' as const };
      }
      if (expectedCommit && endpoint.commitKey) {
        const commitValue = normalize(String(body[endpoint.commitKey] ?? ''));
        if (!commitValue || commitValue !== expectedCommit) {
          console.error(`${endpoint.name}: commit mismatch`);
          return { name: endpoint.name, status: 'failed' as const };
        }
      }
    }

    console.log(`${endpoint.name}: ok`);
    return { name: endpoint.name, status: 'ok' as const };
  } catch (error) {
    console.error(`${endpoint.name}: ${(error as Error).message}`);
    return { name: endpoint.name, status: 'failed' as const };
  }
}

async function main() {
  const expectedCommit = normalize(process.env.EXPECTED_COMMIT_SHA);
  const results = await Promise.all(endpoints.map((endpoint) => checkEndpoint(endpoint, expectedCommit)));

  const failures = results.filter((result) => result.status === 'failed');
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

await main();
