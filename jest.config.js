module.exports = {
  preset: 'jest-playwright-preset',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  rootDir: '.',
  testTimeout: 20000,
  testMatch: [
    '<rootDir>/functional-tests/*js'
  ],
}