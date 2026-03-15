/**
 * llm-detect.ts - Auto-detection of LLM providers for GuardEngine
 *
 * Priority: local encrypted config > environment variables > Ollama fallback.
 * Falls back to null if no provider is available (graceful degradation).
 *
 * @module @panguard-ai/panguard-guard/llm-detect
 */

import { join } from 'node:path';
import { createLogger } from '@panguard-ai/core';
import type { SecurityEvent } from '@panguard-ai/core';
import type { AnalyzeLLM, LLMAnalysisResult, LLMClassificationResult } from './types.js';

const logger = createLogger('panguard-guard:llm-detect');

/**
 * Attempt to auto-detect and create an LLM provider.
 * Priority: local encrypted config > environment variables > Ollama fallback.
 * Falls back to null if no provider is available (graceful degradation).
 */
export async function autoDetectLLM(): Promise<AnalyzeLLM | null> {
  try {
    const { createLLM } = await import('@panguard-ai/core');
    type LLMProviderType = 'ollama' | 'claude' | 'openai';

    let provider: LLMProviderType | null = null;
    let apiKey: string | undefined;
    let model: string | undefined;

    // 1. Check local encrypted LLM config (~/.panguard/llm.enc)
    try {
      const { homedir } = await import('node:os');
      const { existsSync, readFileSync } = await import('node:fs');
      const { createHash, createDecipheriv } = await import('node:crypto');
      const { hostname, userInfo } = await import('node:os');

      const llmPath = join(homedir(), '.panguard', 'llm.enc');
      if (existsSync(llmPath)) {
        const encrypted = readFileSync(llmPath, 'utf-8');
        const parts = encrypted.split(':');
        if (parts.length === 3) {
          const machineId = `${hostname()}-${userInfo().username}-panguard-ai`;
          const key = createHash('sha256').update(machineId).digest();
          const iv = Buffer.from(parts[0]!, 'base64');
          const authTag = Buffer.from(parts[1]!, 'base64');
          const data = Buffer.from(parts[2]!, 'base64');
          const decipher = createDecipheriv('aes-256-gcm', key, iv);
          decipher.setAuthTag(authTag);
          const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString(
            'utf8'
          );
          const llmConfig = JSON.parse(decrypted) as {
            provider?: string;
            apiKey?: string;
            model?: string;
          };
          if (llmConfig.provider && (llmConfig.apiKey || llmConfig.provider === 'ollama')) {
            provider = llmConfig.provider as LLMProviderType;
            apiKey = llmConfig.apiKey;
            model = llmConfig.model;
            logger.info(`LLM config loaded from local encrypted store (provider: ${provider})`);
          }
        }
      }
    } catch {
      // Local config not available, fall through to env vars
    }

    // 2. Fall back to environment variables
    if (!provider) {
      if (process.env['ANTHROPIC_API_KEY']) {
        provider = 'claude';
        apiKey = process.env['ANTHROPIC_API_KEY'];
        model = process.env['PANGUARD_LLM_MODEL'] ?? 'claude-sonnet-4-20250514';
      } else if (process.env['OPENAI_API_KEY']) {
        provider = 'openai';
        apiKey = process.env['OPENAI_API_KEY'];
        model = process.env['PANGUARD_LLM_MODEL'] ?? 'gpt-4o';
      } else {
        provider = 'ollama';
        model = process.env['PANGUARD_LLM_MODEL'] ?? 'llama3';
      }
    }

    // Allow env var model override even when using local config
    if (process.env['PANGUARD_LLM_MODEL']) {
      model = process.env['PANGUARD_LLM_MODEL'];
    }

    const defaultModels: Record<string, string> = {
      claude: 'claude-sonnet-4-20250514',
      openai: 'gpt-4o',
      ollama: 'llama3',
    };
    const resolvedModel = model ?? defaultModels[provider] ?? 'llama3';

    const llmProvider = createLLM({ provider, model: resolvedModel, apiKey, lang: 'en' });
    const available = await llmProvider.isAvailable();
    if (!available) {
      logger.info(`LLM provider '${provider}' not available, running without AI`);
      return null;
    }

    logger.info(`LLM provider '${provider}' (model: ${model}) connected`);

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
