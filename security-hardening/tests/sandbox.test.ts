import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isPathAllowed, createFilesystemGuard } from '../src/sandbox/filesystem-guard.js';
import {
  isCommandAllowed,
  createCommandValidator,
  extractBaseCommand,
  DEFAULT_ALLOWED_COMMANDS,
} from '../src/sandbox/command-whitelist.js';

// Suppress log output
beforeEach(() => {
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Filesystem Guard - Extended
// ---------------------------------------------------------------------------
describe('Filesystem Guard - Extended', () => {
  describe('isPathAllowed - path normalization', () => {
    const allowedDirs = ['/home/user/workspace'];

    it('should handle trailing slash in allowed dir', () => {
      const dirs = ['/home/user/workspace/'];
      expect(isPathAllowed('/home/user/workspace/file.txt', dirs)).toBe(true);
    });

    it('should handle trailing slash in file path', () => {
      expect(isPathAllowed('/home/user/workspace/', allowedDirs)).toBe(true);
    });

    it('should handle paths with dot segments that stay within allowed dirs', () => {
      // /home/user/workspace/./file.txt normalizes to /home/user/workspace/file.txt
      expect(isPathAllowed('/home/user/workspace/./file.txt', allowedDirs)).toBe(true);
    });

    it('should block double-dot traversal even when it appears to land back in allowed dir', () => {
      // The path contains ".." which validateFilePath should reject
      expect(isPathAllowed('/home/user/workspace/sub/../../workspace/file.txt', allowedDirs)).toBe(
        false
      );
    });

    it('should handle multiple allowed directories', () => {
      const dirs = ['/tmp/data', '/home/user/project', '/var/log/app'];
      expect(isPathAllowed('/tmp/data/file.csv', dirs)).toBe(true);
      expect(isPathAllowed('/home/user/project/src/index.ts', dirs)).toBe(true);
      expect(isPathAllowed('/var/log/app/app.log', dirs)).toBe(true);
      expect(isPathAllowed('/etc/hosts', dirs)).toBe(false);
    });

    it('should block path that is parent of allowed directory', () => {
      expect(isPathAllowed('/home/user', allowedDirs)).toBe(false);
      expect(isPathAllowed('/home', allowedDirs)).toBe(false);
      expect(isPathAllowed('/', allowedDirs)).toBe(false);
    });

    it('should handle relative paths (resolve to absolute)', () => {
      // Relative paths are resolved against cwd; they won't match unless cwd is in allowed dirs
      const dirs = ['/home/user/workspace'];
      // This won't match because "file.txt" resolves to cwd/file.txt
      expect(isPathAllowed('file.txt', dirs)).toBe(false);
    });

    it('should handle the allowed directory itself (exact match)', () => {
      expect(isPathAllowed('/home/user/workspace', allowedDirs)).toBe(true);
    });
  });

  describe('isPathAllowed - security attacks', () => {
    const allowedDirs = ['/app/data'];

    it('should block encoded traversal attempts', () => {
      // These contain ".." after decoding
      expect(isPathAllowed('/app/data/../etc/passwd', allowedDirs)).toBe(false);
    });

    it('should block null byte injection', () => {
      expect(isPathAllowed('/app/data/file.txt\0.jpg', allowedDirs)).toBe(false);
    });

    it('should block paths with only dots', () => {
      expect(isPathAllowed('..', allowedDirs)).toBe(false);
      expect(isPathAllowed('../..', allowedDirs)).toBe(false);
    });

    it('should handle very long paths', () => {
      const longPath = '/app/data/' + 'a/'.repeat(500) + 'file.txt';
      expect(isPathAllowed(longPath, allowedDirs)).toBe(true);
    });

    it('should handle paths with special characters', () => {
      expect(isPathAllowed('/app/data/file with spaces.txt', allowedDirs)).toBe(true);
      expect(isPathAllowed('/app/data/file-name_v2.txt', allowedDirs)).toBe(true);
    });
  });

  describe('createFilesystemGuard - Extended', () => {
    it('should return a function', () => {
      const guard = createFilesystemGuard(['/tmp']);
      expect(typeof guard).toBe('function');
    });

    it('should allow deeply nested paths within allowed dir', () => {
      const guard = createFilesystemGuard(['/app']);
      expect(() => guard('/app/a/b/c/d/e/f/file.txt')).not.toThrow();
    });

    it('should include bilingual error message', () => {
      const guard = createFilesystemGuard(['/app']);
      try {
        guard('/etc/passwd');
        expect.fail('Should have thrown');
      } catch (error) {
        const msg = (error as Error).message;
        expect(msg).toContain('Filesystem access denied');
        expect(msg).toContain('/etc/passwd');
      }
    });

    it('should work with single-element allowed dirs', () => {
      const guard = createFilesystemGuard(['/only-dir']);
      expect(() => guard('/only-dir/file.txt')).not.toThrow();
      expect(() => guard('/other-dir/file.txt')).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Command Whitelist - Extended
// ---------------------------------------------------------------------------
describe('Command Whitelist - Extended', () => {
  describe('extractBaseCommand - Extended', () => {
    it('should handle command with pipe characters', () => {
      // Only the first token matters
      expect(extractBaseCommand('cat file.txt | grep pattern')).toBe('cat');
    });

    it('should handle command with redirect', () => {
      expect(extractBaseCommand('echo hello > output.txt')).toBe('echo');
    });

    it('should handle command with semicolons', () => {
      expect(extractBaseCommand('ls; rm -rf /')).toBe('ls;');
    });

    it('should handle command starting with env vars', () => {
      // "NODE_ENV=production" is the first token, "node" is not extracted
      expect(extractBaseCommand('NODE_ENV=production node app.js')).toBe('NODE_ENV=production');
    });

    it('should handle tab-separated command and args', () => {
      expect(extractBaseCommand('ls\t-la')).toBe('ls');
    });

    it('should handle single character commands', () => {
      expect(extractBaseCommand('w')).toBe('w');
    });

    it('should handle path with no basename', () => {
      // Edge case: "/" alone - pop() on ["",""] returns ""
      expect(extractBaseCommand('/')).toBe('');
    });
  });

  describe('isCommandAllowed - Extended', () => {
    it('should handle commands with subcommands', () => {
      expect(isCommandAllowed('git status')).toBe(true);
      expect(isCommandAllowed('git commit -m "message"')).toBe(true);
      expect(isCommandAllowed('node --version')).toBe(true);
    });

    it('should handle commands with full path and subcommands', () => {
      expect(isCommandAllowed('/usr/bin/git log --oneline')).toBe(true);
      expect(isCommandAllowed('/usr/local/bin/node -e "console.log(1)"')).toBe(true);
    });

    it('should block commands not in custom whitelist', () => {
      const restricted = ['python'];
      expect(isCommandAllowed('node', restricted)).toBe(false);
      expect(isCommandAllowed('python', restricted)).toBe(true);
    });

    it('should block dangerous shell commands', () => {
      const dangerousCommands = [
        'rm -rf /',
        'sudo reboot',
        'chmod 777 /',
        'chown root:root /etc/shadow',
        'kill -9 1',
        'dd if=/dev/zero of=/dev/sda',
        'mkfs.ext4 /dev/sda1',
        'iptables -F',
      ];
      for (const cmd of dangerousCommands) {
        expect(isCommandAllowed(cmd)).toBe(false);
      }
    });

    it('should handle command that matches whitelist partially but not exactly', () => {
      // "lsof" starts with "ls" but should not be allowed
      expect(isCommandAllowed('lsof')).toBe(false);
    });

    it('should be readonly at the TypeScript level (runtime array)', () => {
      // TypeScript `readonly` does not freeze at runtime, but the array should exist
      expect(Array.isArray(DEFAULT_ALLOWED_COMMANDS)).toBe(true);
      expect(DEFAULT_ALLOWED_COMMANDS.length).toBeGreaterThan(0);
    });
  });

  describe('createCommandValidator - Extended', () => {
    it('should return a function', () => {
      const validator = createCommandValidator();
      expect(typeof validator).toBe('function');
    });

    it('should include base command name in error message', () => {
      const validator = createCommandValidator();
      try {
        validator('dangerous-cmd --flag');
        expect.fail('Should have thrown');
      } catch (error) {
        const msg = (error as Error).message;
        expect(msg).toContain('dangerous-cmd');
        expect(msg).toContain('Command execution denied');
      }
    });

    it('should include bilingual error message', () => {
      const validator = createCommandValidator();
      try {
        validator('sudo rm -rf /');
        expect.fail('Should have thrown');
      } catch (error) {
        const msg = (error as Error).message;
        expect(msg).toContain('Command execution denied');
      }
    });

    it('should work with empty whitelist (blocks everything)', () => {
      const validator = createCommandValidator([]);
      expect(() => validator('ls')).toThrow();
      expect(() => validator('echo')).toThrow();
    });

    it('should work with single-entry whitelist', () => {
      const validator = createCommandValidator(['python']);
      expect(() => validator('python script.py')).not.toThrow();
      expect(() => validator('ruby script.rb')).toThrow();
    });
  });

  describe('DEFAULT_ALLOWED_COMMANDS - Extended', () => {
    it('should have exactly 14 commands', () => {
      expect(DEFAULT_ALLOWED_COMMANDS).toHaveLength(14);
    });

    it('should not contain duplicate entries', () => {
      const unique = new Set(DEFAULT_ALLOWED_COMMANDS);
      expect(unique.size).toBe(DEFAULT_ALLOWED_COMMANDS.length);
    });

    it('should contain only lowercase command names', () => {
      for (const cmd of DEFAULT_ALLOWED_COMMANDS) {
        expect(cmd).toBe(cmd.toLowerCase());
      }
    });

    it('should not contain shell interpreters', () => {
      expect(DEFAULT_ALLOWED_COMMANDS).not.toContain('bash');
      expect(DEFAULT_ALLOWED_COMMANDS).not.toContain('sh');
      expect(DEFAULT_ALLOWED_COMMANDS).not.toContain('zsh');
      expect(DEFAULT_ALLOWED_COMMANDS).not.toContain('fish');
    });

    it('should not contain package managers', () => {
      expect(DEFAULT_ALLOWED_COMMANDS).not.toContain('npm');
      expect(DEFAULT_ALLOWED_COMMANDS).not.toContain('pip');
      expect(DEFAULT_ALLOWED_COMMANDS).not.toContain('apt');
      expect(DEFAULT_ALLOWED_COMMANDS).not.toContain('brew');
    });
  });
});
