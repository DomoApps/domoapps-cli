// Test setup file
import {jest} from '@jest/globals';

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock process.exit to prevent tests from actually exiting
const originalExit = process.exit;
beforeAll(() => {
  process.exit = jest.fn() as any;
});

afterAll(() => {
  process.exit = originalExit;
});

// Mock configstore
jest.mock('configstore', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    all: {},
  }));
});

// Mock fs-extra
jest.mock('fs-extra', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  copySync: jest.fn(),
  removeSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn(),
  ensureDirSync: jest.fn(),
  appendFileSync: jest.fn(),
  pathExists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  copy: jest.fn(),
  remove: jest.fn(),
  ensureDir: jest.fn(),
}));

// Mock ryuu-client v5
jest.mock('ryuu-client', () => ({
  createClient: jest.fn(() => ({
    instance: 'test.domo.com',
    refreshToken: 'mock-refresh-token',
    login: jest.fn(),
    request: jest.fn(),
    designs: {
      create: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
      undelete: jest.fn(),
      getVersions: jest.fn(),
      release: jest.fn(),
    },
    assets: {
      upload: jest.fn(),
      uploadAll: jest.fn(),
      download: jest.fn(),
    },
    apps: {
      createInstance: jest.fn(),
      getEnvironment: jest.fn(),
    },
    users: {
      getUserInfo: jest.fn(),
    },
  })),
  getHomeDir: jest.fn(() => '/mock/home/dir'),
  getMostRecentLogin: jest.fn(() => ({})),
  RyuuHttpError: class RyuuHttpError extends Error {
    statusCode: number;
    url: string;
    constructor(message: string, statusCode: number, url: string) {
      super(message);
      this.name = 'RyuuHttpError';
      this.statusCode = statusCode;
      this.url = url;
    }
  },
}));

// Mock inquirer
jest.mock('inquirer', () => ({
  prompt: jest.fn(),
  registerPrompt: jest.fn(),
}));

// Mock chalk - removed to allow individual test mocks

// Mock axios
jest.mock('axios', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock open
jest.mock('open', () => jest.fn());

// Mock shelljs
jest.mock('shelljs', () => ({
  mkdir: jest.fn(),
  exec: jest.fn(),
  which: jest.fn(),
}));

// Mock glob
jest.mock('glob', () => ({
  sync: jest.fn(),
}));

// Mock portfinder
jest.mock('portfinder', () => ({
  getPort: jest.fn(),
  basePort: 3000,
}));

// Mock browser-sync
jest.mock('browser-sync', () => ({
  create: jest.fn(() => ({
    init: jest.fn(),
    reload: jest.fn(),
    watch: jest.fn(),
    instance: {
      logger: {
        info: jest.fn(),
      },
    },
  })),
}));
