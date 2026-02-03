#!/usr/bin/env node
/**
 * Tool Verification Script
 *
 * This script verifies that all 5 MVP tools are correctly registered
 * with their schemas and handlers. It runs the integration test suite
 * to confirm tool registration and schema validation.
 *
 * Usage:
 *   npx vitest run src/__tests__/integration/server.test.ts
 *
 * Or run this script directly:
 *   node scripts/verify-tools.mjs
 *
 * For MCP Inspector manual verification:
 *   npx @modelcontextprotocol/inspector node dist/index.js
 *   Then open http://localhost:6274 in your browser
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Expected tools as per spec
const EXPECTED_TOOLS = [
  'ideogram_generate',
  'ideogram_edit',
  'ideogram_generate_async',
  'ideogram_get_prediction',
  'ideogram_cancel_prediction',
];

console.log('='.repeat(60));
console.log('MCP Server Tool Verification');
console.log('='.repeat(60));
console.log();

console.log('Expected Tools (5 MVP Tools):');
for (const tool of EXPECTED_TOOLS) {
  console.log(`  - ${tool}`);
}
console.log();

console.log('Running integration tests to verify tool registration...');
console.log('-'.repeat(60));

// Run vitest to verify the tools
const vitest = spawn('npx', [
  'vitest',
  'run',
  'src/__tests__/integration/server.test.ts',
  '--reporter=verbose',
  '--testNamePattern=should register all 5 MVP tools|should have correct tool definitions|should have complete'
], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
});

vitest.on('close', (code) => {
  console.log();
  console.log('-'.repeat(60));
  if (code === 0) {
    console.log('✓ All tool verification tests passed!');
    console.log();
    console.log('To verify with MCP Inspector:');
    console.log('  1. Run: npx @modelcontextprotocol/inspector node dist/index.js');
    console.log('  2. Open: http://localhost:6274');
    console.log('  3. Verify all 5 tools are listed with correct schemas');
    console.log();
  } else {
    console.log('✗ Tool verification tests failed!');
    console.log('Please check the test output above for details.');
  }
  console.log('='.repeat(60));
  process.exit(code);
});
