/**
 * Vitest Configuration
 *
 * This configuration file sets up Vitest for testing the Ideogram MCP Server.
 * It includes coverage settings targeting 90%+ code coverage as required
 * by the specification.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use globals for describe, it, expect, etc.
    globals: true,

    // Test environment
    environment: 'node',

    // Include test files
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],

    // Exclude patterns
    exclude: ['node_modules', 'dist', '**/*.d.ts'],

    // Setup files to run before tests
    setupFiles: ['./src/__tests__/setup.ts'],

    // Timeout for each test (30 seconds for async operations)
    testTimeout: 30000,

    // Hook timeout
    hookTimeout: 30000,

    // Enable threading for faster execution
    pool: 'threads',

    // Reporter configuration
    reporters: ['verbose'],

    // Coverage configuration
    coverage: {
      // Use v8 for coverage collection
      provider: 'v8',

      // Enable coverage by default (can be overridden with --no-coverage)
      enabled: false,

      // Coverage reporters
      reporter: ['text', 'text-summary', 'lcov', 'html'],

      // Files to include in coverage
      include: ['src/**/*.ts'],

      // Files to exclude from coverage
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        'src/types/**',
        'node_modules/**',
        'dist/**',
      ],

      // Coverage thresholds (90%+ target)
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },

      // Report on all files, not just those with tests
      all: true,

      // Clean coverage before running tests
      clean: true,

      // Output directory for coverage reports
      reportsDirectory: './coverage',
    },

    // Type checking during tests
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
    },
  },
});
