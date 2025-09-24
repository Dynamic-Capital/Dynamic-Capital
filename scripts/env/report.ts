import {
  computeTargetStatuses,
  loadExampleFiles,
  loadSchemaSources,
  readEnvMap
} from './utils.ts';

async function main() {
  const envMap = await readEnvMap();
  const examples = await loadExampleFiles();
  const schemas = await loadSchemaSources();
  const statuses = computeTargetStatuses(envMap, examples, schemas);

  console.log('Environment coverage report');
  console.log('='.repeat(32));
  for (const status of statuses) {
    const missingExamples = status.missingInExamples.length
      ? status.missingInExamples.join(', ')
      : '—';
    const missingSchemas = status.missingInSchemas.length
      ? status.missingInSchemas.join(', ')
      : '—';
    console.log(`${status.target}`);
    console.log(`  required: ${status.required.length}`);
    console.log(`  examples: ${status.coverageIds.join(', ')}`);
    console.log(`  schema: ${status.schemaIds.length > 0 ? status.schemaIds.join(', ') : 'n/a'}`);
    console.log(`  missing (examples): ${missingExamples}`);
    console.log(`  missing (schemas): ${missingSchemas}`);
    console.log('');
  }

  console.log('Example files');
  console.log('='.repeat(12));
  for (const file of examples.values()) {
    console.log(`${file.id}: ${file.exists ? 'present' : 'missing'} (${file.keys.size} vars)`);
  }

  console.log('Schema sources');
  console.log('='.repeat(13));
  for (const schema of schemas.values()) {
    if (schema.loaded) {
      console.log(`${schema.id}: loaded (${schema.keys.size} vars)`);
    } else {
      console.log(`${schema.id}: error (${schema.error ?? 'unknown'})`);
    }
  }
}

await main();
