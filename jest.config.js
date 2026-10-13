const unit = {
  displayName: 'unit',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

// The release pipeline's decision logic and shell scripts (scripts/ci).
const ci = {
  displayName: 'ci',
  testEnvironment: 'node',
  roots: ['<rootDir>/scripts/ci'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'scripts/ci/tsconfig.json',
      },
    ],
  },
};

export default {
  projects: [unit, ci],
};
