/**
 * panguard config - Manage local configuration
 *
 * Subcommands:
 *   pga config llm --provider claude --api-key sk-xxx
 *   pga config llm --provider ollama --endpoint http://localhost:11434
 *   pga config llm --show
 *   pga config llm --clear
 */

import { Command } from 'commander';
import { c, banner } from '@panguard-ai/core';
import { PANGUARD_VERSION } from '../../index.js';
import { saveLlmConfig, loadLlmConfig, deleteLlmConfig } from '../credentials.js';
import { loadGuardConfig, updateGuardConfig } from '../guard-config.js';
import { saveLang } from '../interactive/lang.js';

export function configCommand(): Command {
  const cmd = new Command('config').description('Manage local configuration');

  cmd
    .command('set')
    .description('Set a guard config value')
    .argument('<key>', 'Config key: telemetry, threat-cloud, lang')
    .argument('<value>', 'Config value (true/false, or en/zh-TW for lang)')
    .action((key: string, value: string) => {
      const validKeys = ['telemetry', 'threat-cloud', 'lang'];
      if (!validKeys.includes(key)) {
        console.log(
          `  ${c.caution(`Invalid key: ${key}. Must be one of: ${validKeys.join(', ')}`)}`
        );
        process.exit(1);
      }
      const config = loadGuardConfig();
      if (key === 'lang') {
        const validLangs = ['en', 'zh-TW'];
        if (!validLangs.includes(value)) {
          console.log(
            `  ${c.caution(`Invalid language: ${value}. Must be one of: ${validLangs.join(', ')}`)}`
          );
          process.exit(1);
        }
        saveLang(value as 'en' | 'zh-TW');
        console.log(`  ${c.safe('lang')} set to ${c.bold(value)}`);
        return;
      }
      const boolValue = value === 'true' || value === '1' || value === 'yes';
      if (key === 'telemetry') {
        updateGuardConfig({ ...config, telemetryEnabled: boolValue });
        console.log(`  ${c.safe('telemetryEnabled')} set to ${c.bold(String(boolValue))}`);
      } else if (key === 'threat-cloud') {
        updateGuardConfig({ ...config, threatCloudUploadEnabled: boolValue });
        console.log(`  ${c.safe('threatCloudUploadEnabled')} set to ${c.bold(String(boolValue))}`);
      }
    });

  cmd
    .command('show')
    .description('Show current configuration')
    .action(() => {
      console.log(banner(PANGUARD_VERSION));
      console.log(`  ${c.sage('Guard Configuration')}`);
      const guardConfig = loadGuardConfig();
      console.log(
        `  Telemetry:     ${guardConfig.telemetryEnabled === true ? c.safe('enabled') : c.dim('disabled')}`
      );
      console.log(
        `  Threat Cloud:  ${guardConfig.threatCloudUploadEnabled === false ? c.dim('disabled') : c.safe('enabled')}`
      );
      console.log(
        `  Mode:          ${guardConfig.mode ? c.bold(guardConfig.mode) : c.dim('default')}`
      );
      console.log(
        `  Dashboard:     ${guardConfig.dashboardEnabled === true ? c.safe('enabled') : c.dim('disabled')}`
      );
      if (guardConfig.dashboardPort) {
        console.log(`  Dashboard Port: ${c.bold(String(guardConfig.dashboardPort))}`);
      }
      console.log('');
      console.log(`  ${c.sage('LLM Configuration')}`);
      const llmConfig = loadLlmConfig();
      if (!llmConfig) {
        console.log(`  ${c.dim('No LLM configuration found.')}`);
      } else {
        console.log(`  Provider:  ${c.bold(llmConfig.provider)}`);
        console.log(`  Model:     ${llmConfig.model ? c.bold(llmConfig.model) : c.dim('default')}`);
        console.log(`  Saved:     ${c.dim(llmConfig.savedAt)}`);
      }
      console.log('');
    });

  cmd
    .command('llm')
    .description('Configure LLM provider for AI analysis')
    .option('--provider <provider>', 'LLM provider: claude, openai, ollama')
    .option('--api-key <key>', 'API key (for claude/openai)')
    .option('--model <model>', 'Model override (e.g., claude-haiku-4-5-20251001, gpt-4o)')
    .option('--endpoint <url>', 'Endpoint URL (for ollama, default: http://localhost:11434)')
    .option('--show', 'Show current LLM configuration')
    .option('--clear', 'Remove stored LLM configuration')
    .action(
      (options: {
        provider?: string;
        apiKey?: string;
        model?: string;
        endpoint?: string;
        show?: boolean;
        clear?: boolean;
      }) => {
        console.log(banner(PANGUARD_VERSION));

        if (options.show) {
          const config = loadLlmConfig();
          if (!config) {
            console.log(`  ${c.dim('No LLM configuration found.')}`);
            console.log(
              `  ${c.dim('Set one with:')} pga config llm --provider claude --api-key sk-...`
            );
            return;
          }
          console.log(`  ${c.sage('LLM Configuration')}`);
          console.log(`  Provider:  ${c.bold(config.provider)}`);
          console.log(
            `  API Key:   ${config.apiKey ? c.safe(config.apiKey.slice(0, 8) + '...' + config.apiKey.slice(-4)) : c.dim('none')}`
          );
          console.log(`  Model:     ${config.model ? c.bold(config.model) : c.dim('default')}`);
          console.log(
            `  Endpoint:  ${config.endpoint ? c.bold(config.endpoint) : c.dim('default')}`
          );
          console.log(`  Saved:     ${c.dim(config.savedAt)}`);
          console.log('');
          console.log(`  ${c.dim('Stored encrypted at ~/.panguard/llm.enc')}`);
          return;
        }

        if (options.clear) {
          const removed = deleteLlmConfig();
          if (removed) {
            console.log(`  ${c.safe('LLM configuration removed.')}`);
          } else {
            console.log(`  ${c.dim('No LLM configuration to remove.')}`);
          }
          return;
        }

        if (!options.provider) {
          console.log(`  ${c.caution('--provider is required.')}`);
          console.log('');
          console.log('  Examples:');
          console.log(`    ${c.dim('$')} pga config llm --provider claude --api-key sk-ant-xxx`);
          console.log(`    ${c.dim('$')} pga config llm --provider openai --api-key sk-xxx`);
          console.log(`    ${c.dim('$')} pga config llm --provider ollama`);
          console.log('');
          console.log('  OpenAI-compatible APIs (Gemini, Groq, Qwen, DeepSeek, etc.):');
          console.log(
            `    ${c.dim('$')} pga config llm --provider openai --endpoint https://api.groq.com/openai/v1 --api-key gsk-xxx`
          );
          console.log(
            `    ${c.dim('$')} pga config llm --provider openai --endpoint https://generativelanguage.googleapis.com/v1beta/openai/ --api-key AIza-xxx`
          );
          console.log(
            `    ${c.dim('$')} pga config llm --provider openai --endpoint https://dashscope.aliyuncs.com/compatible-mode/v1 --api-key sk-xxx  ${c.dim('# Qwen')}`
          );
          console.log('');
          console.log(`    ${c.dim('$')} pga config llm --show`);
          console.log(`    ${c.dim('$')} pga config llm --clear`);
          return;
        }

        const validProviders = ['claude', 'openai', 'ollama'];
        if (!validProviders.includes(options.provider)) {
          console.log(
            `  ${c.caution(`Invalid provider: ${options.provider}. Must be one of: ${validProviders.join(', ')}`)}`
          );
          return;
        }

        if (options.provider !== 'ollama' && !options.apiKey) {
          console.log(
            `  ${c.caution(`--api-key is required for provider '${options.provider}'.`)}`
          );
          return;
        }

        saveLlmConfig({
          provider: options.provider,
          apiKey: options.apiKey,
          model: options.model,
          endpoint: options.endpoint,
          savedAt: new Date().toISOString(),
        });

        console.log(`  ${c.safe('LLM configuration saved.')}`);
        console.log(`  Provider:  ${c.bold(options.provider)}`);
        if (options.apiKey) {
          console.log(
            `  API Key:   ${c.safe(options.apiKey.slice(0, 8) + '...' + options.apiKey.slice(-4))}`
          );
        }
        if (options.model) {
          console.log(`  Model:     ${c.bold(options.model)}`);
        }
        console.log('');
        console.log(`  ${c.dim('Encrypted and stored at ~/.panguard/llm.enc')}`);
        console.log(`  ${c.dim('The Guard engine will use this configuration automatically.')}`);
      }
    );

  return cmd;
}
