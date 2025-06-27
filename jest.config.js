module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'hostswitch.js',
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/test/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js'
  ],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  testTimeout: 10000,
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};