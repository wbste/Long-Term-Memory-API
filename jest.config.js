/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testRegex: '(/tests/.*|(\\\\.|/)(test|spec))\\\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  resetMocks: true,
  clearMocks: true,
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
