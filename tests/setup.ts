import * as fs from 'fs-extra';
import * as path from 'path';

beforeAll(async () => {
  const testTmpDir = path.join(__dirname, 'tmp');
  if (await fs.pathExists(testTmpDir)) {
    await fs.remove(testTmpDir);
  }
  await fs.ensureDir(testTmpDir);
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  const testTmpDir = path.join(__dirname, 'tmp');
  if (await fs.pathExists(testTmpDir)) {
    await fs.remove(testTmpDir);
  }
});

beforeEach(() => {
  jest.restoreAllMocks();
});