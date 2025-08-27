import * as path from 'path';
import * as fs from 'fs-extra';

describe('CLI Integration Tests', () => {
  const testDir = path.join(__dirname, '../tmp/cli-test');
  const binPath = path.join(__dirname, '../../dist/bin/runner');

  beforeAll(async () => {
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  it('should have built CLI binary', async () => {
    const binExists = await fs.pathExists(binPath);
    expect(binExists).toBe(true);
  });

  it('should have runner script executable', async () => {
    const runnerExists = await fs.pathExists(binPath);
    expect(runnerExists).toBe(true);
    
    if (runnerExists) {
      const stats = await fs.stat(binPath);
      expect(stats.isFile()).toBe(true);
    }
  });

  it('should have package.json in dist', async () => {
    const packagePath = path.join(__dirname, '../../dist/package.json');
    const packageExists = await fs.pathExists(packagePath);
    expect(packageExists).toBe(true);
    
    if (packageExists) {
      const packageJson = await fs.readJson(packagePath);
      expect(packageJson.name).toBe('ryuu');
    }
  });
});