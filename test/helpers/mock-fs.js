// Mock file system helpers for testing

const path = require('path');
const os = require('os');

// Mock home directory
const mockHomeDir = '/tmp/test-home';

// Mock paths
const mockPaths = {
  homeDir: mockHomeDir,
  configDir: path.join(mockHomeDir, '.hostswitch'),
  profilesDir: path.join(mockHomeDir, '.hostswitch', 'profiles'),
  backupDir: path.join(mockHomeDir, '.hostswitch', 'backups'),
  hostsPath: '/tmp/test-hosts',
  currentProfileFile: path.join(mockHomeDir, '.hostswitch', 'current.json')
};

// Helper to setup mock environment
function setupMockEnvironment() {
  // Store original values
  const originalHomedir = os.homedir;
  const originalEnv = process.env.EDITOR;
  
  // Mock os.homedir
  os.homedir = jest.fn(() => mockHomeDir);
  
  // Set test editor
  process.env.EDITOR = 'echo';
  
  return {
    restore: () => {
      os.homedir = originalHomedir;
      if (originalEnv) {
        process.env.EDITOR = originalEnv;
      } else {
        delete process.env.EDITOR;
      }
    }
  };
}

// Helper to create a mock fs-extra module
function createMockFs() {
  const mockFiles = new Map();
  const mockDirs = new Set();
  
  return {
    ensureDirSync: jest.fn((dir) => {
      mockDirs.add(dir);
    }),
    
    existsSync: jest.fn((path) => {
      return mockFiles.has(path) || mockDirs.has(path);
    }),
    
    readFileSync: jest.fn((path, encoding) => {
      if (!mockFiles.has(path)) {
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
        error.code = 'ENOENT';
        throw error;
      }
      return mockFiles.get(path);
    }),
    
    writeFileSync: jest.fn((path, content) => {
      mockFiles.set(path, content);
    }),
    
    writeJsonSync: jest.fn((path, data) => {
      mockFiles.set(path, JSON.stringify(data, null, 2));
    }),
    
    readJsonSync: jest.fn((path) => {
      if (!mockFiles.has(path)) {
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
        error.code = 'ENOENT';
        throw error;
      }
      return JSON.parse(mockFiles.get(path));
    }),
    
    copySync: jest.fn((src, dest) => {
      if (!mockFiles.has(src)) {
        const error = new Error(`ENOENT: no such file or directory, open '${src}'`);
        error.code = 'ENOENT';
        throw error;
      }
      mockFiles.set(dest, mockFiles.get(src));
    }),
    
    unlinkSync: jest.fn((path) => {
      if (!mockFiles.has(path)) {
        const error = new Error(`ENOENT: no such file or directory, unlink '${path}'`);
        error.code = 'ENOENT';
        throw error;
      }
      mockFiles.delete(path);
    }),
    
    readdirSync: jest.fn((dir) => {
      const files = [];
      for (const [filePath] of mockFiles) {
        if (filePath.startsWith(dir + '/')) {
          const relativePath = filePath.substring(dir.length + 1);
          if (!relativePath.includes('/')) {
            files.push(relativePath);
          }
        }
      }
      return files;
    }),
    
    // Test helpers
    _setFile: (path, content) => {
      mockFiles.set(path, content);
    },
    
    _getFile: (path) => {
      return mockFiles.get(path);
    },
    
    _clear: () => {
      mockFiles.clear();
      mockDirs.clear();
    }
  };
}

module.exports = {
  mockPaths,
  setupMockEnvironment,
  createMockFs
};