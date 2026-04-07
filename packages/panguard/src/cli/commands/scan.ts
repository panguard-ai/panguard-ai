/**
 * panguard scan - Security scanning command
 * panguard scan - 安全掃描命令
 */

import { Command } from 'commander';
import type { Language } from '@panguard-ai/core';
import {
  c,
  banner,
  spinner,
  statusPanel,
  divider,
  scoreDisplay,
  colorSeverity,
  table,
  box,
  symbols,
  formatDuration,
  setLogLevel,
} from '@panguard-ai/core';
import { runScan, runRemoteScan } from '@panguard-ai/panguard-scan';
import { PANGUARD_VERSION } from '../../index.js';
import { computeGrade, buildScanOutput, saveResults } from '../scan-helpers.js';
import type { ScanOutputSystem } from '../scan-helpers.js';
import { ensureTelemetryConsent } from '../consent.js';
import { reportTelemetry, discoverLocalSkillCount, getLocalPlatform } from '../telemetry.js';

function remoteSystem(openPorts: number): ScanOutputSystem {
  return {
    os: 'remote',
    arch: 'remote',
    open_ports: openPorts,
    running_services: 0,
    firewall_enabled: false,
    security_tools_detected: 0,
  };
}

export function scanCommand(): Command {
  return new Command('scan')
    .description('Run a security scan / 執行安全掃描')
    .argument('[path]', 'File or directory to scan with ATR (auto-detects MCP JSON vs SKILL.md)')
    .option('--quick', 'Quick scan mode (~30s) / 快速掃描模式', false)
    .option('--output <path>', 'Output PDF report path / 輸出 PDF 報告路徑')
    .option('--lang <language>', 'Language: en or zh-TW / 語言', 'en')
    .option('--verbose', 'Verbose output / 詳細輸出', false)
    .option('--json', 'Output pure JSON to stdout (for AI agents) / 輸出純 JSON', false)
    .option('--sarif', 'Output SARIF v2.1.0 to stdout / 輸出 SARIF', false)
    .option('--severity <level>', 'Minimum severity (informational, low, medium, high, critical)', 'medium')
    .option('--save <path>', 'Save JSON results to file / 儲存 JSON 結果到檔案')
    .option('--target <host>', 'Remote target (IP or domain) / 遠端目標')
    .action(
      async (path: string | undefined, options: {
        quick: boolean;
        output?: string;
        lang: string;
        verbose: boolean;
        json: boolean;
        sarif: boolean;
        severity: string;
        save?: string;
        target?: string;
      }) => {
        const lang: Language = options.lang === 'zh-TW' ? 'zh-TW' : 'en';

        // ── ATR scan mode: pga scan <file-or-dir> ───────────────
        if (path) {
          if (!options.verbose) setLogLevel('silent');
          try {
            const { execFileSync } = await import('node:child_process');
            const { resolve: resolvePath } = await import('node:path');
            const { existsSync: pathExists } = await import('node:fs');

            // Validate and resolve path
            const resolvedPath = resolvePath(path);
            if (!pathExists(resolvedPath)) {
              console.error(`Error: Path not found: ${resolvedPath}`);
              process.exitCode = 1;
              return;
            }

            const atrArgs = ['scan', resolvedPath, '--severity', options.severity];
            if (options.sarif) atrArgs.push('--sarif');
            else if (options.json) atrArgs.push('--json');

            // Find ATR binary: check if `atr` is on PATH, else use npx
            let atrBin: string;
            const { execFileSync: efs } = await import('node:child_process');
            let atrOnPath = false;
            try {
              efs('atr', ['--version'], { stdio: 'pipe', timeout: 5000 });
              atrOnPath = true;
            } catch { /* not installed */ }

            if (atrOnPath) {
              atrBin = 'atr';
            } else {
              atrBin = 'npx';
              atrArgs.unshift('-y', 'agent-threat-rules');
            }

            const result = execFileSync(atrBin, atrArgs, {
              stdio: ['inherit', 'pipe', 'inherit'],
              timeout: 60_000,
            });
            process.stdout.write(result);
          } catch (err: unknown) {
            const e = err as { status?: number; stdout?: Buffer };
            // ATR exits 1 on findings with fail-on-finding — still show output
            if (e.stdout && e.stdout.length > 0) {
              process.stdout.write(e.stdout);
            }
            process.exitCode = e.status ?? 1;
          }
          return;
        }

        // Suppress all structured logs early for JSON/non-verbose modes
        if (options.json || !options.verbose) {
          setLogLevel('silent');
        }

        const telemetryEnabled = await ensureTelemetryConsent();

        // Remote scan mode
        if (options.target) {
          setLogLevel('silent');
          if (options.json) {
            const result = await runRemoteScan({ target: options.target, lang });
            const output = buildScanOutput({
              version: PANGUARD_VERSION,
              timestamp: result.scannedAt,
              target: options.target,
              riskScore: result.riskScore,
              riskLevel: result.riskLevel,
              scanDuration: result.scanDuration,
              findings: result.findings,
              system: remoteSystem(result.discovery.openPorts.length),
            });
            if (options.save) {
              await saveResults(options.save, output);
            }
            console.log(JSON.stringify(output, null, 2));
            void reportTelemetry(telemetryEnabled, {
              event: 'scan_remote_json',
              platform: getLocalPlatform(),
              skillCount: await discoverLocalSkillCount(),
              findingCount: result.findings.length,
              severity: result.riskLevel,
            });
            return;
          }

          // Human-friendly remote scan output
          console.log(banner(PANGUARD_VERSION));
          console.log(`  ${symbols.scan} Remote Scan: ${c.bold(options.target)}`);
          console.log('');
          const sp = spinner(`Scanning ${options.target}...`);
          const result = await runRemoteScan({ target: options.target, lang });
          sp.succeed(`Remote scan complete ${c.dim(`(${formatDuration(result.scanDuration)})`)}`);

          const { safetyScore, grade } = computeGrade(result.riskScore);
          console.log(scoreDisplay(safetyScore, grade));

          console.log(
            statusPanel(`PANGUARD AI Remote Scan: ${options.target}`, [
              { label: 'Risk Score', value: `${result.riskScore}/100` },
              { label: 'Issues', value: String(result.findings.length) },
              { label: 'Open Ports', value: String(result.discovery.openPorts.length) },
            ])
          );

          console.log('');
          console.log(
            c.dim('  Open source (MIT). Star us: https://github.com/panguard-ai/panguard-ai')
          );

          if (result.findings.length > 0) {
            console.log(divider(`${result.findings.length} Finding(s)`));
            console.log('');
            const columns = [
              { header: '#', key: 'num', width: 4, align: 'right' as const },
              { header: 'Severity', key: 'severity', width: 10 },
              { header: 'Finding', key: 'title', width: 50 },
            ];
            const rows = result.findings.map((f, i) => ({
              num: String(i + 1),
              severity: colorSeverity(f.severity),
              title: f.title,
            }));
            console.log(table(columns, rows));
          } else {
            console.log(
              box(`${symbols.pass} No issues found!`, { borderColor: c.safe, title: 'All Clear' })
            );
          }

          // Save results to file if --save is set (remote human-friendly path)
          if (options.save) {
            const saveOutput = buildScanOutput({
              version: PANGUARD_VERSION,
              timestamp: result.scannedAt,
              target: options.target,
              riskScore: result.riskScore,
              riskLevel: result.riskLevel,
              scanDuration: result.scanDuration,
              findings: result.findings,
              system: remoteSystem(result.discovery.openPorts.length),
            });
            await saveResults(options.save, saveOutput);
            console.log(`  Results saved to: ${options.save}`);
          }

          console.log('');
          void reportTelemetry(telemetryEnabled, {
            event: 'scan_remote',
            platform: getLocalPlatform(),
            skillCount: await discoverLocalSkillCount(),
            findingCount: result.findings.length,
            severity: result.riskLevel,
          });
          return;
        }

        // JSON mode: pure JSON to stdout, no terminal UI
        if (options.json) {
          setLogLevel('silent');
          const result = await runScan({
            depth: options.quick ? 'quick' : 'full',
            lang,
            verbose: false,
          });

          const output = buildScanOutput({
            version: PANGUARD_VERSION,
            timestamp: result.scannedAt,
            target: 'localhost',
            riskScore: result.riskScore,
            riskLevel: result.riskLevel,
            scanDuration: result.scanDuration,
            findings: result.findings,
            system: {
              os: `${result.discovery.os.distro} ${result.discovery.os.version}`,
              arch: result.discovery.os.arch,
              open_ports: result.discovery.openPorts.length,
              running_services: result.discovery.services.length,
              firewall_enabled: result.discovery.security.firewall.enabled,
              security_tools_detected: result.discovery.security.existingTools.length,
            },
            includeManualFix: true,
          });
          if (options.save) {
            await saveResults(options.save, output);
          }
          console.log(JSON.stringify(output, null, 2));
          void reportTelemetry(telemetryEnabled, {
            event: 'scan_local_json',
            platform: getLocalPlatform(),
            skillCount: await discoverLocalSkillCount(),
            findingCount: result.findings.length,
            severity: result.riskLevel,
          });
          return;
        }

        // Suppress structured JSON logs unless --verbose
        if (!options.verbose) {
          setLogLevel('silent');
        }

        console.log(banner(PANGUARD_VERSION));
        const mode = options.quick ? 'Quick Scan' : 'Full Scan';
        console.log(`  ${symbols.scan} ${mode}`);
        console.log('');

        const sp = spinner('Scanning system security...');
        let result;
        try {
          result = await runScan({
            depth: options.quick ? 'quick' : 'full',
            lang,
            output: options.output,
            verbose: options.verbose,
          });
        } catch (err) {
          sp.fail(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
          process.exitCode = 1;
          return;
        }
        sp.succeed(`Scan complete ${c.dim(`(${formatDuration(result.scanDuration)})`)}`);

        // Security Score
        const { safetyScore, grade } = computeGrade(result.riskScore);
        console.log(scoreDisplay(safetyScore, grade));

        // Status panel
        console.log(
          statusPanel('PANGUARD AI Security Status', [
            {
              label: 'Status',
              value:
                result.riskScore <= 25
                  ? c.safe('PROTECTED')
                  : result.riskScore <= 50
                    ? c.caution('AT RISK')
                    : c.critical('VULNERABLE'),
              status:
                result.riskScore <= 25 ? 'safe' : result.riskScore <= 50 ? 'caution' : 'critical',
            },
            {
              label: 'Risk Score',
              value: `${result.riskScore}/100`,
              status:
                result.riskScore <= 25 ? 'safe' : result.riskScore <= 50 ? 'caution' : 'critical',
            },
            {
              label: 'Issues Found',
              value: String(result.findings.length),
              status: result.findings.length === 0 ? 'safe' : 'caution',
            },
            { label: 'Scan Duration', value: formatDuration(result.scanDuration) },
          ])
        );

        // Findings
        if (result.findings.length > 0) {
          console.log(divider(`${result.findings.length} Finding(s)`));
          console.log('');

          const columns = [
            { header: '#', key: 'num', width: 4, align: 'right' as const },
            { header: 'Severity', key: 'severity', width: 10 },
            { header: 'Finding', key: 'title', width: 42 },
          ];

          const rows = result.findings.map((f, i) => ({
            num: String(i + 1),
            severity: colorSeverity(f.severity),
            title: f.title,
          }));

          console.log(table(columns, rows));

          // Show manual fix commands unconditionally
          let fixableCount = 0;
          console.log('');
          for (const f of result.findings) {
            if (f.manualFix && f.manualFix.length > 0) {
              fixableCount++;
              console.log(`  ${colorSeverity(f.severity).padEnd(10)} ${f.title}`);
              console.log(c.dim('          Manual fix:'));
              for (const cmd of f.manualFix) {
                console.log(c.dim(`          $ ${cmd}`));
              }
              console.log('');
            }
          }
          if (fixableCount > 0) {
            console.log(
              box(`Auto-fix available for ${fixableCount} issue(s):\n  $ panguard scan --fix`, {
                borderColor: c.sage,
                title: 'Panguard AI',
              })
            );
          }
          console.log('');
        } else {
          console.log(
            box(`${symbols.pass} No security issues found!`, {
              borderColor: c.safe,
              title: 'All Clear',
            })
          );
          console.log('');
        }

        // Save results to file if --save is set (local human-friendly path)
        if (options.save) {
          const saveOutput = buildScanOutput({
            version: PANGUARD_VERSION,
            timestamp: result.scannedAt,
            target: 'localhost',
            riskScore: result.riskScore,
            riskLevel: result.riskLevel,
            scanDuration: result.scanDuration,
            findings: result.findings,
            system: {
              os: `${result.discovery.os.distro} ${result.discovery.os.version}`,
              arch: result.discovery.os.arch,
              open_ports: result.discovery.openPorts.length,
              running_services: result.discovery.services.length,
              firewall_enabled: result.discovery.security.firewall.enabled,
              security_tools_detected: result.discovery.security.existingTools.length,
            },
            includeManualFix: true,
          });
          await saveResults(options.save, saveOutput);
          console.log(`  Results saved to: ${options.save}`);
        }

        // PDF report
        if (options.output) {
          const { generatePdfReport } = await import('@panguard-ai/panguard-scan');
          const reportSp = spinner('Generating PDF report...');
          try {
            await generatePdfReport(result, options.output, lang);
            reportSp.succeed(`Report saved: ${options.output}`);
          } catch (err) {
            reportSp.fail(`Error: ${err instanceof Error ? err.message : err}`);
          }
        }

        console.log(c.dim(`  Scan completed at ${new Date().toLocaleString()}`));
        console.log('');

        void reportTelemetry(telemetryEnabled, {
          event: 'scan_local',
          platform: getLocalPlatform(),
          skillCount: await discoverLocalSkillCount(),
          findingCount: result.findings.length,
          severity: result.riskLevel,
        });
      }
    );
}
