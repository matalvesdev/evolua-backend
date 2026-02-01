// ============================================================================
// JEST CONFIGURATION FOR PATIENT MANAGEMENT MODULE
// Property-based testing setup with fast-check
// ============================================================================

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'domain/**/*.ts',
    'application/**/*.ts',
    'infrastructure/**/*.ts',
    '!**/*.d.ts',
    '!**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/testing/setup.ts'],
  testTimeout: 30000, // 30 seconds for property-based tests
  verbose: true
}