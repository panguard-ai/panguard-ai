/**
 * llm-detect.ts — Opt-in detection of an LLM provider for the semantic (L2) layer.
 *
 * The semantic layer is OPT-IN. It activates only when the user has explicitly
 * provided an LLM, via any of:
 *   - a configured provider (`pga config llm`, stored encrypted)
 *   - PANGUARD_LLM_ENDPOINT — any OpenAI-compatible endpoint. One knob for the
 *     whole local-AI ecosystem: NVIDIA NIM, vLLM, LM Studio, llama.cpp, DGX
 *     Spark, LocalAI, Groq, Together, OpenRouter, Azure OpenAI, …
 *   - NVIDIA_API_KEY — hosted NVIDIA NIM (OpenAI-compatible)
 *   - ANTHROPIC_API_KEY / OPENAI_API_KEY — cloud
 *   - PANGUARD_SEMANTIC=1 — probe common local runtimes (Ollama, LM Studio,
 *     vLLM / NIM, llama.cpp) and use the first one reachable
 *
 * With none of these the engine stays L1 regex-only: deterministic, zero-config,
 * no LLM latency, nothing auto-started. Detection always fails open — any error
 * or unreachable provider → null (regex only).
 *
 * @module @panguard-ai/panguard-guard/llm-detect
 */

import { join } from 'node:path';
import { createLogger } from '@panguard-ai/core';
import type { SecurityEvent } from '@panguard-ai/core';
import type { AnalyzeLLM, LLMAnalysisResult, LLMClassificationResult } from './types.js';

const logger = createLogger('panguard-guard:llm-detect');

type LLMProviderType = 'ollama' | 'claude' | 'openai';

interface ResolvedLLM {
  provider: LLMProviderType;
  model: string;
  apiKey?: string;
  endpoint?: string;
  /** Human-readable source, for logs only. */
  label: string;
}

const DEFAULT_MODELS: Record<LLMProviderType, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  ollama: 'llama3',
};

/**
 * Common local OpenAI-compatible / Ollama runtimes, probed (in order) only when
 * the user opts into local inference with PANGUARD_SEMANTIC=1. For the
 * OpenAI-compatible ones the real model name is discovered from `/v1/models`.
 */
const LOCAL_RUNTIMES: readonly ResolvedLLM[] = [
  { provider: 'ollama', endpoint: 'http://localhost:11434', model: 'llama3', label: 'Ollama' },
  {
    provider: 'openai',
    endpoint: 'http://localhost:1234/v1',
    apiKey: 'local',
    model: 'local-model',
    label: 'LM Studio',
  },
  {
    provider: 'openai',
    endpoint: 'http://localhost:8000/v1',
    apiKey: 'local',
    model: 'local-model',
    label: 'vLLM / NVIDIA NIM',
  },
  {
    provider: 'openai',
    endpoint: 'http://localhost:8080/v1',
    apiKey: 'local',
    model: 'local-model',
    label: 'llama.cpp',
  },
];

const PROBE_TIMEOUT_MS = 3_000;

function truthy(v: string | undefined): boolean {
  return v != null && v !== '' && v !== '0' && v.toLowerCase() !== 'false';
}

/**
 * Derive the machine-bound AES-256 key used to encrypt/decrypt the local LLM
 * config. Shared by the reader and the writer so the two can never drift (a
 * mismatch would make every persisted key undecryptable). This is obfuscation
 * at rest for a local secret — not a substitute for the 0600 file perms — in a
 * threat model where the local user is already trusted.
 */
async function deriveMachineKey(): Promise<Buffer> {
  const { hostname, userInfo } = await import('node:os');
  const { createHash } = await import('node:crypto');
  const machineId = `${hostname()}-${userInfo().username}-panguard-ai`;
  return createHash('sha256').update(machineId).digest();
}

/** Absolute path of the encrypted local LLM config. */
export async function getEncryptedLlmConfigPath(): Promise<string> {
  const { homedir } = await import('node:os');
  return join(homedir(), '.panguard', 'llm.enc');
}

export interface EncryptedLlmConfigInput {
  provider: 'ollama' | 'claude' | 'openai';
  model?: string;
  endpoint?: string;
  /** Omitted/undefined for keyless providers (Ollama). */
  apiKey?: string;
}

/**
 * Persist the opt-in LLM config encrypted at rest (~/.panguard/llm.enc,
 * AES-256-GCM, machine-bound key, 0600). The Guard daemon reads this on startup
 * via readEncryptedConfig — so a cloud key set here actually reaches the
 * launchd / systemd-spawned daemon, which does NOT inherit a shell environment
 * variable. Returns the file path written.
 */
export async function writeEncryptedLlmConfig(cfg: EncryptedLlmConfigInput): Promise<string> {
  const { homedir } = await import('node:os');
  const { existsSync, mkdirSync, writeFileSync, chmodSync } = await import('node:fs');
  const { createCipheriv, randomBytes } = await import('node:crypto');

  const dir = join(homedir(), '.panguard');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });

  const key = await deriveMachineKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify({
    provider: cfg.provider,
    apiKey: cfg.apiKey,
    model: cfg.model,
    endpoint: cfg.endpoint,
  });
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const serialized = [
    iv.toString('base64'),
    authTag.toString('base64'),
    data.toString('base64'),
  ].join(':');

  const llmPath = join(dir, 'llm.enc');
  writeFileSync(llmPath, serialized, { encoding: 'utf-8', mode: 0o600 });
  try {
    chmodSync(llmPath, 0o600);
  } catch {
    /* best effort — platforms without POSIX permissions */
  }
  return llmPath;
}

/** Remove the encrypted local LLM config, if present. Returns true if removed. */
export async function clearEncryptedLlmConfig(): Promise<boolean> {
  const { homedir } = await import('node:os');
  const { existsSync, rmSync } = await import('node:fs');
  const llmPath = join(homedir(), '.panguard', 'llm.enc');
  if (!existsSync(llmPath)) return false;
  rmSync(llmPath);
  return true;
}

/** Read the encrypted LLM config (written by `pga ai` / setup-ai), if present. */
async function readEncryptedConfig(): Promise<ResolvedLLM | null> {
  try {
    const { homedir } = await import('node:os');
    const { existsSync, readFileSync } = await import('node:fs');
    const { createDecipheriv } = await import('node:crypto');

    const llmPath = join(homedir(), '.panguard', 'llm.enc');
    if (!existsSync(llmPath)) return null;

    const parts = readFileSync(llmPath, 'utf-8').split(':');
    if (parts.length !== 3) return null;

    const key = await deriveMachineKey();
    const iv = Buffer.from(parts[0]!, 'base64');
    const authTag = Buffer.from(parts[1]!, 'base64');
    const data = Buffer.from(parts[2]!, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    const cfg = JSON.parse(decrypted) as {
      provider?: string;
      apiKey?: string;
      model?: string;
      endpoint?: string;
    };
    if (cfg.provider && (cfg.apiKey || cfg.provider === 'ollama')) {
      const provider = cfg.provider as LLMProviderType;
      return {
        provider,
        apiKey: cfg.apiKey,
        endpoint: cfg.endpoint,
        model: cfg.model ?? DEFAULT_MODELS[provider] ?? 'llama3',
        label: 'local config',
      };
    }
  } catch {
    // Unreadable / undecryptable — fall through to env-based resolution.
  }
  return null;
}

/** Ask an OpenAI-compatible server for its first model id (also a reachability probe). */
async function discoverOpenAIModel(endpoint: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(`${endpoint.replace(/\/+$/, '')}/models`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Array<{ id?: string }> };
    return body.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/** Probe common local runtimes; return the first reachable one, else null. */
async function probeLocalRuntimes(modelOverride?: string): Promise<ResolvedLLM | null> {
  const { createLLM } = await import('@panguard-ai/core');
  for (const rt of LOCAL_RUNTIMES) {
    try {
      let model = modelOverride ?? rt.model;
      // OpenAI-compatible local servers serve arbitrary model names — discover
      // the real one (and confirm reachability) before constructing the client.
      if (rt.provider === 'openai' && !modelOverride) {
        const discovered = await discoverOpenAIModel(rt.endpoint!);
        if (!discovered) continue;
        model = discovered;
      }
      const candidate = createLLM({
        provider: rt.provider,
        model,
        apiKey: rt.apiKey,
        endpoint: rt.endpoint,
        lang: 'en',
        timeout: PROBE_TIMEOUT_MS,
      });
      if (await candidate.isAvailable()) {
        logger.info(`Semantic layer: detected local runtime '${rt.label}' at ${rt.endpoint}`);
        return { ...rt, model };
      }
    } catch {
      // Try the next runtime.
    }
  }
  logger.info('PANGUARD_SEMANTIC set but no local LLM runtime reachable — running without AI');
  return null;
}

/**
 * Resolve which LLM (if any) the user has opted into. Returns null when the
 * semantic layer is not enabled — the engine then stays L1 regex-only.
 */
async function resolveOptedInLLM(): Promise<ResolvedLLM | null> {
  // 1. Explicit local config (`pga config llm`) — strongest signal.
  const fromConfig = await readEncryptedConfig();
  if (fromConfig) return fromConfig;

  const model = process.env['PANGUARD_LLM_MODEL'];

  // 2. Custom OpenAI-compatible endpoint — one knob for the whole local-AI
  //    ecosystem (NVIDIA NIM, vLLM, LM Studio, llama.cpp, DGX Spark, …).
  const customEndpoint = process.env['PANGUARD_LLM_ENDPOINT'];
  if (customEndpoint) {
    return {
      provider: 'openai',
      endpoint: customEndpoint,
      apiKey:
        process.env['PANGUARD_LLM_KEY'] ??
        process.env['OPENAI_API_KEY'] ??
        process.env['NVIDIA_API_KEY'] ??
        'local',
      model: model ?? 'local-model',
      label: `custom endpoint (${customEndpoint})`,
    };
  }

  // 3. NVIDIA hosted NIM (OpenAI-compatible).
  if (process.env['NVIDIA_API_KEY']) {
    return {
      provider: 'openai',
      endpoint: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env['NVIDIA_API_KEY'],
      model: model ?? 'nvidia/llama-3.1-nemotron-70b-instruct',
      label: 'NVIDIA NIM (hosted)',
    };
  }

  // 4. Cloud keys.
  if (process.env['ANTHROPIC_API_KEY']) {
    return {
      provider: 'claude',
      apiKey: process.env['ANTHROPIC_API_KEY'],
      model: model ?? DEFAULT_MODELS.claude,
      label: 'Anthropic',
    };
  }
  if (process.env['OPENAI_API_KEY']) {
    return {
      provider: 'openai',
      apiKey: process.env['OPENAI_API_KEY'],
      model: model ?? DEFAULT_MODELS.openai,
      label: 'OpenAI',
    };
  }

  // 5. Explicit opt-in to local inference: probe common local runtimes.
  if (truthy(process.env['PANGUARD_SEMANTIC'])) {
    return probeLocalRuntimes(model);
  }

  // Not opted in → no semantic layer.
  return null;
}

/**
 * Attempt to detect and create the opt-in LLM provider for the semantic layer.
 * Returns null (graceful degradation to L1 regex) when not opted in or the
 * provider is unreachable. Always fails open.
 */
export async function autoDetectLLM(): Promise<AnalyzeLLM | null> {
  try {
    const resolved = await resolveOptedInLLM();
    if (!resolved) {
      logger.info('Semantic layer not enabled (no LLM opted in) — running L1 regex only');
      return null;
    }

    const { createLLM } = await import('@panguard-ai/core');
    const llmProvider = createLLM({
      provider: resolved.provider,
      model: resolved.model,
      apiKey: resolved.apiKey,
      endpoint: resolved.endpoint,
      lang: 'en',
    });

    if (!(await llmProvider.isAvailable())) {
      logger.info(`Semantic layer: '${resolved.label}' not reachable — running without AI`);
      return null;
    }

    logger.info(`Semantic layer: '${resolved.label}' (model: ${resolved.model}) connected`);

    const adapter: AnalyzeLLM = {
      async analyze(prompt: string, context?: string): Promise<LLMAnalysisResult> {
        const result = await llmProvider.analyze(prompt, context);
        return {
          summary: result.summary,
          severity: result.severity,
          confidence: result.confidence,
          recommendations: result.recommendations,
        };
      },
      async classify(event: SecurityEvent): Promise<LLMClassificationResult> {
        const result = await llmProvider.classify(event);
        return {
          technique: result.technique,
          severity: result.severity,
          confidence: result.confidence,
          description: result.description,
        };
      },
      async isAvailable(): Promise<boolean> {
        return llmProvider.isAvailable();
      },
    };

    return adapter;
  } catch (err) {
    logger.info(
      `LLM auto-detect failed, running without AI: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}
