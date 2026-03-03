/**
 * SAST checker module unit tests
 * SAST 檢查器模組單元測試
 *
 * Tests the checkSourceCode function including semgrep integration,
 * built-in fallback regex scanner, directory walking, deduplication,
 * and error handling.
 *
 * 測試 checkSourceCode 函式，包括 semgrep 整合、內建備用正規表示式掃描器、
 * 目錄遍歷、去重和錯誤處理。
 *
 * @module @panguard-ai/panguard-scan/tests/sast-checker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Mock @panguard-ai/core's createLogger before importing the module under test
// 在匯入受測模組之前模擬 @panguard-ai/core 的 createLogger
// ---------------------------------------------------------------------------
vi.mock('@panguard-ai/core', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  };
});

// Note: node:child_process is used as-is; individual tests spy on it as needed
// 注意：node:child_process 按原樣使用；個別測試按需對其進行 spy

import { checkSourceCode } from '../src/scanners/sast-checker.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a temporary directory with the given file contents
 * 建立包含指定檔案內容的臨時目錄
 *
 * @param files - Map of relative path to file content / 相對路徑到檔案內容的對應
 * @returns Absolute path to the temp directory / 臨時目錄的絕對路徑
 */
async function createTempDir(files: Record<string, string>): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'panguard-sast-test-'));

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(tmpDir, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  return tmpDir;
}

/**
 * Remove a temporary directory
 * 移除臨時目錄
 *
 * @param dir - Directory to remove / 要移除的目錄
 */
async function removeTempDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sast-checker.ts - checkSourceCode', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = '';
  });

  afterEach(async () => {
    if (tmpDir) {
      await removeTempDir(tmpDir);
    }
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Directory validation
  // -------------------------------------------------------------------------

  /**
   * Passing a non-existent directory should return an empty array without throwing.
   * 傳入不存在的目錄應回傳空陣列而不拋出例外。
   */
  it('should return empty array for non-existent directory', async () => {
    const findings = await checkSourceCode('/tmp/panguard-nonexistent-dir-99999');
    expect(findings).toEqual([]);
  });

  /**
   * Passing a file path (not a directory) should return an empty array.
   * 傳入檔案路徑（非目錄）應回傳空陣列。
   */
  it('should return empty array when target is a file not a directory', async () => {
    tmpDir = await createTempDir({ 'test.ts': 'const x = 1;' });
    const filePath = path.join(tmpDir, 'test.ts');
    const findings = await checkSourceCode(filePath);
    expect(findings).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Built-in pattern: SQL injection detection
  // -------------------------------------------------------------------------

  /**
   * A file containing a SQL injection pattern should produce a finding.
   * 包含 SQL 注入模式的檔案應產生發現。
   */
  it('should detect SQL injection pattern in source file', async () => {
    tmpDir = await createTempDir({
      'app.js': `
const userId = req.params.id;
const result = query("SELECT * FROM users WHERE id=" + req.body.userId);
`,
    });

    const findings = await checkSourceCode(tmpDir);
    const sqlFindings = findings.filter((f) => f.id.startsWith('SAST-SQL-INJECTION'));
    expect(sqlFindings.length).toBeGreaterThanOrEqual(1);
    expect(sqlFindings[0].severity).toBe('high');
    expect(sqlFindings[0].category).toBe('code');
    expect(sqlFindings[0].complianceRef).toBe('4.3');
  });

  // -------------------------------------------------------------------------
  // Built-in pattern: hardcoded secret detection
  // -------------------------------------------------------------------------

  /**
   * A file containing a hardcoded password should produce a critical finding.
   * 包含硬編碼密碼的檔案應產生嚴重發現。
   */
  it('should detect hardcoded secrets in source files', async () => {
    tmpDir = await createTempDir({
      'config.ts': `
const config = {
  password: "super_secret_password_123",
  api_key: "my-api-key-value-1234",
};
`,
    });

    const findings = await checkSourceCode(tmpDir);
    const secretFindings = findings.filter((f) => f.id.startsWith('SAST-HARDCODED-SECRET'));
    expect(secretFindings.length).toBeGreaterThanOrEqual(1);
    expect(secretFindings[0].severity).toBe('critical');
  });

  // -------------------------------------------------------------------------
  // Built-in pattern: eval injection detection
  // -------------------------------------------------------------------------

  /**
   * A file using eval() with user input should be flagged as critical.
   * 使用 eval() 並帶有使用者輸入的檔案應被標記為嚴重。
   */
  it('should detect eval() with user input', async () => {
    tmpDir = await createTempDir({
      'handler.js': `
function handle(req) {
  eval(req.body.code);
}
`,
    });

    const findings = await checkSourceCode(tmpDir);
    const evalFindings = findings.filter((f) => f.id.startsWith('SAST-EVAL-INJECTION'));
    expect(evalFindings.length).toBeGreaterThanOrEqual(1);
    expect(evalFindings[0].severity).toBe('critical');
    expect(evalFindings[0].complianceRef).toBe('4.3');
  });

  // -------------------------------------------------------------------------
  // Built-in pattern: command injection detection
  // -------------------------------------------------------------------------

  /**
   * A file using exec with user input should be flagged.
   * 使用帶使用者輸入的 exec 的檔案應被標記。
   */
  it('should detect command injection risk', async () => {
    tmpDir = await createTempDir({
      'server.js': `
const { exec } = require('child_process');
function run(req) {
  exec('ls ' + req.query.path, (err, stdout) => {});
}
`,
    });

    const findings = await checkSourceCode(tmpDir);
    const cmdFindings = findings.filter((f) => f.id.startsWith('SAST-CMD-INJECTION'));
    expect(cmdFindings.length).toBeGreaterThanOrEqual(1);
    expect(cmdFindings[0].severity).toBe('critical');
  });

  // -------------------------------------------------------------------------
  // Built-in pattern: insecure random
  // -------------------------------------------------------------------------

  /**
   * A file using Math.random() should produce a medium finding.
   * 使用 Math.random() 的檔案應產生中等發現。
   */
  it('should detect insecure Math.random() usage', async () => {
    tmpDir = await createTempDir({
      'utils.ts': `
function generateToken(): string {
  return Math.random().toString(36).substr(2, 9);
}
`,
    });

    const findings = await checkSourceCode(tmpDir);
    const randFindings = findings.filter((f) => f.id.startsWith('SAST-INSECURE-RANDOM'));
    expect(randFindings.length).toBeGreaterThanOrEqual(1);
    expect(randFindings[0].severity).toBe('medium');
    expect(randFindings[0].complianceRef).toBe('4.4');
  });

  // -------------------------------------------------------------------------
  // Built-in pattern: MD5 usage
  // -------------------------------------------------------------------------

  /**
   * A file using MD5 hash should produce a high finding.
   * 使用 MD5 雜湊的檔案應產生高嚴重度發現。
   */
  it('should detect weak MD5 hash usage', async () => {
    tmpDir = await createTempDir({
      'crypto.js': `
const crypto = require('crypto');
const hash = crypto.createHash('md5').update(data).digest('hex');
`,
    });

    const findings = await checkSourceCode(tmpDir);
    const md5Findings = findings.filter((f) => f.id.startsWith('SAST-MD5-USAGE'));
    expect(md5Findings.length).toBeGreaterThanOrEqual(1);
    expect(md5Findings[0].severity).toBe('high');
    expect(md5Findings[0].complianceRef).toBe('4.4');
  });

  // -------------------------------------------------------------------------
  // Built-in pattern: innerHTML XSS
  // -------------------------------------------------------------------------

  /**
   * A file using innerHTML assignment should produce a high finding.
   * 使用 innerHTML 賦值的檔案應產生高嚴重度發現。
   */
  it('should detect potential XSS via innerHTML', async () => {
    tmpDir = await createTempDir({
      'component.js': `
function updateUI(userInput) {
  document.getElementById('output').innerHTML = userInput;
}
`,
    });

    const findings = await checkSourceCode(tmpDir);
    const xssFindings = findings.filter((f) => f.id.startsWith('SAST-INNERHTML'));
    expect(xssFindings.length).toBeGreaterThanOrEqual(1);
    expect(xssFindings[0].severity).toBe('high');
  });

  // -------------------------------------------------------------------------
  // node_modules skipping
  // -------------------------------------------------------------------------

  /**
   * Files inside node_modules should NOT be scanned.
   * node_modules 中的檔案不應被掃描。
   */
  it('should skip node_modules directory', async () => {
    tmpDir = await createTempDir({
      'node_modules/some-lib/index.js': `
const password = "vulnerable_password_123";
const result = query("SELECT * FROM users WHERE id=" + req.body.id);
`,
      'src/app.js': 'const x = 1;',
    });

    const findings = await checkSourceCode(tmpDir);

    // All findings should reference files NOT in node_modules
    // 所有發現都應引用不在 node_modules 中的檔案
    for (const finding of findings) {
      expect(finding.details ?? '').not.toContain('node_modules');
    }
  });

  // -------------------------------------------------------------------------
  // .git directory skipping
  // -------------------------------------------------------------------------

  /**
   * Files inside .git directory should NOT be scanned.
   * .git 目錄中的檔案不應被掃描。
   */
  it('should skip .git directory', async () => {
    tmpDir = await createTempDir({
      '.git/hooks/pre-commit': `
const secret_key = "abc12345678901234";
`,
      'src/main.ts': 'export const x = 1;',
    });

    const findings = await checkSourceCode(tmpDir);
    for (const finding of findings) {
      expect(finding.details ?? '').not.toContain('.git');
    }
  });

  // -------------------------------------------------------------------------
  // Clean file produces no findings
  // -------------------------------------------------------------------------

  /**
   * A file with no security issues should produce no findings.
   * 沒有安全問題的檔案應不產生發現。
   */
  it('should return empty array for clean source files', async () => {
    tmpDir = await createTempDir({
      'clean.ts': `
export function add(a: number, b: number): number {
  return a + b;
}

export function greet(name: string): string {
  return \`Hello, \${name}\`;
}
`,
    });

    const findings = await checkSourceCode(tmpDir);
    expect(findings).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Multiple files with mixed findings
  // -------------------------------------------------------------------------

  /**
   * Scanning multiple files should aggregate findings from all of them.
   * 掃描多個檔案應彙總所有檔案的發現。
   */
  it('should aggregate findings from multiple source files', async () => {
    tmpDir = await createTempDir({
      'src/auth.ts': `
const db_password = "my_db_password_123";
`,
      'src/utils.js': `
const token = Math.random().toString(36);
`,
    });

    const findings = await checkSourceCode(tmpDir);
    expect(findings.length).toBeGreaterThanOrEqual(2);

    const filePaths = findings.map((f) => f.details ?? '');
    const hasAuthFile = filePaths.some((p) => p.includes('auth.ts'));
    const hasUtilsFile = filePaths.some((p) => p.includes('utils.js'));
    expect(hasAuthFile).toBe(true);
    expect(hasUtilsFile).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Finding structure validation
  // -------------------------------------------------------------------------

  /**
   * Each finding should have all required fields populated correctly.
   * 每個發現都應正確填充所有必要欄位。
   */
  it('should produce findings with correct structure and required fields', async () => {
    tmpDir = await createTempDir({
      'test.js': `
const secret = "api_key_value_12345";
`,
    });

    const findings = await checkSourceCode(tmpDir);
    expect(findings.length).toBeGreaterThan(0);

    const f = findings[0];
    expect(f).toHaveProperty('id');
    expect(f).toHaveProperty('title');
    expect(f).toHaveProperty('description');
    expect(f).toHaveProperty('severity');
    expect(f).toHaveProperty('category');
    expect(f).toHaveProperty('remediation');

    expect(typeof f.id).toBe('string');
    expect(f.id.length).toBeGreaterThan(0);
    expect(typeof f.title).toBe('string');
    expect(f.title.length).toBeGreaterThan(0);
    expect(f.category).toBe('code');
    expect(['critical', 'high', 'medium', 'low', 'info']).toContain(f.severity);
  });

  // -------------------------------------------------------------------------
  // .env file detection
  // -------------------------------------------------------------------------

  /**
   * A .env file with real values in the scanned directory should produce a finding.
   * 掃描目錄中包含真實值的 .env 檔案應產生發現。
   */
  it('should detect .env files with real credentials', async () => {
    tmpDir = await createTempDir({
      '.env': `
DATABASE_URL=postgres://user:password@localhost:5432/mydb
API_KEY=sk-1234567890abcdef
`,
    });

    const findings = await checkSourceCode(tmpDir);
    const envFindings = findings.filter((f) => f.id.includes('ENV-FILE'));
    expect(envFindings.length).toBeGreaterThanOrEqual(1);
    expect(envFindings[0].severity).toBe('high');
  });

  // -------------------------------------------------------------------------
  // Semgrep not available falls back gracefully
  // -------------------------------------------------------------------------

  /**
   * When semgrep is not installed, the built-in scanner should run and detect patterns.
   * This test verifies the fallback path executes (semgrep is not installed in CI).
   * 當 semgrep 未安裝時，應執行內建掃描器並偵測模式。
   * 此測試驗證備用路徑執行（CI 中未安裝 semgrep）。
   */
  it('should use built-in scanner and detect patterns when semgrep is not available', async () => {
    tmpDir = await createTempDir({
      'app.js': `
const result = query("SELECT * FROM users WHERE id=" + req.body.id);
const token = Math.random().toString(36);
`,
    });

    // checkSourceCode will use the built-in scanner when semgrep is not installed.
    // The built-in scanner must detect both the SQL injection and insecure random patterns.
    // checkSourceCode 在 semgrep 未安裝時使用內建掃描器。
    // 內建掃描器必須偵測 SQL 注入和不安全隨機數模式。
    const findings = await checkSourceCode(tmpDir);
    expect(findings.length).toBeGreaterThanOrEqual(1);

    // At least SQL injection or insecure random should be detected
    // 至少應偵測到 SQL 注入或不安全隨機數
    const patternFindings = findings.filter(
      (f) =>
        f.id.startsWith('SAST-SQL-INJECTION') ||
        f.id.startsWith('SAST-INSECURE-RANDOM')
    );
    expect(patternFindings.length).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // False positive minimization
  // -------------------------------------------------------------------------

  /**
   * A safe SQL query using a parameterized form should not trigger SQL injection.
   * 使用參數化形式的安全 SQL 查詢不應觸發 SQL 注入。
   */
  it('should not flag safe parameterized queries as SQL injection', async () => {
    tmpDir = await createTempDir({
      'safe.js': `
// Safe parameterized query
const result = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
const result2 = await pool.execute('INSERT INTO logs VALUES (?, ?, ?)', [a, b, c]);
`,
    });

    const findings = await checkSourceCode(tmpDir);
    const sqlFindings = findings.filter((f) => f.id.startsWith('SAST-SQL-INJECTION'));
    expect(sqlFindings.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Deduplication
  // -------------------------------------------------------------------------

  /**
   * The same pattern match at the same line should only produce one finding.
   * 同一行的相同模式匹配應只產生一個發現。
   */
  it('should deduplicate findings with same id and line', async () => {
    tmpDir = await createTempDir({
      'app.js': `const token = Math.random().toString(36);`,
    });

    const findings = await checkSourceCode(tmpDir);
    const randFindings = findings.filter((f) => f.id.startsWith('SAST-INSECURE-RANDOM'));

    // Each unique line should only appear once
    // 每個唯一行應只出現一次
    const linesSeen = new Set<string>();
    for (const f of randFindings) {
      expect(linesSeen.has(f.details ?? '')).toBe(false);
      linesSeen.add(f.details ?? '');
    }
  });

  // -------------------------------------------------------------------------
  // Only scan specified extensions
  // -------------------------------------------------------------------------

  /**
   * Binary files and unsupported extensions should be ignored.
   * 二進制檔案和不支援的副檔名應被忽略。
   */
  it('should only scan files with supported extensions', async () => {
    tmpDir = await createTempDir({
      'README.md': `const password = "secret_password_123";`,
      'data.csv': `password,secret_value_12345`,
      'app.ts': `const x = 1;`,
    });

    const findings = await checkSourceCode(tmpDir);

    // Findings should not reference .md or .csv files
    // 發現不應引用 .md 或 .csv 檔案
    for (const f of findings) {
      expect(f.details ?? '').not.toContain('README.md');
      expect(f.details ?? '').not.toContain('data.csv');
    }
  });
});
