/**
 * Input validation utilities using Zod
 * 使用 Zod 的輸入驗證工具
 *
 * @module @openclaw/core/utils/validation
 */

import { z } from 'zod';

/**
 * Validate input data against a Zod schema
 * 使用 Zod schema 驗證輸入資料
 *
 * @param schema - Zod validation schema / Zod 驗證 schema
 * @param data - Data to validate / 要驗證的資料
 * @returns Validated and typed data / 驗證後的型別化資料
 * @throws Error if validation fails / 驗證失敗時拋出錯誤
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Validation failed: ${messages}`);
  }
  return result.data;
}

/**
 * Sanitize a string by removing potentially dangerous characters
 * 清理字串，移除潛在危險字元
 *
 * @param input - Raw string input / 原始字串輸入
 * @returns Sanitized string / 清理後的字串
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * Validate and sanitize a file path to prevent directory traversal
 * 驗證並清理檔案路徑以防止目錄遍歷攻擊
 *
 * @param filePath - File path to validate / 要驗證的檔案路徑
 * @returns Sanitized file path / 清理後的檔案路徑
 * @throws Error if path contains traversal patterns / 路徑包含遍歷模式時拋出錯誤
 */
export function validateFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('..')) {
    throw new Error('Directory traversal detected in file path / 偵測到檔案路徑中的目錄遍歷');
  }
  if (normalized.includes('\0')) {
    throw new Error('Null byte detected in file path / 偵測到檔案路徑中的空位元組');
  }
  return normalized;
}
