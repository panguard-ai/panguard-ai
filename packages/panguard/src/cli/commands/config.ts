/**
 * panguard config - Manage local configuration
 *
 * Subcommands:
 *   pga config llm --provider claude
 *   pga config llm --provider ollama --endpoint http://localhost:11434
 *   pga config llm --show
 *   pga config llm --clear
 *
 * Security: there is no --api-key flag. A secret passed on the command line is
 * exposed to `ps`, shell history, and process listings. Cloud keys are read
 * only from the ANTHROPIC_API_KEY / OPENAI_API_KEY environment variables (see
 * panguard-guard llm-detect.ts); this build never persists a cloud key to disk.
 */

import { Command } from 'commander';
import { c, banner } from '@panguard-ai/core';
import { PANGUARD_VERSION } from '../../index.js';
import { saveLlmConfig, loadLlmConfig, deleteLlmConfig } from '../credentials.js';
import { loadGuardConfig, updateGuardConfig } from '../guard-config.js';
import { saveLang } from '../interactive/lang.js';

/**
 * Print how to provide a cloud key without persisting it: via the environment
 * variable the semantic layer actually reads, or via local Ollama (no key).
 */
function printCloudKeyGuidance(): void {
  console.log('');
  console.log(`  ${c.dim('Set the key in your environment (never stored on disk):')}`);
  console.log(`    ${c.sage('export ANTHROPIC_API_KEY=sk-ant-...')}   ${c.dim('# Anthropic')}`);
  console.log(`    ${c.sage('export OPENAI_API_KEY=sk-...')}          ${c.dim('# OpenAI')}`);
  console.log(`  ${c.dim('Or use local Ollama (no key):')} pga config llm --provider ollama`);
}

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
        `  Threat Cloud:  ${guardConfig.threatCloudUploadEnabled === true ? c.safe('enabled') : c.dim('disabled')}`
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
    .description(
      'Configure the optional advisory semantic layer (bring your own LLM, off by default)'
    )
    .option('--provider <provider>', 'LLM provider: claude, openai, ollama')
    .option('--model <model>', 'Model override (e.g., claude-haiku-4-5-20251001, gpt-4o)')
    .option('--endpoint <url>', 'Endpoint URL (for ollama, default: http://localhost:11434)')
    .option('--show', 'Show current LLM configuration')
    .option('--clear', 'Remove stored LLM configuration')
    .action(
      (options: {
        provider?: string;
        model?: string;
        endpoint?: string;
        show?: boolean;
        clear?: boolean;
      }) => {
        console.log(banner(PANGUARD_VERSION));
        console.log(
          `  ${c.dim('Note: detection is deterministic by default (ATR rules + heuristics). The OPTIONAL advisory semantic layer can flag findings for review but never auto-blocks. To CONNECT a cloud key use "pga guard ai" (stores it encrypted, 0600); this command sets provider/model + local Ollama options only.')}`
        );
        console.log('');

        if (options.show) {
          const config = loadLlmConfig();
          if (!config) {
            console.log(`  ${c.dim('No LLM configuration found.')}`);
            printCloudKeyGuidance();
            return;
          }
          console.log(`  ${c.sage('LLM Configuration')}`);
          console.log(`  Provider:  ${c.bold(config.provider)}`);
          console.log(`  Model:     ${config.model ? c.bold(config.model) : c.dim('default')}`);
          console.log(
            `  Endpoint:  ${config.endpoint ? c.bold(config.endpoint) : c.dim('default')}`
          );
          console.log(`  Saved:     ${c.dim(config.savedAt)}`);
          console.log('');
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
          console.log(`    ${c.dim('$')} pga config llm --provider claude`);
          console.log(`    ${c.dim('$')} pga config llm --provider openai`);
          console.log(`    ${c.dim('$')} pga config llm --provider ollama`);
          console.log(`    ${c.dim('$')} pga config llm --provider ollama --endpoint http://gpu:11434`);
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

        // Cloud providers: the canonical connect path is `pga guard ai`, which
        // stores the key encrypted (AES-256-GCM, 0600) so the launchd/systemd
        // daemon can read it. This command does not collect a secret; point the
        // user at the real command, with the env-var route as the alternative.
        if (options.provider !== 'ollama') {
          console.log(
            `  ${c.dim(`To connect a '${options.provider}' key, run "pga guard ai" (stores it encrypted, 0600). Or set it as an environment variable yourself:`)}`
          );
          printCloudKeyGuidance();
          return;
        }

        // Ollama: no secret involved. This community build does not persist the
        // selection (the engine resolves the semantic layer from the
        // environment / local-runtime probe at startup — see llm-detect.ts), so
        // be honest rather than claim an encrypted save that never happens.
        saveLlmConfig({
          provider: options.provider,
          model: options.model,
          endpoint: options.endpoint,
          savedAt: new Date().toISOString(),
        });

        console.log(`  ${c.sage('Local AI (Ollama) selected.')}`);
        console.log(`  Provider:  ${c.bold(options.provider)}`);
        if (options.model) {
          console.log(`  Model:     ${c.bold(options.model)}`);
        }
        if (options.endpoint) {
          console.log(`  Endpoint:  ${c.bold(options.endpoint)}`);
        }
        console.log('');
        console.log(
          `  ${c.dim('Start the semantic layer against a local runtime with:')} PANGUARD_SEMANTIC=1`
        );
        console.log(
          `  ${c.dim('or point at any OpenAI-compatible endpoint with:')} PANGUARD_LLM_ENDPOINT=...`
        );
      }
    );

  return cmd;
}
