/**
 * Migrate plaintext credentials to secure storage
 * 將明文憑證遷移到安全儲存
 *
 * @module @panguard-ai/security-hardening/credentials/migration
 */

import { existsSync, readdirSync, readFileSync, renameSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createLogger } from '@panguard-ai/core';
import type { CredentialStore, MigrationReport } from '../types.js';

const logger = createLogger('credentials:migration');

/** Default Panguard credentials directory / 預設 Panguard 憑證目錄 */
const DEFAULT_CREDENTIALS_DIR = join(homedir(), '.panguard', 'credentials');

/**
 * Plaintext credential file information
 * 明文憑證檔案資訊
 */
interface PlaintextCredential {
  service: string;
  account: string;
  value: string;
  filePath: string;
}

/**
 * Known credential file patterns
 * 已知的憑證檔案模式
 */
const CREDENTIAL_PATTERNS: Array<{ pattern: RegExp; service: string; account: string }> = [
  { pattern: /^telegram[._-]?token$/i, service: 'telegram', account: 'bot' },
  { pattern: /^slack[._-]?token$/i, service: 'slack', account: 'default' },
  { pattern: /^discord[._-]?token$/i, service: 'discord', account: 'bot' },
  { pattern: /^openai[._-]?(key|token)$/i, service: 'openai', account: 'default' },
  { pattern: /^claude[._-]?(key|token)$/i, service: 'claude', account: 'default' },
  { pattern: /^line[._-]?token$/i, service: 'line', account: 'default' },
  { pattern: /^whatsapp[._-]?token$/i, service: 'whatsapp', account: 'default' },
  { pattern: /^signal[._-]?token$/i, service: 'signal', account: 'default' },
];

/**
 * Scan for plaintext credential files
 * 掃描明文憑證檔案
 *
 * @param credentialsDir - Directory to scan / 要掃描的目錄
 * @returns Array of found plaintext credentials / 找到的明文憑證陣列
 */
export function scanPlaintextCredentials(
  credentialsDir: string = DEFAULT_CREDENTIALS_DIR
): PlaintextCredential[] {
  if (!existsSync(credentialsDir)) {
    logger.info('Credentials directory not found, no plaintext credentials', { credentialsDir });
    return [];
  }

  const credentials: PlaintextCredential[] = [];

  let files: string[];
  try {
    files = readdirSync(credentialsDir);
  } catch (error) {
    logger.error('Failed to read credentials directory', { credentialsDir, error: String(error) });
    return [];
  }

  for (const file of files) {
    // Skip backup files and hidden files
    if (file.startsWith('.') || file.endsWith('.backup') || file.endsWith('.enc')) {
      continue;
    }

    const filePath = join(credentialsDir, file);

    // Match against known patterns
    for (const { pattern, service, account } of CREDENTIAL_PATTERNS) {
      if (pattern.test(file)) {
        try {
          const value = readFileSync(filePath, 'utf-8').trim();
          if (value.length > 0) {
            credentials.push({ service, account, value, filePath });
            logger.warn('Plaintext credential found', { service, account, filePath });
          }
        } catch (error) {
          logger.error('Failed to read credential file', { filePath, error: String(error) });
        }
        break;
      }
    }
  }

  return credentials;
}

/**
 * Migrate plaintext credentials to secure storage
 * 將明文憑證遷移到安全儲存
 *
 * @param store - Target credential store / 目標憑證儲存
 * @param credentialsDir - Source directory / 來源目錄
 * @param dryRun - If true, only report without migrating / 僅報告而不遷移
 * @returns Migration report / 遷移報告
 */
export async function migrateCredentials(
  store: CredentialStore,
  credentialsDir: string = DEFAULT_CREDENTIALS_DIR,
  dryRun = false
): Promise<MigrationReport> {
  const credentials = scanPlaintextCredentials(credentialsDir);
  const report: MigrationReport = {
    scanned: credentials.length,
    migrated: 0,
    failed: 0,
    errors: [],
  };

  if (credentials.length === 0) {
    logger.info('No plaintext credentials found to migrate');
    return report;
  }

  logger.info(`Found ${credentials.length} plaintext credential(s)`, { dryRun });

  for (const { service, account, value, filePath } of credentials) {
    if (dryRun) {
      logger.info('[DRY RUN] Would migrate credential', { service, account });
      report.migrated++;
      continue;
    }

    try {
      await store.set(service, account, value);
      renameSync(filePath, `${filePath}.backup`);
      logger.info('Credential migrated successfully', { service, account });
      report.migrated++;
    } catch (error) {
      const msg = `Failed to migrate ${service}:${account}: ${String(error)}`;
      logger.error(msg);
      report.errors.push(msg);
      report.failed++;
    }
  }

  logger.info('Migration complete', {
    scanned: report.scanned,
    migrated: report.migrated,
    failed: report.failed,
  });

  return report;
}
