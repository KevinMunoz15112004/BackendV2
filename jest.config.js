export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: [
    '**/src/tests/**/*.test.js'
  ],
  testTimeout: 30000,
  verbose: true,

  setupFilesAfterEnv: [
    '<rootDir>/src/tests/helpers/setupMocks.js'
  ]
}