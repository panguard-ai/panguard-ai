import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { directoryContentHash, mcpServerHash, stripLocalPath } from '../local-hash.js';

describe('directoryContentHash', () => {
  let a: string;
  let b: string;

  beforeEach(() => {
    a = mkdtempSync(join(tmpdir(), 'lh-alice-'));
    b = mkdtempSync(join(tmpdir(), 'lh-bob-'));
  });

  afterEach(() => {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  });

  const fill = (dir: string): void => {
    mkdirSync(join(dir, 'sub'));
    writeFileSync(join(dir, 'a.js'), 'console.log(1)');
    writeFileSync(join(dir, 'sub', 'b.js'), 'console.log(2)');
  };

  it('is the same for identical content in different locations', () => {
    fill(a);
    fill(b);
    expect(directoryContentHash(a)).toBe(directoryContentHash(b));
    expect(directoryContentHash(a)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('changes when a file changes or is renamed', () => {
    fill(a);
    const before = directoryContentHash(a);
    writeFileSync(join(a, 'a.js'), 'console.log(3)');
    expect(directoryContentHash(a)).not.toBe(before);
    fill(b);
    writeFileSync(join(b, 'c.js'), 'console.log(1)');
    expect(directoryContentHash(b)).not.toBe(before);
  });

  it('ignores node_modules and honours the file bound', () => {
    fill(a);
    const before = directoryContentHash(a);
    mkdirSync(join(a, 'node_modules'));
    writeFileSync(join(a, 'node_modules', 'x.js'), 'x');
    expect(directoryContentHash(a)).toBe(before);
    expect(directoryContentHash(a, { maxFiles: 1 })).not.toBe(before);
  });

  it('does not contain the absolute path in its input', () => {
    // two different absolute locations, same content => same hash (proved above);
    // an empty directory hashes the same wherever it is
    expect(directoryContentHash(a)).toBe(directoryContentHash(b));
  });
});

describe('directoryContentHash limits', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'lh-limits-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('does not follow symlinks to directories or files', () => {
    const outside = mkdtempSync(join(tmpdir(), 'lh-outside-'));
    try {
      writeFileSync(join(outside, 'secret.txt'), 'outside content');
      writeFileSync(join(root, 'a.txt'), 'a');
      const before = directoryContentHash(root);
      symlinkSync(outside, join(root, 'linked-dir'));
      symlinkSync(join(outside, 'secret.txt'), join(root, 'linked-file'));
      expect(directoryContentHash(root)).toBe(before);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('returns quickly for a self-referencing link', () => {
    writeFileSync(join(root, 'a.txt'), 'a');
    symlinkSync(root, join(root, 'loop'));
    const start = Date.now();
    expect(directoryContentHash(root)).toMatch(/^[0-9a-f]{16}$/);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it('stops at the file limit without visiting the rest of a larger tree', () => {
    for (let d = 0; d < 20; d++) {
      mkdirSync(join(root, `d${d}`));
      for (let f = 0; f < 20; f++) writeFileSync(join(root, `d${d}`, `f${f}.txt`), `${d}-${f}`);
    }
    const start = Date.now();
    const limited = directoryContentHash(root, { maxFiles: 5 });
    expect(Date.now() - start).toBeLessThan(2000);
    // only the first files (in sorted order) count: later changes do not matter
    writeFileSync(join(root, 'd19', 'f19.txt'), 'changed');
    expect(directoryContentHash(root, { maxFiles: 5 })).toBe(limited);
  });

  it('stops at the byte limit and at the depth limit', () => {
    writeFileSync(join(root, 'big.bin'), Buffer.alloc(64 * 1024, 1));
    const capped = directoryContentHash(root, { maxBytes: 1024 });
    writeFileSync(
      join(root, 'big.bin'),
      Buffer.concat([Buffer.alloc(1024, 1), Buffer.alloc(63 * 1024, 2)])
    );
    expect(directoryContentHash(root, { maxBytes: 1024 })).toBe(capped);

    let deep = root;
    for (let i = 0; i < 30; i++) {
      deep = join(deep, `n${i}`);
      mkdirSync(deep);
    }
    writeFileSync(join(deep, 'leaf.txt'), 'x');
    const start = Date.now();
    const shallow = directoryContentHash(root, { maxDepth: 3 });
    writeFileSync(join(deep, 'leaf.txt'), 'y');
    expect(directoryContentHash(root, { maxDepth: 3 })).toBe(shallow);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

describe('mcpServerHash', () => {
  it('is independent of the absolute path of the command and path args', () => {
    const one = mcpServerHash({
      name: 'fs',
      command: '/Users/alice/bin/node',
      args: ['/Users/alice/work/server.js', '--root=/Users/alice/data'],
    });
    const two = mcpServerHash({
      name: 'fs',
      command: 'C:\\Users\\bob\\bin\\node',
      args: ['D:\\code\\server.js', '--root=/home/bob/data'],
    });
    expect(one).toBe(two);
  });

  it('still distinguishes different servers and args', () => {
    const base = { name: 'fs', command: 'npx', args: ['-y', 'pkg-a'] };
    expect(mcpServerHash(base)).not.toBe(mcpServerHash({ ...base, args: ['-y', 'pkg-b'] }));
    expect(mcpServerHash(base)).not.toBe(mcpServerHash({ ...base, name: 'other' }));
  });

  it('stripLocalPath keeps non-path args and reduces path args', () => {
    expect(stripLocalPath('-y')).toBe('-y');
    expect(stripLocalPath('@scope/pkg')).toBe('@scope/pkg');
    expect(stripLocalPath('~/x/y.js')).toBe('y.js');
    expect(stripLocalPath('--cfg=/etc/app/conf.json')).toBe('--cfg=conf.json');
  });
});
