/**
 * Auto-provision a client API key from Threat Cloud.
 * On first `pga up`, registers with TC and caches the key at ~/.panguard/tc-client-key.
 *
 * @module @panguard-ai/panguard-guard/threat-cloud/tc-key-provisioner
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import https from 'node:https';
import http from 'node:http';
import { checkOutboundUrl } from '../net/validate-outbound-url.js';

const KEY_PATH = join(homedir(), '.panguard', 'tc-client-key');

export function getTCKeyPath(): string {
  return KEY_PATH;
}

/**
 * Load cached TC client key from disk, or register a new one from Threat Cloud.
 * Returns undefined if provisioning fails (network error, rate limited, etc.).
 */
export async function loadOrProvisionTCKey(
  endpoint: string,
  clientId: string
): Promise<string | undefined> {
  // SSRF guard: never provision (or persist) a key from a plain-HTTP, private,
  // or cloud-metadata endpoint. Same policy as ThreatCloudClient.selectTransport:
  // https required, http allowed only for loopback. Validate BEFORE any I/O.
  const endpointError = checkOutboundUrl(`${endpoint}/api/clients/register`, {
    allowLoopback: true,
  });
  if (endpointError !== null) {
    // Unsafe endpoint — refuse provisioning entirely (no cache read, no register).
    return undefined;
  }

  // Try cached key first
  try {
    if (existsSync(KEY_PATH)) {
      const key = readFileSync(KEY_PATH, 'utf-8').trim();
      if (key.length > 0) return key;
    }
  } catch {
    // Fall through to register
  }

  // Register with TC
  try {
    const key = await registerWithTC(endpoint, clientId);
    if (key) {
      mkdirSync(join(homedir(), '.panguard'), { recursive: true });
      writeFileSync(KEY_PATH, key, { encoding: 'utf-8', mode: 0o600 });
      chmodSync(KEY_PATH, 0o600);
      return key;
    }
  } catch {
    // Silent failure — Guard continues without TC write access
  }

  return undefined;
}

function registerWithTC(endpoint: string, clientId: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ clientId });
    const registerUrl = `${endpoint}/api/clients/register`;
    // Defense in depth: re-validate here so this never issues a request to a
    // plain-HTTP / private / metadata endpoint even if called directly.
    if (checkOutboundUrl(registerUrl, { allowLoopback: true }) !== null) {
      resolve(undefined);
      return;
    }
    const parsed = new URL(registerUrl);
    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload).toString(),
        },
        timeout: 10000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.ok && data.data?.clientKey) {
              resolve(data.data.clientKey);
            } else {
              resolve(undefined);
            }
          } catch {
            resolve(undefined);
          }
        });
      }
    );

    req.on('error', () => resolve(undefined));
    req.on('timeout', () => {
      req.destroy();
      resolve(undefined);
    });
    req.write(payload);
    req.end();
  });
}
