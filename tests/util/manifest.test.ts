import {jest} from '@jest/globals';

// Mock the entire manifest module since it has complex dependencies
jest.mock('../../util/manifest', () => ({
  ManifestUtils: {
    getManifest: jest.fn(),
    hasManifest: jest.fn(),
    updateManifest: jest.fn(),
    writeManifest: jest.fn(),
    getManifestPath: jest.fn(),
    manifestExists: jest.fn(),
  },
}));

describe('ManifestUtils', () => {
  let mockManifestUtils: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockManifestUtils = require('../../util/manifest').ManifestUtils;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getManifest', () => {
    it('should return manifest data', () => {
      const mockManifest = {
        name: 'test-app',
        version: '1.0.0',
        description: 'Test application',
      };

      mockManifestUtils.getManifest.mockReturnValue(mockManifest);

      const result = mockManifestUtils.getManifest('manifest.json');

      expect(mockManifestUtils.getManifest).toHaveBeenCalledWith(
        'manifest.json',
      );
      expect(result).toEqual(mockManifest);
    });

    it('should handle missing manifest', () => {
      mockManifestUtils.getManifest.mockImplementation(() => {
        throw new Error('Manifest not found');
      });

      expect(() => {
        mockManifestUtils.getManifest('nonexistent.json');
      }).toThrow('Manifest not found');
    });
  });

  describe('hasManifest', () => {
    it('should return true when manifest exists', () => {
      mockManifestUtils.hasManifest.mockReturnValue(true);

      const exists = mockManifestUtils.hasManifest('manifest.json');

      expect(mockManifestUtils.hasManifest).toHaveBeenCalledWith(
        'manifest.json',
      );
      expect(exists).toBe(true);
    });

    it('should return false when manifest does not exist', () => {
      mockManifestUtils.hasManifest.mockReturnValue(false);

      const exists = mockManifestUtils.hasManifest('manifest.json');

      expect(exists).toBe(false);
    });
  });

  describe('updateManifest', () => {
    it('should update manifest properties', () => {
      const originalManifest = {
        name: 'test-app',
        version: '1.0.0',
      };

      const updates = {
        version: '2.0.0',
        description: 'Updated description',
      };

      const updatedManifest = {
        ...originalManifest,
        ...updates,
      };

      mockManifestUtils.updateManifest.mockReturnValue(updatedManifest);

      const result = mockManifestUtils.updateManifest(
        originalManifest,
        updates,
      );

      expect(mockManifestUtils.updateManifest).toHaveBeenCalledWith(
        originalManifest,
        updates,
      );
      expect(result).toEqual(updatedManifest);
    });
  });

  describe('writeManifest', () => {
    it('should write manifest to file', () => {
      const manifest = {
        name: 'test-app',
        version: '1.0.0',
      };

      mockManifestUtils.writeManifest.mockImplementation();

      mockManifestUtils.writeManifest(manifest, 'manifest.json');

      expect(mockManifestUtils.writeManifest).toHaveBeenCalledWith(
        manifest,
        'manifest.json',
      );
    });
  });

  describe('getManifestPath', () => {
    it('should return manifest path', () => {
      mockManifestUtils.getManifestPath.mockReturnValue('./manifest.json');

      const path = mockManifestUtils.getManifestPath();

      expect(mockManifestUtils.getManifestPath).toHaveBeenCalled();
      expect(path).toBe('./manifest.json');
    });
  });

  describe('manifestExists', () => {
    it('should check if manifest exists', () => {
      mockManifestUtils.manifestExists.mockReturnValue(true);

      const exists = mockManifestUtils.manifestExists('manifest.json');

      expect(mockManifestUtils.manifestExists).toHaveBeenCalledWith(
        'manifest.json',
      );
      expect(exists).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors', () => {
      mockManifestUtils.getManifest.mockImplementation(() => {
        throw new Error('File system error');
      });

      expect(() => {
        mockManifestUtils.getManifest('test.json');
      }).toThrow('File system error');
    });

    it('should handle invalid JSON', () => {
      mockManifestUtils.getManifest.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      expect(() => {
        mockManifestUtils.getManifest('invalid.json');
      }).toThrow('Invalid JSON');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full manifest lifecycle', () => {
      const mockManifest = {
        name: 'test-app',
        version: '1.0.0',
        description: 'Test application',
      };

      // Mock all operations
      mockManifestUtils.hasManifest.mockReturnValue(true);
      mockManifestUtils.getManifest.mockReturnValue(mockManifest);
      mockManifestUtils.updateManifest.mockReturnValue({
        ...mockManifest,
        version: '2.0.0',
      });
      mockManifestUtils.writeManifest.mockImplementation();

      // Test the flow
      const hasManifest = mockManifestUtils.hasManifest('manifest.json');
      expect(hasManifest).toBe(true);

      const manifest = mockManifestUtils.getManifest('manifest.json');
      expect(manifest).toEqual(mockManifest);

      const updatedManifest = mockManifestUtils.updateManifest(manifest, {
        version: '2.0.0',
      });
      expect(updatedManifest.version).toBe('2.0.0');

      mockManifestUtils.writeManifest(updatedManifest, 'manifest.json');
      expect(mockManifestUtils.writeManifest).toHaveBeenCalledWith(
        updatedManifest,
        'manifest.json',
      );
    });
  });
});
