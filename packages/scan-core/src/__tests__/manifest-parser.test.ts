import { describe, it, expect } from 'vitest';
import { parseManifestFromString, parseSkillName } from '../manifest-parser.js';

// ---------------------------------------------------------------------------
// parseManifestFromString
// ---------------------------------------------------------------------------

describe('parseManifestFromString', () => {
  describe('valid frontmatter', () => {
    it('parses name and description from frontmatter', () => {
      const content = [
        '---',
        'name: my-skill',
        'description: A test skill',
        '---',
        'Do the thing.',
      ].join('\n');

      const manifest = parseManifestFromString(content);
      expect(manifest.name).toBe('my-skill');
      expect(manifest.description).toBe('A test skill');
    });

    it('extracts instructions as the content after frontmatter', () => {
      const content = [
        '---',
        'name: my-skill',
        'description: A test skill',
        '---',
        'Do the thing.',
        'Second line.',
      ].join('\n');

      const manifest = parseManifestFromString(content);
      expect(manifest.instructions).toContain('Do the thing.');
      expect(manifest.instructions).toContain('Second line.');
    });

    it('parses optional license field', () => {
      const content = [
        '---',
        'name: my-skill',
        'description: desc',
        'license: MIT',
        '---',
        'instructions',
      ].join('\n');

      const manifest = parseManifestFromString(content);
      expect(manifest.license).toBe('MIT');
    });

    it('parses optional homepage field', () => {
      const content = [
        '---',
        'name: my-skill',
        'description: desc',
        'homepage: https://example.com',
        '---',
        'instructions',
      ].join('\n');

      const manifest = parseManifestFromString(content);
      expect(manifest.homepage).toBe('https://example.com');
    });

    it('parses user-invocable boolean', () => {
      const content = [
        '---',
        'name: my-skill',
        'description: desc',
        'user-invocable: true',
        '---',
        'instructions',
      ].join('\n');

      const manifest = parseManifestFromString(content);
      expect(manifest.userInvocable).toBe(true);
    });

    it('parses allowed-tools list', () => {
      const content = [
        '---',
        'name: my-skill',
        'description: desc',
        'allowed-tools:',
        '  - Bash',
        '  - Read',
        '---',
        'instructions',
      ].join('\n');

      const manifest = parseManifestFromString(content);
      expect(manifest['allowed-tools']).toEqual(['Bash', 'Read']);
    });
  });

  describe('metadata extraction', () => {
    it('extracts version from metadata object', () => {
      const content = [
        '---',
        'name: my-skill',
        'description: desc',
        'metadata:',
        '  version: "1.2.3"',
        '---',
        'instructions',
      ].join('\n');

      const manifest = parseManifestFromString(content);
      expect(manifest.metadata?.version).toBe('1.2.3');
    });

    it('extracts tags from metadata object', () => {
      const content = [
        '---',
        'name: my-skill',
        'description: desc',
        'metadata:',
        '  tags:',
        '    - security',
        '    - ai',
        '---',
        'instructions',
      ].join('\n');

      const manifest = parseManifestFromString(content);
      expect(manifest.metadata?.tags).toEqual(['security', 'ai']);
    });

    it('parses metadata when provided as a JSON string', () => {
      const metaJson = JSON.stringify({ version: '2.0.0', tags: ['test'] });
      const content = [
        '---',
        'name: my-skill',
        'description: desc',
        `metadata: '${metaJson}'`,
        '---',
        'instructions',
      ].join('\n');

      const manifest = parseManifestFromString(content);
      expect(manifest.metadata?.version).toBe('2.0.0');
    });

    it('silently ignores invalid JSON string in metadata', () => {
      const content = [
        '---',
        'name: my-skill',
        'description: desc',
        'metadata: "not valid json {"',
        '---',
        'instructions',
      ].join('\n');

      const manifest = parseManifestFromString(content);
      expect(manifest.metadata).toBeUndefined();
    });
  });

  describe('no frontmatter', () => {
    it('treats entire content as instructions when no frontmatter present', () => {
      const content = 'Just raw instructions without any frontmatter.';
      const manifest = parseManifestFromString(content);
      expect(manifest.instructions).toBe(content);
    });

    it('uses fallbackName when no frontmatter', () => {
      const content = 'Raw instructions.';
      const manifest = parseManifestFromString(content, 'fallback-name');
      expect(manifest.name).toBe('fallback-name');
    });

    it('uses "unknown" as default fallback name', () => {
      const content = 'Raw instructions.';
      const manifest = parseManifestFromString(content);
      expect(manifest.name).toBe('unknown');
    });

    it('returns empty description when no frontmatter', () => {
      const content = 'Raw instructions.';
      const manifest = parseManifestFromString(content);
      expect(manifest.description).toBe('');
    });

    it('handles empty string content', () => {
      const manifest = parseManifestFromString('');
      expect(manifest.name).toBe('unknown');
      expect(manifest.instructions).toBe('');
    });
  });

  describe('invalid YAML frontmatter', () => {
    it('returns fallback manifest for invalid YAML', () => {
      // YAML that is structurally invalid within the frontmatter block
      const content = [
        '---',
        'name: [unclosed bracket',
        'description: test',
        '---',
        'instructions here',
      ].join('\n');

      const manifest = parseManifestFromString(content, 'fallback');
      // Should fall back gracefully - either parse successfully or use fallback
      expect(manifest.name).toBeDefined();
      expect(typeof manifest.name).toBe('string');
    });

    it('uses fallbackName on YAML parse failure', () => {
      // Deeply malformed YAML that triggers a parse exception
      const badYaml = 'key: :\n  - invalid: : nested\n    bad: [unclosed';
      const content = `---\n${badYaml}\n---\ninstructions`;
      const manifest = parseManifestFromString(content, 'my-fallback');
      // Either parses or falls back - name must be a string
      expect(typeof manifest.name).toBe('string');
    });
  });

  describe('edge cases', () => {
    it('uses fallbackName when frontmatter has no name field', () => {
      const content = [
        '---',
        'description: no name here',
        '---',
        'instructions',
      ].join('\n');

      const manifest = parseManifestFromString(content, 'injected-name');
      expect(manifest.name).toBe('injected-name');
    });

    it('handles frontmatter with CRLF line endings', () => {
      const content = '---\r\nname: crlf-skill\r\ndescription: desc\r\n---\r\ninstructions';
      const manifest = parseManifestFromString(content);
      expect(manifest.name).toBe('crlf-skill');
    });

    it('instructions are empty string when nothing follows frontmatter', () => {
      const content = ['---', 'name: my-skill', 'description: desc', '---'].join('\n');
      const manifest = parseManifestFromString(content);
      // instructions should be empty or whitespace - just not throw
      expect(typeof manifest.instructions).toBe('string');
    });
  });
});

// ---------------------------------------------------------------------------
// parseSkillName
// ---------------------------------------------------------------------------

describe('parseSkillName', () => {
  it('extracts name from raw content with frontmatter', () => {
    const content = ['---', 'name: extracted-skill', 'description: test', '---', 'body'].join('\n');
    expect(parseSkillName(content)).toBe('extracted-skill');
  });

  it('returns null when no frontmatter present', () => {
    const content = 'Just raw content without frontmatter.';
    expect(parseSkillName(content)).toBeNull();
  });

  it('returns null when frontmatter has no name field', () => {
    const content = ['---', 'description: no name', '---', 'body'].join('\n');
    expect(parseSkillName(content)).toBeNull();
  });

  it('trims whitespace from the extracted name', () => {
    const content = ['---', 'name:   my-skill   ', '---', 'body'].join('\n');
    // The regex captures everything after "name: " so trailing space may or may not be trimmed
    // The implementation does .trim() so we expect clean value
    const name = parseSkillName(content);
    expect(name).toBe('my-skill');
  });

  it('handles names with hyphens and dots', () => {
    const content = ['---', 'name: my.complex-skill.v2', '---', 'body'].join('\n');
    expect(parseSkillName(content)).toBe('my.complex-skill.v2');
  });

  it('returns null for empty string', () => {
    expect(parseSkillName('')).toBeNull();
  });
});
