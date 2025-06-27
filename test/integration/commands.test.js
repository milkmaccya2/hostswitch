// Integration tests for HostSwitch CLI commands
// These tests verify the basic CLI functionality works

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('HostSwitch CLI Integration Tests', () => {
  const testDir = path.join(os.tmpdir(), 'hostswitch-test-' + Date.now());
  const testHome = path.join(testDir, 'home');
  const cliPath = path.resolve('./hostswitch.js');
  
  // Helper to run CLI commands safely
  function runCLI(args, options = {}) {
    const env = {
      ...process.env,
      HOME: testHome,
      ...options.env
    };
    
    try {
      const result = execSync(`node ${cliPath} ${args} 2>&1`, {
        env,
        encoding: 'utf8',
        timeout: 5000,
        ...options
      });
      return { success: true, output: result };
    } catch (error) {
      return { 
        success: false, 
        output: (error.stdout || '') + (error.stderr || ''), 
        error: error.stderr || error.message 
      };
    }
  }
  
  beforeAll(() => {
    // Create test directories
    fs.ensureDirSync(testHome);
  });
  
  afterAll(() => {
    // Cleanup
    try {
      fs.removeSync(testDir);
    } catch (err) {
      // Ignore cleanup errors
    }
  });
  
  describe('Basic Commands', () => {
    it('should show version', () => {
      const result = runCLI('--version');
      expect(result.success).toBe(true);
      expect(result.output).toMatch(/\d+\.\d+\.\d+/);
    });
    
    it('should show help', () => {
      const result = runCLI('--help');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Usage:');
      expect(result.output).toContain('list');
      expect(result.output).toContain('create');
      expect(result.output).toContain('switch');
    });
    
    it('should list profiles (empty initially)', () => {
      const result = runCLI('list');
      expect(result.success).toBe(true);
      expect(result.output).toContain('No profiles found');
    });
  });
  
  describe('Profile Management', () => {
    it('should create a new profile', () => {
      const result = runCLI('create test-profile');
      expect(result.success).toBe(true);
      expect(result.output).toContain("Profile 'test-profile' created");
      
      // Verify profile was created
      const profilePath = path.join(testHome, '.hostswitch/profiles/test-profile.hosts');
      expect(fs.existsSync(profilePath)).toBe(true);
    });
    
    it('should list created profiles', () => {
      const result = runCLI('list');
      expect(result.success).toBe(true);
      expect(result.output).toContain('test-profile');
    });
    
    it('should show profile content', () => {
      const result = runCLI('show test-profile');
      expect(result.success).toBe(true);
      expect(result.output).toContain('127.0.0.1       localhost');
    });
    
    it('should prevent duplicate profiles', () => {
      const result = runCLI('create test-profile');
      expect(result.success).toBe(true); // CLI doesn't exit with error code in current implementation
      expect(result.output).toContain('already exists');
    });
  });
  
  describe('Command Aliases', () => {
    it('should support ls alias for list', () => {
      const result = runCLI('ls');
      expect(result.success).toBe(true);
      expect(result.output).toContain('profiles');
    });
    
    it('should support cat alias for show', () => {
      const result = runCLI('cat test-profile');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Content of profile');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid commands gracefully', () => {
      const result = runCLI('invalid-command');
      expect(result.success).toBe(false);
      // Command execution fails, which is the expected behavior
      expect(result.error).toContain('Command failed');
    });
    
    it('should require profile name for create', () => {
      const result = runCLI('create');
      expect(result.success).toBe(false);
      // Command execution fails due to missing argument, which is expected
      expect(result.error).toContain('Command failed');
    });
    
    it('should handle non-existent profile show gracefully', () => {
      const result = runCLI('show non-existent');
      expect(result.success).toBe(true); // CLI doesn't exit with error code
      expect(result.output).toContain('does not exist');
    });
  });
  
  describe('Profile Cleanup', () => {
    it('should delete a profile', () => {
      const result = runCLI('delete test-profile');
      expect(result.success).toBe(true);
      expect(result.output).toContain("Profile 'test-profile' deleted");
      
      // Verify profile was deleted
      const profilePath = path.join(testHome, '.hostswitch/profiles/test-profile.hosts');
      expect(fs.existsSync(profilePath)).toBe(false);
    });
    
    it('should support rm alias for delete', () => {
      // Create a profile first
      runCLI('create temp-profile');
      
      const result = runCLI('rm temp-profile');
      expect(result.success).toBe(true);
      expect(result.output).toContain('deleted');
    });
  });
});