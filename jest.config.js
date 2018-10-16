console.log('config??')
module.exports = {
  // projects: [
  //   '<rootDir>/packages/*',
  // ],
  // roots: [
  //   '<rootDir>/src',
  // ],
  // testEnvironment: 'node',
  testPathIgnorePatterns: [
    '<rootDir>/packages/.*(node_modules|dist).*$',
  ],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '<rootDir>.*(node_modules).*$',
  ],
  // collectCoverage: true,
  // collectCoverageFrom: [
  //   'packages/**/*.{js}',
  //   '!**/node_modules/**',
  //   '!**/dist/**',
  // ],
}
