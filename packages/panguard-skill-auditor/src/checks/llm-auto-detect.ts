/**
 * LLM auto-detection for Skill Auditor
 * LLM 自動偵測（技能審計器）
 *
 * Attempts to find an available LLM provider in this order:
 *   1. Ollama (local, no API key needed)
 *   2. Claude API (ANTHROPIC_API_KEY env var)
 *   3. OpenAI API (OPENAI_API_KEY env var)
 *
 * Returns a SkillAnalysisLLM adapter or null if nothing is available.
 */

import type { SkillAnalysisLLM } from './ai-check.js';

/** Cache Ollama availability to avoid repeated HTTP calls that spam error logs */
let _ollamaCached: SkillAnalysisLLM | null | undefined;

/**
 * Ask the local Ollama daemon which models are actually PULLED, and return the
 * first one. The auditor previously hard-coded 'llama3' as the Ollama model and
 * only checked that the Ollama *server* was up (not that the model existed), so
 * any user who pulled a different model (qwen2.5, mistral, phi, …) got a silent
 * 404 "model not found" at analyze time and the AI layer degraded to ATR-only.
 * Returns null if Ollama is unreachable or has no models pulled.
 */
async function firstInstalledOllamaModel(): Promise<string | null> {
  const host = (process.env['OLLAMA_HOST'] ?? 'http://127.0.0.1:11434').replace(/\/+$/, '');
  try {
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    return data.models?.find((m) => typeof m.name === 'string' && m.name.length > 0)?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Attempt to auto-detect and create a SkillAnalysisLLM from available providers.
 *
 * Priority: ANTHROPIC_API_KEY > OPENAI_API_KEY > Ollama (local fallback).
 * Returns null if no provider can be reached.
 */
export async function autoDetectSkillLLM(): Promise<SkillAnalysisLLM | null> {
  try {
    const { createLLM } = await import('@panguard-ai/core');

    type ProviderType = 'ollama' | 'claude' | 'openai';

    let provider: ProviderType;
    let apiKey: string | undefined;

    const defaultCloudModels: Record<'claude' | 'openai', string> = {
      claude: 'claude-sonnet-4-20250514',
      openai: 'gpt-4o',
    };

    // Check environment variables first (cloud providers), then fall back to Ollama
    if (process.env['ANTHROPIC_API_KEY']) {
      provider = 'claude';
      apiKey = process.env['ANTHROPIC_API_KEY'];
    } else if (process.env['OPENAI_API_KEY']) {
      provider = 'openai';
      apiKey = process.env['OPENAI_API_KEY'];
    } else {
      provider = 'ollama';
      // Return cached result for Ollama to avoid repeated failed HTTP calls
      if (_ollamaCached !== undefined) return _ollamaCached;
    }

    // Resolve the model. An explicit PANGUARD_LLM_MODEL always wins. For Ollama,
    // detect a model that is actually PULLED instead of assuming 'llama3' — if
    // none is installed (or Ollama is unreachable), the AI layer is unavailable
    // and we degrade to ATR-only rather than 404 on every analyze() call.
    let model = process.env['PANGUARD_LLM_MODEL'];
    if (!model) {
      if (provider === 'ollama') {
        const detected = await firstInstalledOllamaModel();
        if (!detected) {
          _ollamaCached = null;
          return null;
        }
        model = detected;
      } else {
        model = defaultCloudModels[provider];
      }
    }

    const llmProvider = createLLM({ provider, model, apiKey, lang: 'en' });

    const available = await llmProvider.isAvailable();
    if (!available) {
      if (provider === 'ollama') _ollamaCached = null;
      return null;
    }

    // Adapt core LLMProvider to the SkillAnalysisLLM interface
    const adapter: SkillAnalysisLLM = {
      async analyze(prompt: string, context?: string) {
        const result = await llmProvider.analyze(prompt, context);
        return {
          summary: result.summary,
          severity: result.severity,
          confidence: result.confidence,
          recommendations: result.recommendations,
        };
      },
      async isAvailable() {
        return llmProvider.isAvailable();
      },
    };

    if (provider === 'ollama') _ollamaCached = adapter;
    return adapter;
  } catch {
    // Auto-detect failure should not break auditing
    return null;
  }
}
