import * as fs from 'fs-extra';
import * as path from 'path';
import {ManifestUtils} from '../../util/manifest';
import {log} from '../../util/log';
import {Manifest} from 'ryuu-client/lib/models';

jest.mock('../../util/log');
jest.mock('fs-extra');

const mockLog = log as jest.Mocked<typeof log>;
const mockFs = fs as jest.Mocked<typeof fs>;

// Test helper type for partial manifests (flexible for testing legacy properties)
type TestManifest = {
  name: string;
  version: string;
  fileName: string;
  [key: string]: any; // Allow legacy properties for testing
};

describe('ManifestUtils - Interface Tests (Refactor-Safe)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Public API Contracts', () => {
    describe('getManifest', () => {
      it('should return manifest object with fileName property when file exists', () => {
        const mockManifest = {name: 'Test App', version: '1.0.0'};
        mockFs.readFileSync.mockReturnValue(
          Buffer.from(JSON.stringify(mockManifest)),
        );
        mockFs.existsSync.mockReturnValue(true);

        const result = ManifestUtils.getManifest('test.json', false);

        expect(result).toEqual({
          ...mockManifest,
          fileName: 'test.json',
        });
      });

      it('should return undefined when file does not exist and verifyValid is false', () => {
        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('File not found');
        });

        const result = ManifestUtils.getManifest('nonexistent.json', false);

        expect(result).toBeUndefined();
      });

      it('should validate manifest when verifyValid is true', () => {
        const validManifest = {name: 'Test App', version: '1.0.0'};
        mockFs.readFileSync.mockReturnValue(
          Buffer.from(JSON.stringify(validManifest)),
        );
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeJsonSync.mockImplementation(() => undefined); // Mock updateManifest call

        const result = ManifestUtils.getManifest('test.json', true);

        expect(result).toMatchObject(validManifest);
        expect(result.fileName).toBe('test.json');
      });

      it('should call log.fail when validation fails', () => {
        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('File not found');
        });
        mockLog.fail.mockImplementation(() => {
          throw new Error('Validation failed');
        });

        expect(() => {
          ManifestUtils.getManifest('missing.json', true);
        }).toThrow('Validation failed');

        expect(mockLog.fail).toHaveBeenCalled();
      });
    });

    describe('hasManifest', () => {
      it('should return boolean indicating manifest existence', () => {
        mockFs.existsSync.mockReturnValue(true);

        const result = ManifestUtils.hasManifest('test.json');

        expect(typeof result).toBe('boolean');
        expect(result).toBe(true);
      });

      it('should return false for non-existent manifest', () => {
        mockFs.existsSync.mockReturnValue(false);

        const result = ManifestUtils.hasManifest('missing.json');

        expect(result).toBe(false);
      });
    });

    describe('persistDesignId', () => {
      it('should return the provided design id', () => {
        const manifest: TestManifest = {
          name: 'Test',
          version: '1.0.0',
          fileName: 'test.json',
        };
        const designId = 'new-design-id-123';
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeJsonSync.mockImplementation(() => undefined);

        const result = ManifestUtils.persistDesignId(
          designId,
          manifest as Manifest,
        );

        expect(result).toBe(designId);
      });

      it('should accept manifest object and id string parameters', () => {
        const manifest = {
          name: 'Test',
          version: '1.0.0',
          fileName: 'test.json',
        } as TestManifest;
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeJsonSync.mockImplementation(() => undefined);

        expect(() => {
          ManifestUtils.persistDesignId('some-id', manifest as Manifest);
        }).not.toThrow();
      });
    });

    describe('updateManifest', () => {
      it('should accept manifest object parameter', () => {
        const manifest = {
          name: 'Test',
          version: '1.0.0',
          fileName: 'test.json',
        } as TestManifest;
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeJsonSync.mockImplementation(() => undefined);

        expect(() => {
          ManifestUtils.updateManifest(manifest as Manifest);
        }).not.toThrow();
      });

      it('should call file writing functionality', () => {
        const manifest = {
          name: 'Test',
          version: '1.0.0',
          fileName: 'test.json',
        } as TestManifest;
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeJsonSync.mockImplementation(() => undefined);

        ManifestUtils.updateManifest(manifest as Manifest);

        expect(mockFs.writeJsonSync).toHaveBeenCalled();
      });
    });

    describe('updateManifestProperties', () => {
      it('should return manifest object with updated properties', () => {
        const inputManifest = {
          name: 'Test',
          version: '1.0.0',
          mapping: [{dataSetId: 'test'}],
          fileName: 'test.json',
        } as TestManifest;
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeJsonSync.mockImplementation(() => undefined);

        const result = ManifestUtils.updateManifestProperties(
          inputManifest as Manifest,
        );

        expect(result).toHaveProperty('name', 'Test');
        expect(result).toHaveProperty('version', '1.0.0');
        expect(result).toHaveProperty('datasetsMapping');
        expect(result).not.toHaveProperty('mapping');
      });

      it('should preserve existing properties while transforming others', () => {
        const inputManifest = {
          name: 'Test App',
          version: '2.0.0',
          description: 'Test description',
          collections: [{collectionId: 'test'}],
          fileName: 'test.json',
        } as TestManifest;
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeJsonSync.mockImplementation(() => undefined);

        const result = ManifestUtils.updateManifestProperties(
          inputManifest as Manifest,
        );

        expect(result).toHaveProperty('name', 'Test App');
        expect(result).toHaveProperty('version', '2.0.0');
        expect(result).toHaveProperty('description', 'Test description');
        expect(result).toHaveProperty('collectionsMapping');
        expect(result).not.toHaveProperty('collections');
      });

      it('should add default datasetsMapping when none exists', () => {
        const inputManifest = {
          name: 'Test',
          version: '1.0.0',
          fileName: 'test.json',
        } as TestManifest;
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeJsonSync.mockImplementation(() => undefined);

        const result = ManifestUtils.updateManifestProperties(
          inputManifest as Manifest,
        );

        expect(result).toHaveProperty('datasetsMapping', []);
      });
    });

    describe('findManifest', () => {
      it('should return string path to manifest file', () => {
        mockFs.existsSync.mockReturnValue(true);

        const result = ManifestUtils.findManifest('test.json');

        expect(typeof result).toBe('string');
        expect(result).toBe('test.json');
      });

      it('should return input filename when no manifest found', () => {
        mockFs.existsSync.mockReturnValue(false);
        // Mock glob to return empty array
        jest.doMock('glob', () => ({
          sync: (): string[] => [],
        }));

        const result = ManifestUtils.findManifest('missing.json');

        expect(result).toBe('missing.json');
      });

      it('should check standard locations in order', () => {
        const calls: string[] = [];
        mockFs.existsSync.mockImplementation((path: string) => {
          calls.push(path);
          if (path === 'public/test.json') return true;
          return false;
        });

        const result = ManifestUtils.findManifest('test.json');

        expect(calls).toContain('test.json');
        expect(calls).toContain('public/test.json');
        expect(result).toBe('public/test.json');
      });
    });
  });

  describe('Error Handling Contracts', () => {
    it('should handle invalid JSON gracefully', () => {
      mockFs.readFileSync.mockReturnValue(Buffer.from('invalid json {'));
      mockFs.existsSync.mockReturnValue(true);
      mockLog.fail.mockImplementation((): never => {
        throw new Error('Invalid JSON');
      });

      expect(() => {
        ManifestUtils.getManifest('test.json', false);
      }).toThrow('Invalid JSON');
    });

    it('should validate required properties when requested', () => {
      const invalidManifest = {version: '1.0.0'}; // missing name
      mockFs.readFileSync.mockReturnValue(
        Buffer.from(JSON.stringify(invalidManifest)),
      );
      mockFs.existsSync.mockReturnValue(true);
      mockLog.fail.mockImplementation((): never => {
        throw new Error('Missing required property');
      });

      expect(() => {
        ManifestUtils.getManifest('test.json', true);
      }).toThrow('Missing required property');
    });

    it('should validate version format when requested', () => {
      const invalidManifest = {name: 'Test', version: 'not-semver'};
      mockFs.readFileSync.mockReturnValue(
        Buffer.from(JSON.stringify(invalidManifest)),
      );
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeJsonSync.mockImplementation(() => undefined);
      mockLog.fail.mockImplementation((): never => {
        throw new Error('Invalid version');
      });

      expect(() => {
        ManifestUtils.getManifest('test.json', true);
      }).toThrow('Invalid version');
    });
  });
});
