/**
 * HTTP response helpers using the PanGuard JSON envelope
 * 使用 PanGuard JSON 信封的 HTTP 回應輔助函數
 *
 * @module @panguard-ai/panguard-manager/api/respond
 */

import type { ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import type { ApiResponse } from '../types.js';

/** Generate a short opaque request id / 產生短的不透明 request id */
export function newRequestId(): string {
  return `req_${randomBytes(8).toString('hex')}`;
}

/** Write a successful JSON envelope / 寫出成功的 JSON 信封 */
export function ok<T>(res: ServerResponse, data: T, request_id: string, statusCode = 200): void {
  const body: ApiResponse<T> = { ok: true, data, request_id };
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Write an error JSON envelope / 寫出錯誤的 JSON 信封 */
export function fail(
  res: ServerResponse,
  statusCode: number,
  error: string,
  request_id: string
): void {
  const body: ApiResponse<never> = { ok: false, error, request_id };
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Read a JSON request body with a size cap / 讀取有大小上限的 JSON 請求主體 */
export function readJsonBody<T>(
  req: import('node:http').IncomingMessage,
  maxBytes = 64 * 1024
): Promise<T> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        reject(new Error('empty body'));
        return;
      }
      try {
        const text = Buffer.concat(chunks).toString('utf-8');
        resolve(JSON.parse(text) as T);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        reject(new Error(`invalid JSON: ${msg}`));
      }
    });
    req.on('error', reject);
  });
}
