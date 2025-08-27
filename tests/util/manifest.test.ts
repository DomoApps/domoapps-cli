import * as fs from 'fs-extra';
import * as path from 'path';
import { ManifestUtils } from '../../util/manifest';

describe('ManifestUtils', () => {
  const testDir = path.join(__dirname, '../tmp');
  
  beforeEach(async () => {
    await fs.ensureDir(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('getManifest', () => {
    it('should read and parse a valid manifest file', async () => {
      const testManifest = {
        name: 'Test App',
        version: '1.0.0',
        id: 'test-id'
      };
      
      await fs.writeJson(path.join(testDir, 'manifest.json'), testManifest);
      
      const result = ManifestUtils.getManifest();
      
      expect(result).toMatchObject(testManifest);
      expect(result.fileName).toBe('manifest.json');
    });

    it('should find manifest in public directory', async () => {
      const testManifest = {
        name: 'Test App',
        version: '1.0.0'
      };
      
      await fs.ensureDir(path.join(testDir, 'public'));
      await fs.writeJson(path.join(testDir, 'public/manifest.json'), testManifest);
      
      const result = ManifestUtils.getManifest();
      
      expect(result).toMatchObject(testManifest);
    });

    it('should find manifest in src directory', async () => {
      const testManifest = {
        name: 'Test App',
        version: '1.0.0'
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
      await fs.writeJson(path.join(testDir, 'manifest.json'), { name: 'test' });
      
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
        fileName: 'manifest.json'
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
        mapping: [{ dataSetId: 'test' }],
        fileName: 'manifest.json'
      };
      
      await fs.writeJson(path.join(testDir, 'manifest.json'), originalManifest);
      
      const result = ManifestUtils.updateManifestProperties(originalManifest);
      
      expect(result.datasetsMapping).toEqual([{ dataSetId: 'test' }]);
      expect(result.mapping).toBeUndefined();
    });

    it('should convert collections to collectionsMapping', async () => {
      const originalManifest: any = {
        name: 'Test App',
        version: '1.0.0',
        collections: [{ collectionId: 'test' }],
        fileName: 'manifest.json'
      };
      
      await fs.writeJson(path.join(testDir, 'manifest.json'), originalManifest);
      
      const result = ManifestUtils.updateManifestProperties(originalManifest);
      
      expect(result.collectionsMapping).toEqual([{ collectionId: 'test' }]);
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
  });
});