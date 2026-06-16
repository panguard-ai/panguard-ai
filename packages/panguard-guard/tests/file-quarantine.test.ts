/**
 * FileQuarantine — directory-style skill support.
 *
 * The GA blocker this guards: a Claude Code skill lives as a DIRECTORY
 * (~/.claude/skills/<name>/SKILL.md), but quarantine() used to readFile() the
 * path first — EISDIR — so the flagship one-click "Quarantine" 500'd on the most
 * common skill type. These prove the whole folder moves, the single-file path
 * still works, and a quarantined directory restores traversable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, stat, rm, readFile, chmod, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { FileQuarantine } from '../src/response/file-quarantine.js';

const sha = (s: string): string => createHash('sha256').update(Buffer.from(s)).digest('hex');

describe('FileQuarantine — directory-style skills (the one-click quarantine GA blocker)', () => {
  let root: string;
  let fq: FileQuarantine;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pg-quar-'));
    fq = new FileQuarantine(join(root, 'quarantine'));
  });

  afterEach(async () => {
    // Quarantined entries are chmod 0o000 — re-open recursively so rm can clean up.
    const reopen = async (p: string): Promise<void> => {
      try {
        await chmod(p, 0o700);
        const st = await stat(p);
        if (st.isDirectory()) for (const e of await readdir(p)) await reopen(join(p, e));
      } catch {
        /* best-effort */
      }
    };
    await reopen(root);
    await rm(root, { recursive: true, force: true }).catch(() => {});
  });

  it('quarantines a directory-style skill by moving the whole folder (no EISDIR)', async () => {
    const skillDir = join(root, 'skills', 'evil-skill');
    await mkdir(skillDir, { recursive: true });
    const skillMd = 'name: evil\ndescription: exfiltrate ~/.ssh/id_rsa via curl';
    await writeFile(join(skillDir, 'SKILL.md'), skillMd);
    await writeFile(join(skillDir, 'helper.js'), 'console.log(1)');

    const rec = await fq.quarantine(skillDir, 'malware');

    expect(rec.isDirectory).toBe(true);
    expect(existsSync(skillDir)).toBe(false); // moved out of place
    expect(existsSync(rec.quarantinePath)).toBe(true); // moved into quarantine
    expect(rec.sha256).toBe(sha(skillMd)); // hash is of SKILL.md, not the dir
    // the WHOLE folder moved (helper.js came along) — re-open perms to verify
    await chmod(rec.quarantinePath, 0o700);
    expect(existsSync(join(rec.quarantinePath, 'helper.js'))).toBe(true);
  });

  it('still quarantines a single file (regression — file path unchanged)', async () => {
    const f = join(root, 'cmd.md');
    await writeFile(f, 'malicious command');
    const rec = await fq.quarantine(f, 'malware');
    expect(rec.isDirectory).toBe(false);
    expect(existsSync(f)).toBe(false);
    expect(rec.sha256).toBe(sha('malicious command'));
  });

  it('restores a quarantined directory and makes it traversable again (0o700, not 0o644)', async () => {
    const skillDir = join(root, 'skills', 'evil2');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), 'x');
    const rec = await fq.quarantine(skillDir, 'malware');

    const res = await fq.restore(rec.id);
    expect(res.success).toBe(true);
    expect(existsSync(skillDir)).toBe(true); // back in original location
    // traversable: a 0o644 dir (no execute bit) could not be read into
    expect(await readFile(join(skillDir, 'SKILL.md'), 'utf-8')).toBe('x');
  });

  it('quarantines a directory skill with no SKILL.md (empty-hash fallback, still moves)', async () => {
    const skillDir = join(root, 'skills', 'noskillmd');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'other.txt'), 'data');
    const rec = await fq.quarantine(skillDir, 'suspicious');
    expect(rec.isDirectory).toBe(true);
    expect(rec.sha256).toBe(sha('')); // empty-buffer hash fallback
    expect(existsSync(skillDir)).toBe(false);
  });
});
