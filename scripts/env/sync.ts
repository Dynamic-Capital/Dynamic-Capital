import { listProviders, readEnvMap } from './utils.ts';

function tokensForTarget(target: string): string[] {
  if (target.startsWith('vercel:')) return ['VERCEL_TOKEN'];
  if (target.startsWith('do:')) return ['DO_API_TOKEN', 'DO_APP_ID'];
  if (target === 'supabase') return ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF'];
  if (target.startsWith('bridge:')) return ['BRIDGE_HOST', 'BRIDGE_USER', 'BRIDGE_SSH_KEY'];
  if (target === 'providers') return [];
  return [];
}

function isPresent(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && `${value}`.trim());
}

async function main() {
  const envMap = await readEnvMap();
  const providers = listProviders(envMap);
  const summary: Record<string, {
    present: string[];
    missing: string[];
    tokens: string[];
    missingTokens: string[];
  }> = {};

  for (const provider of providers) {
    const tokens = tokensForTarget(provider.target);
    const missingTokens = tokens.filter((token) => !isPresent(token));
    const present: string[] = [];
    const missing: string[] = [];
    for (const variable of provider.variables) {
      if (isPresent(variable)) {
        present.push(variable);
      } else {
        missing.push(variable);
      }
    }
    summary[provider.target] = { present, missing, tokens, missingTokens };
  }

  console.log('Environment sync preview');
  console.log('='.repeat(28));
  for (const [target, info] of Object.entries(summary)) {
    console.log(target);
    console.log(`  ready: ${info.present.length}`);
    console.log(`  missing: ${info.missing.length > 0 ? info.missing.join(', ') : 'none'}`);
    if (info.tokens.length > 0) {
      console.log(`  tokens: ${info.tokens.join(', ')}`);
      console.log(`  missing tokens: ${info.missingTokens.length > 0 ? info.missingTokens.join(', ') : 'none'}`);
    } else {
      console.log('  tokens: n/a');
    }
    console.log('  action: manual sync required (API integration pending)');
    console.log('');
  }

  const totalMissing = Object.values(summary).reduce((acc, info) => acc + info.missing.length, 0);
  const totalMissingTokens = Object.values(summary).reduce(
    (acc, info) => acc + info.missingTokens.length,
    0
  );

  console.log('Summary');
  console.log(`  missing variables: ${totalMissing}`);
  console.log(`  missing tokens: ${totalMissingTokens}`);
}

await main();
