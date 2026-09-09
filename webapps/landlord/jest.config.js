const nextJest = require('next/jest');

// next/jest wires SWC transforms, path aliases and env for tests.
const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.js']
});
