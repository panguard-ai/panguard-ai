/**
 * autoDetectSkillLLM Ollama model-detection tests.
 *
 * Regression guard: the auditor used to hard-code the Ollama model as 'llama3'
 * and only check that the Ollama *server* was up, so any user who pulled a
 * different model (qwen2.5, mistral, …) hit a silent 404 "model not found" at
 * analyze time and the AI layer degraded to ATR-only. It now queries the local
 * Ollama daemon for a PULLED model and uses that (or PANGUARD_LLM_MODEL).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createLLMMock = vi.fn();
vi.mock('@panguard-ai/core', () => ({
  createLLM: (...args: unknown[]) => createLLMMock(...args),
}));

const realFetch = globalThis.fetch;

describe('autoDetectSkillLLM — Ollama model auto-detection', () => {
  beforeEach(() => {
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['OPENAI_API_KEY'];
    delete process.env['PANGUARD_LLM_MODEL'];
    createLLMMock.mockReset();
    createLLMMock.mockReturnValue({
      isAvailable: async () => true,
      analyze: async () => ({ summary: '', severity: 'low', confidence: 0, recommendations: [] }),
    });
    vi.resetModules(); // reset the module-level Ollama cache between tests
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('uses the first PULLED Ollama model, never a hardcoded llama3', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'qwen2.5:0.5b' }, { name: 'mistral' }] }),
    }) as unknown as typeof fetch;
    const { autoDetectSkillLLM } = await import('../src/checks/llm-auto-detect.js');
    const llm = await autoDetectSkillLLM();
    expect(llm).not.toBeNull();
    expect(createLLMMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'ollama', model: 'qwen2.5:0.5b' })
    );
  });

  it('returns null when Ollama has no models pulled (degrade to ATR-only, no 404 spam)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    }) as unknown as typeof fetch;
    const { autoDetectSkillLLM } = await import('../src/checks/llm-auto-detect.js');
    expect(await autoDetectSkillLLM()).toBeNull();
    expect(createLLMMock).not.toHaveBeenCalled();
  });

  it('returns null when Ollama is unreachable', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    const { autoDetectSkillLLM } = await import('../src/checks/llm-auto-detect.js');
    expect(await autoDetectSkillLLM()).toBeNull();
  });

  it('honors PANGUARD_LLM_MODEL without querying /api/tags', async () => {
    process.env['PANGUARD_LLM_MODEL'] = 'mistral';
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { autoDetectSkillLLM } = await import('../src/checks/llm-auto-detect.js');
    await autoDetectSkillLLM();
    expect(createLLMMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'ollama', model: 'mistral' })
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
