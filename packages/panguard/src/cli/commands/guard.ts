/**
 * panguard guard - Guard engine management
 * panguard guard - 守護引擎管理
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { request as httpNodeRequest } from 'node:http';
import { execFileSync as nodeExecFileSync } from 'node:child_process';
import { Command } from 'commander';
import {
  runCLI,
  writeEncryptedLlmConfig,
  clearEncryptedLlmConfig,
  getEncryptedLlmConfigPath,
} from '@panguard-ai/panguard-guard';
import { c, box, header, symbols, divider } from '@panguard-ai/core';
import { ensurePersistentService } from './persist.js';
import { readSecret } from '../secret-input.js';

export function guardCommand(): Command {
  const cmd = new Command('guard')
    .description('Guard engine management')
    .option('--watch', 'Start guard engine in foreground (alias for guard start)', false)
    .option('--dashboard', 'Enable live TUI dashboard', false)
    .action(async (opts: { watch?: boolean; dashboard?: boolean }) => {
      if (opts.watch) {
        const args = ['start'];
        if (opts.dashboard) args.push('--dashboard');
        await runCLI(args);
      }
    });

  cmd
    .command('start')
    .description('Start the guard engine')
    .option('--data-dir <path>', 'Data directory')
    .option('--verbose', 'Verbose output (show all event logs)', false)
    .option('--dashboard', 'Enable live TUI dashboard', false)
    .option('--interactive', 'Prompt for medium-confidence threats', false)
    .option('--manager <url>', 'Manager URL for agent mode')
    .action(
      async (opts: {
        dataDir?: string;
        verbose: boolean;
        dashboard: boolean;
        interactive: boolean;
        manager?: string;
      }) => {
        const args = ['start'];
        if (opts.dataDir) args.push('--data-dir', opts.dataDir);
        if (opts.verbose) args.push('--verbose');
        if (opts.dashboard) args.push('--dashboard');
        if (opts.interactive) args.push('--interactive');
        if (opts.manager) args.push('--manager', opts.manager);
        await runCLI(args);
      }
    );

  cmd
    .command('stop')
    .description('Stop the guard engine')
    .option('--data-dir <path>', 'Data directory')
    .action(async (opts: { dataDir?: string }) => {
      const args = ['stop'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd
    .command('restart')
    .description('Restart the guard engine')
    .option('--data-dir <path>', 'Data directory')
    .option('--verbose', 'Verbose output', false)
    .action(async (opts: { dataDir?: string; verbose: boolean }) => {
      const stopArgs = ['stop'];
      if (opts.dataDir) stopArgs.push('--data-dir', opts.dataDir);
      await runCLI(stopArgs);

      const startArgs = ['start'];
      if (opts.dataDir) startArgs.push('--data-dir', opts.dataDir);
      if (opts.verbose) startArgs.push('--verbose');
      await runCLI(startArgs);
    });

  cmd
    .command('status')
    .description('Show engine status')
    .option('--data-dir <path>', 'Data directory')
    .option('--detailed', 'Show 3-layer health check', false)
    .action(async (opts: { dataDir?: string; detailed: boolean }) => {
      if (opts.detailed) {
        await showDetailedStatus(opts.dataDir);
        return;
      }
      const args = ['status'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd
    .command('config')
    .description('Show current configuration')
    .option('--data-dir <path>', 'Data directory')
    .action(async (opts: { dataDir?: string }) => {
      const args = ['config'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd
    .command('generate-key [tier]')
    .description('Generate a test license key')
    .action(async (tier?: string) => {
      const args = ['generate-key'];
      if (tier) args.push(tier);
      await runCLI(args);
    });

  cmd
    .command('install')
    .description('Install as a reboot-surviving service')
    .option('--data-dir <path>', 'Data directory')
    .action(async (opts: { dataDir?: string }) => {
      // macOS: install the user-level LaunchAgent via the proven command
      // (`pga guard --watch`) — the same path `pga up` uses, one source of truth.
      // The legacy panguard-guard installer builds a `<bin> start` plist, which is
      // wrong from the pga binary (pga has no top-level `start` command) and would
      // silently fail to protect after reboot.
      if (platform() === 'darwin') {
        const r = ensurePersistentService();
        if (r === 'installed') {
          console.log(
            `  ${symbols.pass} ${c.safe('Always-on service installed')} — protection restarts after reboot.`
          );
        } else if (r === 'already') {
          console.log(`  ${symbols.info} ${c.dim('Always-on service already installed.')}`);
        } else {
          console.log(`  ${symbols.fail} ${c.caution('Could not install the service.')}`);
        }
        return;
      }
      // Linux/Windows: system-service path (may require sudo/admin).
      const args = ['install'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd
    .command('uninstall')
    .description('Remove system service')
    .action(async () => {
      await runCLI(['uninstall']);
    });

  cmd
    .command('setup-ai')
    .alias('ai')
    .description(
      'Connect the optional semantic layer (Layer C): local Ollama (free) or a cloud key'
    )
    .option('--remove', 'Remove the stored LLM config and turn Layer C off')
    .action(async (opts: { remove?: boolean }) => {
      if (opts.remove) {
        await commandRemoveAi();
        return;
      }
      await commandSetupAi();
    });

  return cmd;
}

// ---------------------------------------------------------------------------
// setup-ai — Interactive AI layer configuration
// setup-ai — 互動式 AI 層設定
// ---------------------------------------------------------------------------

/** Check if Ollama is installed and reachable */
function isOllamaInstalled(): boolean {
  try {
    nodeExecFileSync('ollama', ['--version'], { encoding: 'utf-8', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/** Read a single line from stdin */
function readLine(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.setEncoding('utf-8');
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY && wasRaw) {
      stdin.setRawMode(false);
    }
    stdin.resume();
    stdin.once('data', (data: string) => {
      stdin.pause();
      if (stdin.isTTY && wasRaw) {
        stdin.setRawMode(true);
      }
      resolve(data.trim());
    });
  });
}

/** Remove the stored (encrypted) LLM config — turns the optional Layer C off. */
async function commandRemoveAi(): Promise<void> {
  const encPath = await getEncryptedLlmConfigPath();
  const removed = await clearEncryptedLlmConfig();
  console.log('');
  if (removed) {
    console.log(`  ${symbols.pass} Removed stored LLM config (${c.sage(encPath)}).`);
    console.log(
      `  ${c.dim('Layer C is now off. Cloud env vars (ANTHROPIC_API_KEY / OPENAI_API_KEY), if set, still apply — unset them too for a full opt-out. Restart guard to apply:')} ${c.sage('pga guard restart')}`
    );
  } else {
    console.log(`  ${symbols.info} No stored LLM config to remove.`);
    console.log(
      `  ${c.dim('If you set ANTHROPIC_API_KEY / OPENAI_API_KEY in your environment, unset them to disable Layer C.')}`
    );
  }
  console.log('');
}

/** Interactive AI setup command */
async function commandSetupAi(): Promise<void> {
  const configDir = join(homedir(), '.panguard');
  const configPath = join(configDir, 'config.json');

  console.log('');
  console.log(header('Guard AI Layer Setup / AI 偵測層設定'));
  console.log('');
  console.log(`  Panguard Guard uses a 3-layer detection architecture:`);
  console.log(`  Panguard Guard 使用三層偵測架構：`);
  console.log('');
  console.log(`    ${c.sage('Layer 1')} - Pattern Detection (regex rules, always active)`);
  console.log(`    ${c.dim('第一層')}   ${c.dim('模式偵測（正則規則，始終啟用）')}`);
  console.log('');
  console.log(`    ${c.sage('Layer 2')} - Local AI (Ollama - $0, fully private, on-device)`);
  console.log(`    ${c.dim('第二層')}   ${c.dim('本地 AI（Ollama - $0、完全私密、裝置端執行）')}`);
  console.log('');
  console.log(`    ${c.sage('Layer 3')} - Cloud AI (Anthropic/OpenAI - fastest, most accurate)`);
  console.log(`    ${c.dim('第三層')}   ${c.dim('雲端 AI（Anthropic/OpenAI - 最快、最準確）')}`);
  console.log('');
  // Cost reality up front, so the choice is informed before anyone picks Layer 3.
  // The semantic judge runs ONLY on events the deterministic layers already
  // flagged — not on every action — so real-world usage is a handful of calls
  // a day, not thousands.
  console.log(
    `  ${c.dim('Layers 2 and 3 only run on events Layer 1 already flagged — not on every')}`
  );
  console.log(
    `  ${c.dim('action — so a typical developer triggers them just a handful of times a day.')}`
  );
  console.log(
    `  ${c.dim('第二、三層只在第一層已標記的事件上執行 — 不是每個動作都跑 — 所以一般開發者')}`
  );
  console.log(`  ${c.dim('一天只會觸發幾次。')}`);
  console.log('');
  console.log(divider());
  console.log('');

  // Check current state
  let existingConfig: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      // ignore parse errors
    }
  }

  const existingAi = existingConfig['ai'] as Record<string, unknown> | undefined;
  if (existingAi?.['provider']) {
    console.log(
      `  ${symbols.info} Current AI config: ${c.sage(String(existingAi['provider']))} / ${c.sage(String(existingAi['model'] ?? 'default'))}`
    );
    console.log(
      `  ${c.dim('目前 AI 設定')}: ${String(existingAi['provider'])} / ${String(existingAi['model'] ?? 'default')}`
    );
    console.log('');
  }

  // Step 1: Ask which layer
  console.log(`  Which AI layer would you like to configure?`);
  console.log('');
  console.log(`    ${c.sage('1')} - Local AI (Ollama)`);
  console.log(`    ${c.sage('2')} - Cloud AI (API key)`);
  console.log(`    ${c.sage('3')} - Both (Local + Cloud)`);
  console.log(`    ${c.sage('q')} - Cancel`);
  console.log('');

  const choice = await readLine(`  Choice: `);
  console.log('');

  if (choice === 'q' || choice === '') {
    console.log(`  ${symbols.info} Setup cancelled.`);
    console.log('');
    return;
  }

  const setupLocal = choice === '1' || choice === '3';
  const setupCloud = choice === '2' || choice === '3';

  // Ensure config directory exists. 0o700: ~/.panguard can hold secret-bearing
  // config — never world/group-traversable on shared machines.
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }

  // Step 2a: Local AI (Ollama)
  if (setupLocal) {
    console.log(divider('Layer 2: Local AI'));
    console.log('');
    // Honest cost framing: local inference never calls a paid API.
    console.log(
      `  ${c.dim('Cost: $0 and fully private — runs on your machine, nothing leaves it.')}`
    );
    console.log(`  ${c.dim('費用：$0 且完全私密 — 在你的機器上執行，不會有任何資料離開。')}`);
    console.log('');

    const ollamaInstalled = isOllamaInstalled();
    if (ollamaInstalled) {
      console.log(`  ${symbols.pass} Ollama is installed / Ollama 已安裝`);

      // Check if a model is available
      try {
        const models = nodeExecFileSync('ollama', ['list'], {
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
        if (models && models.split('\n').length > 1) {
          console.log(`  ${symbols.pass} Available models:`);
          const modelLines = models.split('\n').slice(1, 6);
          for (const line of modelLines) {
            console.log(`    ${c.dim(line.trim())}`);
          }
        } else {
          console.log(`  ${symbols.warn} No models found.`);
          console.log(`    ${c.dim('Run: ollama pull llama3.2')}`);
        }
      } catch {
        console.log(`  ${symbols.warn} Could not list models`);
      }
    } else {
      console.log(`  ${symbols.warn} Ollama is not installed`);
      console.log(`    ${c.dim('Install: curl -fsSL https://ollama.com/install.sh | sh')}`);
      console.log(`    ${c.dim('Then pull a model: ollama pull llama3.2')}`);
    }
    console.log('');

    const model = await readLine(`  Ollama model name [llama3.2]: `);
    const ollamaModel = model || 'llama3.2';
    const ollamaEndpoint = await readLine(`  Ollama URL [http://localhost:11434]: `);

    const aiConfig: Record<string, unknown> = {
      provider: 'ollama',
      model: ollamaModel,
    };
    if (ollamaEndpoint) {
      aiConfig['endpoint'] = ollamaEndpoint;
    }

    existingConfig = { ...existingConfig, ai: aiConfig };

    // Persist to the encrypted store the daemon reads first (resolveOptedInLLM),
    // so the local model is used deterministically — no PANGUARD_SEMANTIC=1
    // probe needed, and it survives a launchd/systemd restart. Ollama carries no
    // secret, so this is just provider/model/endpoint. If a cloud key is also
    // configured below, that write overwrites this one (cloud takes priority).
    try {
      await writeEncryptedLlmConfig({
        provider: 'ollama',
        model: ollamaModel,
        endpoint: ollamaEndpoint || undefined,
      });
    } catch {
      /* non-fatal — daemon can still discover Ollama via PANGUARD_SEMANTIC=1 */
    }

    console.log('');
    console.log(`  ${symbols.pass} Local AI configured: ${c.sage(`ollama / ${ollamaModel}`)}`);
    console.log(`  ${c.dim('本地 AI 已設定')}: ollama / ${ollamaModel}`);
    console.log('');
  }

  // Step 2b: Cloud AI
  //
  // The cloud key is persisted ENCRYPTED at rest (~/.panguard/llm.enc,
  // AES-256-GCM, machine-bound, 0600) via writeEncryptedLlmConfig — the Guard
  // daemon reads it on startup (resolveOptedInLLM). This is what makes Layer C
  // actually work with the launchd/systemd-spawned daemon, which does NOT
  // inherit a shell environment variable. Users who prefer a key that never
  // touches disk can instead export ANTHROPIC_API_KEY / OPENAI_API_KEY (also
  // read at startup). Prefer no key at all? Local AI (Ollama) needs none.
  if (setupCloud) {
    console.log(divider('Layer 3: Cloud AI'));
    console.log('');
    // Honest cost framing (verified): the semantic judge runs ONLY on events the
    // deterministic layers already flagged — a handful of times a day for a
    // typical developer, so roughly a few cents per month.
    console.log(
      `  ${c.dim('Cost: the cloud judge runs only on already-flagged events — a handful of')}`
    );
    console.log(
      `  ${c.dim('times a day for typical use, so roughly a few cents per month. You pay')}`
    );
    console.log(
      `  ${c.dim('your AI provider directly; PanGuard adds no markup and no subscription.')}`
    );
    console.log(
      `  ${c.dim('費用：雲端判斷層只在已標記的事件上執行 — 一般一天幾次，約每月幾美分；直接付給供應商。')}`
    );
    console.log('');

    const provider = await readLine(`  Cloud provider [claude/openai] (default claude): `);
    const cloudProvider = provider === 'openai' ? 'openai' : 'claude';
    const defaultModel = cloudProvider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o';
    const model = await readLine(`  Model [${defaultModel}]: `);
    const cloudModel = model || defaultModel;
    const envVarName = cloudProvider === 'claude' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    const envHasKey =
      (cloudProvider === 'claude' && !!process.env['ANTHROPIC_API_KEY']) ||
      (cloudProvider === 'openai' && !!process.env['OPENAI_API_KEY']);

    console.log('');
    console.log(`  How would you like to provide the key?`);
    console.log(
      `    ${c.sage('1')} - Paste it now (stored encrypted on this machine; the daemon reads it)`
    );
    console.log(`    ${c.sage('2')} - I'll set ${envVarName} in my environment myself`);
    if (envHasKey) {
      console.log(`        ${c.dim(`(${envVarName} is already set in this shell)`)}`);
    }
    console.log('');
    const keyChoice = await readLine(`  Choice [1]: `);

    let persistedKey = false;
    if (keyChoice !== '2') {
      // Hidden input: the key never appears on screen, in argv, or in shell history.
      const key = await readSecret(`  Paste ${envVarName} (input hidden): `);
      if (key) {
        try {
          const encPath = await writeEncryptedLlmConfig({
            provider: cloudProvider,
            model: cloudModel,
            apiKey: key,
          });
          persistedKey = true;
          console.log(
            `  ${symbols.pass} Key stored encrypted at ${c.sage(encPath)} ${c.dim('(0600, AES-256-GCM)')}`
          );
          console.log(`  ${c.dim('Remove it any time with:')} ${c.sage('pga guard ai --remove')}`);
        } catch (err: unknown) {
          console.log(
            `  ${symbols.fail} Could not store key: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      } else {
        console.log(`  ${symbols.info} No key entered — Layer C stays off until you provide one.`);
      }
    } else {
      console.log('');
      console.log(
        `  ${c.dim('Set it before restarting guard:')} ${c.sage(`export ${envVarName}=...`)}`
      );
    }

    // Store provider + model (NO secret) in the master config so status/dashboard
    // can show the intended provider. The secret lives only in llm.enc (encrypted)
    // or the env var. If local AI was also configured, keep it as fallback metadata.
    const currentAi = (existingConfig['ai'] ?? {}) as Record<string, unknown>;
    if (setupLocal && currentAi['provider'] === 'ollama') {
      existingConfig = {
        ...existingConfig,
        ai: { provider: cloudProvider, model: cloudModel },
        aiLocal: {
          provider: currentAi['provider'],
          model: currentAi['model'],
          endpoint: currentAi['endpoint'],
        },
      };
    } else {
      existingConfig = {
        ...existingConfig,
        ai: { provider: cloudProvider, model: cloudModel },
      };
    }

    console.log('');
    console.log(
      `  ${symbols.pass} Cloud AI provider set: ${c.sage(`${cloudProvider} / ${cloudModel}`)}`
    );
    if (persistedKey || envHasKey) {
      console.log(
        `  ${c.dim('Restart guard to activate Layer C:')} ${c.sage('pga guard restart')}`
      );
    } else {
      console.log(
        `  ${symbols.warn} Layer C stays off until ${c.sage(envVarName)} is set; then run ${c.sage('pga guard restart')}.`
      );
    }
    console.log('');
  }

  // Save config. 0o600 file + chmod (even if the file already existed, to
  // tighten a loosely-created one): config.json can carry other secret-bearing
  // fields (threatCloudApiKey, notification secrets) — never world/group-readable.
  try {
    writeFileSync(configPath, JSON.stringify(existingConfig, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
    try {
      chmodSync(configPath, 0o600);
    } catch {
      /* best effort — platforms without POSIX permissions */
    }
    console.log(`  ${symbols.pass} Configuration saved to ${c.sage(configPath)}`);
    console.log(`  ${c.dim('設定已儲存至')} ${configPath}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${symbols.fail} Failed to save config: ${msg}`);
    console.log(`  ${c.dim('儲存設定失敗')}: ${msg}`);
  }

  console.log('');
  console.log(`  ${symbols.info} Restart guard to apply changes: ${c.sage('pga guard restart')}`);
  console.log('');
}

// ---------------------------------------------------------------------------
// Detailed status helper — 3-layer health check
// 詳細狀態輔助函數 — 三層健康檢查
// ---------------------------------------------------------------------------

/** Read and parse a JSON file; returns null on any error */
function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Try to connect to the dashboard health endpoint with a 2-second timeout */
async function checkDashboardReachable(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const req = httpNodeRequest(
      { hostname: 'localhost', port, path: '/api/health', method: 'GET', timeout: 2000 },
      (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
        res.resume();
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

/** Format uptime in seconds as a human-readable string */
function formatUptime(uptimeSeconds: number): string {
  const h = Math.floor(uptimeSeconds / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${uptimeSeconds}s`;
}

/**
 * Parse recent stats from the guard log file.
 * Scans the last 200 lines for the most recent status summary line emitted
 * by the engine's quiet-mode callback (format: "Events: N | Threats: N | Uploaded: N").
 */
function parseLogStats(logPath: string): { events: number; threats: number } {
  if (!existsSync(logPath)) return { events: 0, threats: 0 };
  try {
    const content = readFileSync(logPath, 'utf-8');
    const lines = content.split('\n');
    const recent = lines.slice(-200);
    for (let i = recent.length - 1; i >= 0; i--) {
      const line = recent[i] ?? '';
      const evMatch = line.match(/Events:\s*([\d,]+)/);
      const thMatch = line.match(/Threats:\s*([\d,]+)/);
      if (evMatch && thMatch) {
        return {
          events: parseInt((evMatch[1] ?? '0').replace(/,/g, ''), 10),
          threats: parseInt((thMatch[1] ?? '0').replace(/,/g, ''), 10),
        };
      }
    }
  } catch {
    // Ignore read errors
  }
  return { events: 0, threats: 0 };
}

/**
 * Show a 3-layer health check panel for the guard engine.
 *
 * Layer 1 — Process:   PID file + process.kill(pid, 0)
 * Layer 2 — Dashboard: HTTP health probe on configured port
 * Layer 3 — AI Layer:  AI provider/model from config
 *
 * 顯示守護引擎的三層健康檢查面板。
 */
async function showDetailedStatus(dataDirOverride?: string): Promise<void> {
  const dataDir = dataDirOverride ?? join(homedir(), '.panguard-guard');
  const pidPath = join(dataDir, 'panguard-guard.pid');
  const configPath = join(dataDir, 'config.json');
  const logPath = join(dataDir, 'panguard-guard.log');

  // ── Layer 1: Process ──────────────────────────────────────────────────────
  let pid: number | null = null;
  let processRunning = false;
  let uptimeStr = 'unknown';

  if (existsSync(pidPath)) {
    const raw = readFileSync(pidPath, 'utf-8').trim();
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      pid = parsed;
      try {
        process.kill(pid, 0);
        processRunning = true;
      } catch {
        processRunning = false;
      }
    }
  }

  // Attempt to derive uptime from the process start time (macOS / Linux)
  if (processRunning && pid !== null) {
    try {
      const out = nodeExecFileSync('ps', ['-p', String(pid), '-o', 'etime='], {
        encoding: 'utf-8',
        timeout: 2000,
      }).trim();
      // ps etime format: [[DD-]HH:]MM:SS
      const parts = out.split(/[-:]/).map(Number);
      let seconds = 0;
      if (parts.length === 4)
        seconds =
          (parts[0] ?? 0) * 86400 + (parts[1] ?? 0) * 3600 + (parts[2] ?? 0) * 60 + (parts[3] ?? 0);
      else if (parts.length === 3)
        seconds = (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
      else if (parts.length === 2) seconds = (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
      else seconds = parts[0] ?? 0;
      if (seconds > 0) uptimeStr = formatUptime(seconds);
    } catch {
      // ps not available or failed — leave uptimeStr as 'unknown'
    }
  }

  // ── Layer 2: Dashboard + config ───────────────────────────────────────────
  const config = readJsonFile(configPath);
  const dashboardPort =
    typeof config?.['dashboardPort'] === 'number' ? config['dashboardPort'] : 3100;
  const dashboardEnabled = config?.['dashboardEnabled'] !== false;
  const mode = typeof config?.['mode'] === 'string' ? config['mode'] : 'unknown';
  const cloudEndpoint =
    typeof config?.['threatCloudEndpoint'] === 'string'
      ? config['threatCloudEndpoint']
      : 'tc.panguard.ai';

  let dashboardStatus: string;
  if (!dashboardEnabled) {
    dashboardStatus = c.dim('disabled');
  } else if (!processRunning) {
    dashboardStatus = c.caution('not checked (engine stopped)');
  } else {
    const reachable = await checkDashboardReachable(dashboardPort);
    dashboardStatus = reachable
      ? c.safe(`http://localhost:${dashboardPort} (reachable)`)
      : c.caution(`http://localhost:${dashboardPort} (unreachable)`);
  }

  // ── Layer 3: AI provider ──────────────────────────────────────────────────
  let aiStatus: string;
  const aiConfig = config?.['ai'] as Record<string, unknown> | undefined;
  if (!aiConfig?.['provider']) {
    aiStatus = c.dim('not configured');
  } else {
    const provider = String(aiConfig['provider']);
    const model = typeof aiConfig['model'] === 'string' ? aiConfig['model'] : 'default';
    aiStatus = c.sage(`${provider} connected (${model})`);
  }

  // ── Log stats ─────────────────────────────────────────────────────────────
  const { events, threats } = parseLogStats(logPath);

  // ── Render ────────────────────────────────────────────────────────────────
  const processLine = processRunning
    ? c.safe(`running`) + c.dim(` (PID: ${pid ?? '?'}, uptime: ${uptimeStr})`)
    : c.critical('stopped');

  const cloudHost = cloudEndpoint.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  const lines = [
    `${c.bold('Process:   ')} ${processLine}`,
    `${c.bold('Dashboard: ')} ${dashboardStatus}`,
    `${c.bold('AI Layer:  ')} ${aiStatus}`,
    `${c.bold('Events:    ')} ${c.sage(events.toLocaleString())} processed | ${threats > 0 ? c.caution(String(threats)) : c.dim(String(threats))} threats`,
    `${c.bold('Mode:      ')} ${c.sage(mode)}`,
    `${c.bold('Cloud:     ')} ${processRunning ? c.safe(`connected to ${cloudHost}`) : c.dim(cloudHost)}`,
  ].join('\n');

  process.stdout.write('\n');
  process.stdout.write(header('Guard Engine Status'));
  process.stdout.write(
    box(lines, {
      title: 'Guard Engine Status',
      borderColor: processRunning ? c.sage : c.caution,
    })
  );
  process.stdout.write('\n\n');
}
