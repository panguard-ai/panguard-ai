/**
 * 1.8.2 audit remediation — group B (threatcloud + net).
 *
 * Regression tests that PIN the security + honesty invariants fixed in this group:
 *  - Finding 5:  ThreatCloudClient SSRF-validates its endpoint (private / reserved /
 *                link-local / cloud-metadata targets are refused, forcing offline —
 *                so the Guard daemon can never become an SSRF proxy nor leak the TC
 *                bearer key to an internal host). selectTransport is the choke point.
 *  - Finding 6:  the shared SSRF guard now blocks cloud-metadata HOSTNAMES
 *                (metadata.google.internal, metadata.goog, ...), not only literal IPs.
 *  - Finding 28: postThreats() is FAIL-CLOSED — it refuses to upload plaintext when
 *                E2E sealing is unavailable, so the CLI's "end-to-end encrypted" claim
 *                is always true whenever telemetry actually leaves the machine.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkOutboundUrl } from '../src/net/validate-outbound-url.js';
import type { AnonymizedThreatData } from '../src/types.js';

vi.mock('@panguard-ai/core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@panguard-ai/core');
  return {
    ...actual,
    createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  };
});

vi.mock('../src/threat-cloud/client-id.js', () => ({
  getAnonymousClientId: () => 'test-client-uuid-ssrf',
}));

// seal.js is mocked so the fail-closed suite can toggle sealingAvailable().
const { mockSealingAvailable, mockSealForIngest } = vi.hoisted(() => ({
  mockSealingAvailable: vi.fn(() => true),
  mockSealForIngest: vi.fn(async () => ({ v: 1, alg: 'ECDH-ES+A256GCM', kid: 'k', jwe: 'ct' })),
}));
vi.mock('../src/threat-cloud/seal.js', () => ({
  sealingAvailable: (...a: unknown[]) => mockSealingAvailable(...a),
  sealForIngest: (...a: unknown[]) => mockSealForIngest(...a),
}));

// Capture every outbound https/http request so we can assert whether ANY request
// was issued (the SSRF invariant: an unsafe endpoint issues zero requests).
const { mockHttpsRequest, mockHttpRequest } = vi.hoisted(() => {
  const make = () =>
    vi.fn((_opts: unknown, cb: (res: unknown) => void) => {
      const res = {
        statusCode: 200,
        on: vi.fn((event: string, handler: (data?: Buffer) => void) => {
          if (event === 'data') handler(Buffer.from('[]'));
          if (event === 'end') setTimeout(() => handler(), 0);
        }),
      };
      setTimeout(() => cb(res), 0);
      return { write: vi.fn(), end: vi.fn(), destroy: vi.fn(), on: vi.fn() };
    });
  return { mockHttpsRequest: make(), mockHttpRequest: make() };
});
vi.mock('node:https', () => ({ request: mockHttpsRequest }));
vi.mock('node:http', () => ({ request: mockHttpRequest }));

import { ThreatCloudClient } from '../src/threat-cloud/index.js';

function makeThreatData(overrides: Partial<AnonymizedThreatData> = {}): AnonymizedThreatData {
  return {
    attackSourceIP: '203.0.0.0',
    attackType: 'brute_force',
    mitreTechnique: 'T1110',
    sigmaRuleMatched: 'rule-1',
    timestamp: new Date().toISOString(),
    region: 'US',
    ...overrides,
  };
}

/** SSRF targets the endpoint must NEVER be allowed to point at. */
const SSRF_ENDPOINTS = [
  'https://169.254.169.254', // AWS/GCP/Azure IMDS
  'https://10.0.0.1', // RFC 1918
  'https://192.168.1.1', // RFC 1918
  'https://127.0.0.1:9000', // loopback (via http:// is fine, https:// to loopback is still private)
  'https://[::ffff:169.254.169.254]', // IPv4-mapped IPv6 metadata
  'https://[fd00:ec2::254]', // IPv6 ULA metadata
  'https://metadata.google.internal', // GCP metadata hostname
  'https://metadata.goog', // GCP short alias
];

describe('1.8.2-B: shared SSRF guard blocks cloud-metadata hostnames (finding 6)', () => {
  it('blocks metadata.google.internal / metadata.goog / metadata (not only literal IPs)', () => {
    expect(checkOutboundUrl('https://metadata.google.internal/computeMetadata/v1/')).not.toBeNull();
    expect(checkOutboundUrl('https://METADATA.GOOGLE.INTERNAL/x')).not.toBeNull(); // case-insensitive
    expect(checkOutboundUrl('https://metadata.goog/x')).not.toBeNull();
    expect(checkOutboundUrl('https://metadata/x')).not.toBeNull();
    expect(checkOutboundUrl('https://metadata.tencentyun.com/x')).not.toBeNull();
  });

  it('still blocks the literal metadata IP and still allows a normal public host', () => {
    expect(checkOutboundUrl('https://169.254.169.254/x')).not.toBeNull();
    expect(checkOutboundUrl('https://cloud.panguard.example.com/api')).toBeNull();
  });

  it('does not over-block a legitimate host that merely contains "metadata"', () => {
    expect(checkOutboundUrl('https://metadata-service.example.com/x')).toBeNull();
    expect(checkOutboundUrl('https://my-metadata.io/x')).toBeNull();
  });
});

describe('1.8.2-B: ThreatCloudClient SSRF-validates its endpoint (finding 5)', () => {
  let tempDir: string;
  let savedKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSealingAvailable.mockReturnValue(true);
    tempDir = mkdtempSync(join(tmpdir(), 'tc-ssrf-'));
    savedKey = process.env['TC_API_KEY'];
    process.env['TC_API_KEY'] = 'secret-bearer-key';
  });

  afterEach(() => {
    if (savedKey === undefined) delete process.env['TC_API_KEY'];
    else process.env['TC_API_KEY'] = savedKey;
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  for (const endpoint of SSRF_ENDPOINTS) {
    it(`forces offline mode for unsafe endpoint ${endpoint} (no network, no key leak)`, async () => {
      const client = new ThreatCloudClient(endpoint, tempDir, 'secret-bearer-key');
      expect(client.getStatus()).toBe('offline');

      // Even when asked to upload/fetch, an offline client issues ZERO requests —
      // so the TC bearer key can never reach the internal host.
      await client.upload(makeThreatData());
      await client.flushQueue();
      await client.fetchRules();
      await client.fetchBlocklist();
      client.stopFlushTimer();

      expect(mockHttpsRequest).not.toHaveBeenCalled();
      expect(mockHttpRequest).not.toHaveBeenCalled();
    });
  }

  it('accepts a safe https endpoint and reaches the network (positive control)', async () => {
    const client = new ThreatCloudClient('https://cloud.example.com', tempDir, 'k');
    expect(client.getStatus()).not.toBe('offline');
    await client.fetchRules();
    client.stopFlushTimer();
    expect(mockHttpsRequest).toHaveBeenCalledTimes(1);
  });

  it('create() also forces offline for an unsafe endpoint', async () => {
    const client = await ThreatCloudClient.create('https://169.254.169.254', tempDir, 'k', {
      allowProvision: false,
    });
    expect(client.getStatus()).toBe('offline');
    client.stopFlushTimer();
  });
});

describe('1.8.2-B: postThreats is fail-closed on sealing (finding 28)', () => {
  let tempDir: string;
  let savedKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = mkdtempSync(join(tmpdir(), 'tc-seal-'));
    savedKey = process.env['TC_API_KEY'];
    process.env['TC_API_KEY'] = 'k';
  });

  afterEach(() => {
    if (savedKey === undefined) delete process.env['TC_API_KEY'];
    else process.env['TC_API_KEY'] = savedKey;
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('does NOT send plaintext when sealing is unavailable — data is retained, not leaked', async () => {
    mockSealingAvailable.mockReturnValue(false);
    const client = new ThreatCloudClient('https://cloud.example.com', tempDir, 'k');

    // Trigger a flush of a single event.
    await client.upload(makeThreatData());
    const uploaded = await client.flushQueue();
    client.stopFlushTimer();

    // No request was ever issued (fail-closed), and nothing was counted as uploaded.
    expect(mockHttpsRequest).not.toHaveBeenCalled();
    expect(uploaded).toBe(0);
    // sealForIngest is never even reached when sealing is unavailable.
    expect(mockSealForIngest).not.toHaveBeenCalled();
  });

  it('sends a SEALED envelope (never the raw payload) when sealing is available', async () => {
    mockSealingAvailable.mockReturnValue(true);
    const client = new ThreatCloudClient('https://cloud.example.com', tempDir, 'k');

    await client.upload(makeThreatData());
    await client.flushQueue();
    client.stopFlushTimer();

    expect(mockSealForIngest).toHaveBeenCalled();
    expect(mockHttpsRequest).toHaveBeenCalledTimes(1);
    // The POST body must be the sealed envelope, not the anonymized cleartext.
    const writeFn = mockHttpsRequest.mock.results[0]?.value.write as ReturnType<typeof vi.fn>;
    const body = String(writeFn.mock.calls[0]?.[0] ?? '');
    expect(body).toContain('sealed');
    expect(body).not.toContain('attackSourceIP');
  });
});
