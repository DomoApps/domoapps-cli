import * as fs from 'fs-extra';
import * as path from 'path';
import {ManifestUtils} from '../../util/manifest';
import {log} from '../../util/log';
import {Manifest} from 'ryuu-client/lib/models';

jest.mock('../../util/log');
jest.mock('../../util/isValidJSName');

const mockLog = log as jest.Mocked<typeof log>;

// Test helper type for integration tests with legacy properties
type TestManifestWithLegacy = {
  name: string;
  version: string;
  fileName: string;
  [key: string]: any; // Flexible type for testing legacy properties and edge cases
};

describe('ManifestUtils', () => {
  const testDir = path.join(__dirname, '../tmp');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    process.chdir(testDir);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('getManifest', () => {
    it('should read and parse a valid manifest file', async () => {
      const testManifest = {
        name: 'Test App',
        version: '1.0.0',
        id: 'test-id',
      };

      await fs.writeJson(path.join(testDir, 'manifest.json'), testManifest);

      const result = ManifestUtils.getManifest();

      expect(result).toMatchObject(testManifest);
      expect(result.fileName).toBe('manifest.json');
    });

    it('should find manifest in public directory', async () => {
      const testManifest = {
        name: 'Test App',
        version: '1.0.0',
      };

      await fs.ensureDir(path.join(testDir, 'public'));
      await fs.writeJson(
        path.join(testDir, 'public/manifest.json'),
        testManifest,
      );

      const result = ManifestUtils.getManifest();

      expect(result).toMatchObject(testManifest);
    });

    it('should find manifest in src directory', async () => {
      const testManifest = {
        name: 'Test App',
        version: '1.0.0',
      };

      await fs.ensureDir(path.join(testDir, 'src'));
      await fs.writeJson(path.join(testDir, 'src/manifest.json'), testManifest);

      const result = ManifestUtils.getManifest();

      expect(result).toMatchObject(testManifest);
    });

    it('should return undefined when no manifest exists and verifyValid is false', () => {
      const result = ManifestUtils.getManifest('manifest.json', false);
      expect(result).toBeUndefined();
    });
  });

  describe('hasManifest', () => {
    it('should return true when manifest exists', async () => {
      await fs.writeJson(path.join(testDir, 'manifest.json'), {name: 'test'});

      const result = ManifestUtils.hasManifest('manifest.json');

      expect(result).toBe(true);
    });

    it('should return false when manifest does not exist', () => {
      const result = ManifestUtils.hasManifest('nonexistent.json');

      expect(result).toBe(false);
    });
  });

  describe('updateManifest', () => {
    it('should write manifest to disk', async () => {
      const testManifest: any = {
        name: 'Updated App',
        version: '2.0.0',
        fileName: 'manifest.json',
      };

      ManifestUtils.updateManifest(testManifest);

      const written = await fs.readJson(path.join(testDir, 'manifest.json'));
      expect(written.name).toBe('Updated App');
      expect(written.version).toBe('2.0.0');
    });
  });

  describe('updateManifestProperties', () => {
    it('should convert mapping to datasetsMapping', async () => {
      const originalManifest: any = {
        name: 'Test App',
        version: '1.0.0',
        mapping: [{dataSetId: 'test'}],
        fileName: 'manifest.json',
      };

      await fs.writeJson(path.join(testDir, 'manifest.json'), originalManifest);

      const result = ManifestUtils.updateManifestProperties(
        originalManifest as Manifest,
      );

      expect(result.datasetsMapping).toEqual([{dataSetId: 'test'}]);
      expect(result.mapping).toBeUndefined();
    });

    it('should convert collections to collectionsMapping', async () => {
      const originalManifest: any = {
        name: 'Test App',
        version: '1.0.0',
        collections: [{collectionId: 'test'}],
        fileName: 'manifest.json',
      };

      await fs.writeJson(path.join(testDir, 'manifest.json'), originalManifest);

      const result = ManifestUtils.updateManifestProperties(
        originalManifest as Manifest,
      );

      expect(result.collectionsMapping).toEqual([{collectionId: 'test'}]);
      expect(result.collections).toBeUndefined();
    });
  });

  describe('findManifest', () => {
    it('should find manifest in root directory', async () => {
      await fs.writeJson(path.join(testDir, 'manifest.json'), {});

      const result = ManifestUtils.findManifest('manifest.json');

      expect(result).toBe('manifest.json');
    });

    it('should return filename when no manifest found', () => {
      const result = ManifestUtils.findManifest('nonexistent.json');

      expect(result).toBe('nonexistent.json');
    });

    it('should find manifest in subdirectory (glob pattern)', async () => {
      await fs.ensureDir(path.join(testDir, 'app'));
      await fs.writeJson(path.join(testDir, 'app/manifest.json'), {
        name: 'test',
      });

      const result = ManifestUtils.findManifest('manifest.json');

      expect(result).toBe('app/manifest.json');
    });

    it('should ignore dist, build, and templates directories', async () => {
      await fs.ensureDir(path.join(testDir, 'dist'));
      await fs.ensureDir(path.join(testDir, 'build'));
      await fs.ensureDir(path.join(testDir, 'templates'));
      await fs.ensureDir(path.join(testDir, 'myapp'));

      await fs.writeJson(path.join(testDir, 'dist/manifest.json'), {
        name: 'dist',
      });
      await fs.writeJson(path.join(testDir, 'build/manifest.json'), {
        name: 'build',
      });
      await fs.writeJson(path.join(testDir, 'templates/manifest.json'), {
        name: 'templates',
      });
      await fs.writeJson(path.join(testDir, 'myapp/manifest.json'), {
        name: 'myapp',
      });

      const result = ManifestUtils.findManifest('manifest.json');

      expect(result).toBe('myapp/manifest.json');
    });
  });

  describe('persistDesignId', () => {
    it('should update manifest with new id and persist to disk', async () => {
      const originalManifest = {
        name: 'Test App',
        version: '1.0.0',
        fileName: 'manifest.json',
      } as TestManifestWithLegacy;

      await fs.writeJson(path.join(testDir, 'manifest.json'), originalManifest);

      const result = ManifestUtils.persistDesignId(
        'new-design-id',
        originalManifest as Manifest,
      );

      expect(result).toBe('new-design-id');

      const updatedFile = await fs.readJson(
        path.join(testDir, 'manifest.json'),
      );
      expect(updatedFile.id).toBe('new-design-id');
      expect(updatedFile.name).toBe('Test App');
    });
  });

  describe('getManifest with validation', () => {
    it('should validate manifest when verifyValid is true', async () => {
      const testManifest = {
        name: 'Test App',
        version: '1.0.0',
        fileName: 'manifest.json',
      };

      await fs.writeJson(path.join(testDir, 'manifest.json'), testManifest);

      const result = ManifestUtils.getManifest('manifest.json', true);

      expect(result).toMatchObject(testManifest);
      expect(result.datasetsMapping).toEqual([]);
    });

    it('should fail validation when required property is missing', async () => {
      const invalidManifest = {
        version: '1.0.0',
      };

      await fs.writeJson(path.join(testDir, 'manifest.json'), invalidManifest);

      // Mock log.fail to throw an error
      mockLog.fail.mockImplementation(() => {
        throw new Error('Missing required property');
      });

      expect(() => {
        ManifestUtils.getManifest('manifest.json', true);
      }).toThrow('Missing required property');

      expect(mockLog.fail).toHaveBeenCalledWith(
        'Missing required property: name',
        'Please add the missing `name` property to your manifest.json file.',
      );
    });

    it('should fail validation when version is invalid semver', async () => {
      const invalidManifest = {
        name: 'Test App',
        version: 'not-a-version',
      };

      await fs.writeJson(path.join(testDir, 'manifest.json'), invalidManifest);

      // Mock log.fail to throw an error
      mockLog.fail.mockImplementation(() => {
        throw new Error('Invalid version');
      });

      expect(() => {
        ManifestUtils.getManifest('manifest.json', true);
      }).toThrow('Invalid version');

      expect(mockLog.fail).toHaveBeenCalledWith(
        'Invalid version',
        'Please make sure the `version` in your manifest.json file is a valid semantic version. See http://semver.org/',
      );
    });

    it('should fail when manifest file does not exist and verifyValid is true', () => {
      // Mock log.fail to throw an error
      mockLog.fail.mockImplementation(() => {
        throw new Error('No manifest file');
      });

      expect(() => {
        ManifestUtils.getManifest('nonexistent.json', true);
      }).toThrow('No manifest file');

      expect(mockLog.fail).toHaveBeenCalledWith(
        'No nonexistent.json file in this directory',
        'Please publish from a directory containing a Custom App design nonexistent.json file',
      );
    });

    it('should fail when manifest file is invalid JSON', async () => {
      await fs.writeFile(path.join(testDir, 'manifest.json'), 'invalid json {');

      // Mock log.fail to throw an error
      mockLog.fail.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      expect(() => {
        ManifestUtils.getManifest('manifest.json', true);
      }).toThrow('Invalid JSON');

      expect(mockLog.fail).toHaveBeenCalledWith(
        expect.stringContaining('Your manifest.json file is not valid JSON'),
        expect.any(String),
      );
    });
  });

  describe('updateManifestProperties edge cases', () => {
    it('should handle manifest without mapping or datasetsMapping', async () => {
      const originalManifest = {
        name: 'Test App',
        version: '1.0.0',
        fileName: 'manifest.json',
      } as TestManifestWithLegacy;

      await fs.writeJson(path.join(testDir, 'manifest.json'), originalManifest);

      const result = ManifestUtils.updateManifestProperties(
        originalManifest as Manifest,
      );

      expect(result.datasetsMapping).toEqual([]);
    });

    it('should not override existing datasetsMapping when no mapping exists', async () => {
      const originalManifest = {
        name: 'Test App',
        version: '1.0.0',
        datasetsMapping: [{dataSetId: 'existing'}],
        fileName: 'manifest.json',
      } as TestManifestWithLegacy;

      await fs.writeJson(path.join(testDir, 'manifest.json'), originalManifest);

      const result = ManifestUtils.updateManifestProperties(
        originalManifest as Manifest,
      );

      expect(result.datasetsMapping).toEqual([{dataSetId: 'existing'}]);
    });

    it('should convert appContextId to proxyId (bug now fixed)', async () => {
      // Note: Bug was fixed - now properly converts appContextId to proxyId
      const originalManifest = {
        name: 'Test App',
        version: '1.0.0',
        appContextId: 'app-context-id',
        fileName: 'manifest.json',
      } as TestManifestWithLegacy;

      await fs.writeJson(path.join(testDir, 'manifest.json'), originalManifest);

      const result = ManifestUtils.updateManifestProperties(
        originalManifest as Manifest,
      );

      // Bug fixed: proxyId should now be set and appContextId should be deleted
      expect(result.proxyId).toBe('app-context-id');
      expect((result as any).appContextId).toBeUndefined();
    });

    it('should convert cardId to proxyId (bug now fixed)', async () => {
      // Note: Bug was fixed - now properly converts cardId to proxyId
      const originalManifest = {
        name: 'Test App',
        version: '1.0.0',
        cardId: 'card-id',
        fileName: 'manifest.json',
      } as TestManifestWithLegacy;

      await fs.writeJson(path.join(testDir, 'manifest.json'), originalManifest);

      const result = ManifestUtils.updateManifestProperties(
        originalManifest as Manifest,
      );

      // Bug fixed: proxyId should now be set and cardId should be deleted
      expect(result.proxyId).toBe('card-id');
      expect((result as any).cardId).toBeUndefined();
    });
  });
});
