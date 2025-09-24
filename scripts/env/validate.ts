import {
  computeTargetStatuses,
  detectDuplicateVariables,
  loadExampleFiles,
  loadSchemaSources,
  readEnvMap
} from './utils.ts';

async function main() {
  const envMap = await readEnvMap();
  const examples = await loadExampleFiles();
  const schemas = await loadSchemaSources();

  const schemaErrors = Array.from(schemas.values()).filter((s) => !s.loaded && s.error);
  const statuses = computeTargetStatuses(envMap, examples, schemas);

  const missingExamples = statuses.filter((status) => status.missingInExamples.length > 0);
  const missingSchemas = statuses.filter((status) => status.missingInSchemas.length > 0);

  let hasErrors = false;

  if (schemaErrors.length > 0) {
    hasErrors = true;
    console.error('Schema loading errors detected:');
    for (const source of schemaErrors) {
      console.error(`  - ${source.id}: ${source.error}`);
    }
  }

  if (missingExamples.length > 0) {
    hasErrors = true;
    console.error('Missing environment variables in example files:');
    for (const status of missingExamples) {
      console.error(`  • ${status.target}: ${status.missingInExamples.join(', ')}`);
    }
  }

  if (missingSchemas.length > 0) {
    hasErrors = true;
    console.error('Missing environment variables in runtime schemas:');
    for (const status of missingSchemas) {
      console.error(`  • ${status.target}: ${status.missingInSchemas.join(', ')}`);
    }
  }

  const duplicates = detectDuplicateVariables(envMap);
  if (duplicates.size > 0) {
    console.warn('Duplicate variable assignments detected in env.map.json:');
    for (const [variable, owners] of duplicates.entries()) {
      console.warn(`  • ${variable}: ${owners.join(', ')}`);
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
    return;
  }

  console.log('Environment map, examples, and schemas are consistent.');
}

await main();
