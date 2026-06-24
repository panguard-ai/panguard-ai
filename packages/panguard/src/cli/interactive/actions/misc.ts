/**
 * Miscellaneous actions: report, trap, notify, threat-cloud, hardening, status, config
 * @module @panguard-ai/panguard/cli/interactive/actions/misc
 */

import { c, spinner } from '@panguard-ai/core';
import { theme } from '../../theme.js';
import { renderCompactMenu, waitForCompactChoice, pressAnyKey } from '../../menu.js';
import type { MenuItem, Lang } from '../../menu.js';
import { breadcrumb, formatError } from '../../ux-helpers.js';

// ---------------------------------------------------------------------------
// [2] Compliance Report
// ---------------------------------------------------------------------------

export async function actionReport(lang: Lang): Promise<void> {
  breadcrumb(['Panguard', lang === 'zh-TW' ? '\u5408\u898F\u5831\u544A' : 'Compliance Report']);
  console.log('');
  if (lang === 'zh-TW') {
    console.log('  \u5408\u898F\u5831\u544A\uFF08Enterprise \u529F\u80FD\uFF09');
    console.log('');
    console.log('  \u5C07\u5075\u6E2C\u7D50\u679C\u6620\u5C04\u5230\u5408\u898F\u6846\u67B6\uFF08EU AI Act / NIST AI RMF /');
    console.log('  ISO 42001 / OWASP \u7B49\uFF09\u3001\u9644 SHA-256 + \u53EF\u9078\u7C3D\u7AE0\u4F9B\u7A3D\u6838\u9A57\u8B49\u7684');
    console.log('  \u5408\u898F\u8B49\u64DA\u5831\u544A\uFF0C\u662F Enterprise \u65B9\u6848\u529F\u80FD\uFF0C\u4E0D\u5728\u514D\u8CBB Community CLI \u5167\u3002');
    console.log('');
    console.log('  Community \u7248\u63D0\u4F9B\u5E95\u5C64\u5075\u6E2C\uFF08\u5831\u544A\u7684\u7D20\u6750\uFF09\uFF1A');
    console.log('    pga scan <path>          \u7528\u5167\u5EFA ATR \u898F\u5247\u6383\u63CF');
    console.log('    pga audit skill <path>   \u5BE9\u6838\u4E00\u500B skill');
    console.log('');
    console.log('  \u4E86\u89E3 Enterprise\uFF1Ahttps://panguard.ai');
  } else {
    console.log('  Compliance Report (Enterprise feature)');
    console.log('');
    console.log('  Compliance evidence reports \u2014 detection results mapped to EU AI Act /');
    console.log('  NIST AI RMF / ISO 42001 / OWASP, with a SHA-256 + optional signature auditors');
    console.log('  can verify \u2014 are part of the Enterprise plan, not the free Community CLI.');
    console.log('');
    console.log('  The Community edition gives you the underlying detection (the report inputs):');
    console.log('    pga scan <path>          scan with the bundled ATR ruleset');
    console.log('    pga audit skill <path>   audit a skill before you install it');
    console.log('');
    console.log('  Learn more about Enterprise: https://panguard.ai');
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// [4] Honeypot System
// ---------------------------------------------------------------------------

export async function actionTrap(lang: Lang): Promise<void> {
  breadcrumb(['Panguard', lang === 'zh-TW' ? '\u871C\u7F50\u7CFB\u7D71' : 'Honeypot System']);
  console.log('');
  if (lang === 'zh-TW') {
    console.log('  \u871C\u7F50\u7CFB\u7D71');
    console.log('');
    console.log(
      '  \u4EE5\u5047 TCP \u670D\u52D9\uFF08SSH/HTTP/FTP/Telnet/MySQL/Redis/SMB/RDP\uFF09\u8A98\u6355\u653B\u64CA\u8005\uFF0C'
    );
    console.log(
      '  \u8A18\u9304\u9023\u7DDA\u3001\u6191\u8B49\u5617\u8A66\u3001\u57F7\u884C\u6307\u4EE4\uFF0C\u4E26\u4E0A\u50B3\u5A01\u8105\u60C5\u5831\u5230 Threat Cloud\u3002'
    );
    console.log('');
    console.log('  \u5F9E CLI \u57F7\u884C\uFF1A');
    console.log(
      '    pga trap start --services ssh,http   # \u555F\u52D5\u8A98\u990C\u670D\u52D9\uFF08\u524D\u666F\uFF09'
    );
    console.log('    pga trap status                       # \u67E5\u770B\u9023\u7DDA\u7D71\u8A08');
    console.log(
      '    pga trap profiles                     # \u986F\u793A\u653B\u64CA\u8005\u5206\u6790'
    );
    console.log('    pga trap intel                        # \u986F\u793A\u60C5\u5831\u5831\u544A');
    console.log('    pga trap stop                         # \u505C\u6B62');
    console.log('');
    console.log(
      '  Threat Cloud \u4E0A\u50B3\u9810\u8A2D\u555F\u7528\uFF0C\u53EF\u52A0 --no-cloud \u95DC\u9589\u3002'
    );
  } else {
    console.log('  Honeypot System');
    console.log('');
    console.log('  Fake TCP services (SSH/HTTP/FTP/Telnet/MySQL/Redis/SMB/RDP) that lure');
    console.log('  attackers, log connections + credential attempts + commands, and upload');
    console.log('  threat intel to Threat Cloud.');
    console.log('');
    console.log('  Run from CLI:');
    console.log('    pga trap start --services ssh,http   # Start decoy services (foreground)');
    console.log('    pga trap status                       # Show connection stats');
    console.log('    pga trap profiles                     # Show attacker profiles');
    console.log('    pga trap intel                        # Show intel reports');
    console.log('    pga trap stop                         # Stop');
    console.log('');
    console.log('  Threat Cloud upload is enabled by default. Pass --no-cloud to disable.');
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// [5] Notifications
// ---------------------------------------------------------------------------

export async function actionChat(lang: Lang): Promise<void> {
  breadcrumb(['Panguard', lang === 'zh-TW' ? '\u901A\u77E5\u7CFB\u7D71' : 'Notifications']);
  const title = lang === 'zh-TW' ? '\u901A\u77E5\u7CFB\u7D71' : 'Notifications';
  console.log(`  ${theme.brandBold(title)}`);
  console.log('');

  const items: MenuItem[] = [
    {
      key: '1',
      label: lang === 'zh-TW' ? '\u8A2D\u5B9A\u901A\u77E5\u7BA1\u9053' : 'Setup Channels',
    },
    { key: '2', label: lang === 'zh-TW' ? '\u67E5\u770B\u72C0\u614B' : 'Status' },
    { key: '3', label: lang === 'zh-TW' ? '\u6E2C\u8A66\u767C\u9001' : 'Test Send' },
  ];

  renderCompactMenu(lang === 'zh-TW' ? '\u901A\u77E5\u7CFB\u7D71' : 'Notifications', items);
  const choice = await waitForCompactChoice(items, lang);
  if (!choice) return;

  console.log('');
  const { runCLI: chatRunCLI } = await import('@panguard-ai/panguard-chat');

  switch (choice.key) {
    case '1':
      await chatRunCLI(['setup', '--lang', lang]);
      break;
    case '2':
      await chatRunCLI(['status']);
      break;
    case '3':
      await chatRunCLI(['config']);
      break;
  }
}

// ---------------------------------------------------------------------------
// [6] Threat Cloud
// ---------------------------------------------------------------------------

export async function actionThreat(lang: Lang): Promise<void> {
  breadcrumb(['Panguard', lang === 'zh-TW' ? '\u5A01\u8105\u60C5\u5831' : 'Threat Cloud']);
  const title = lang === 'zh-TW' ? '\u5A01\u8105\u60C5\u5831' : 'Threat Cloud';
  console.log(`  ${theme.brandBold(title)}`);
  console.log('');

  const port = 8080;
  const net = await import('node:net');
  const portAvailable = await new Promise<boolean>((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '127.0.0.1');
  });

  if (!portAvailable) {
    console.log(
      formatError(
        lang === 'zh-TW'
          ? `\u9023\u63A5\u57E0 ${port} \u5DF2\u88AB\u4F54\u7528`
          : `Port ${port} is already in use`,
        `Port ${port}`,
        lang === 'zh-TW'
          ? `\u91CB\u653E\u9023\u63A5\u57E0 ${port} \u5F8C\u518D\u8A66`
          : `Free port ${port} and try again`
      )
    );
    return;
  }

  console.log(
    c.dim(
      lang === 'zh-TW'
        ? `  \u5373\u5C07\u555F\u52D5\u5A01\u8105\u60C5\u5831 REST API \u4F3A\u670D\u5668 (port ${port})`
        : `  Starting Threat Cloud REST API server (port ${port})...`
    )
  );
  console.log('');

  let ThreatCloudServer: any;
  try {
    const mod = '@panguard-ai/threat-cloud';
    const tc = await import(/* webpackIgnore: true */ mod);
    ThreatCloudServer = tc.ThreatCloudServer;
  } catch {
    console.log(c.red('  Threat Cloud server package is not available.'));
    console.log(c.dim('  Your Guard client connects to Threat Cloud automatically.'));
    return;
  }
  const sp = spinner(
    lang === 'zh-TW'
      ? '\u6B63\u5728\u555F\u52D5 Threat Cloud API...'
      : 'Starting Threat Cloud API server...'
  );

  const server = new ThreatCloudServer({
    port: 8080,
    host: '127.0.0.1',
    dbPath: './threat-cloud.db',
    apiKeyRequired: false,
    apiKeys: [],
    rateLimitPerMinute: 120,
  });

  try {
    await server.start();
    sp.succeed(
      lang === 'zh-TW' ? 'Threat Cloud API \u5DF2\u555F\u52D5' : 'Threat Cloud API started'
    );

    console.log('');
    console.log(`  URL       ${c.underline('http://127.0.0.1:8080')}`);
    console.log(`  Health    ${c.sage('http://127.0.0.1:8080/health')}`);
    console.log(`  API       ${c.sage('http://127.0.0.1:8080/api/stats')}`);
    console.log('');
    console.log(
      c.dim(
        lang === 'zh-TW'
          ? '  \u6309\u4EFB\u610F\u9375\u505C\u6B62\u4F3A\u670D\u5668...'
          : '  Press any key to stop...'
      )
    );

    await pressAnyKey(lang);
    await server.stop();
    console.log(
      `  ${c.safe(lang === 'zh-TW' ? 'Threat Cloud \u5DF2\u505C\u6B62' : 'Threat Cloud stopped')}`
    );
  } catch (err) {
    sp.fail(`${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Prompt commands: Hardening
// ---------------------------------------------------------------------------

export async function actionHardening(lang: Lang): Promise<void> {
  breadcrumb(['Panguard', lang === 'zh-TW' ? '\u5B89\u5168\u52A0\u56FA' : 'Security Hardening']);
  const title = lang === 'zh-TW' ? '\u5B89\u5168\u52A0\u56FA' : 'Security Hardening';
  console.log(`  ${theme.brandBold(title)}`);
  console.log('');

  const items: MenuItem[] = [
    {
      key: '1',
      label: lang === 'zh-TW' ? '\u57F7\u884C\u52A0\u56FA\u6383\u63CF' : 'Run hardening audit',
    },
    { key: '2', label: lang === 'zh-TW' ? '\u81EA\u52D5\u4FEE\u5FA9' : 'Auto-fix issues' },
    { key: '3', label: lang === 'zh-TW' ? '\u67E5\u770B\u5831\u544A' : 'View report' },
  ];

  renderCompactMenu(lang === 'zh-TW' ? '\u5B89\u5168\u52A0\u56FA' : 'Hardening', items);
  const choice = await waitForCompactChoice(items, lang);
  if (!choice) return;

  console.log('');
  const { hardeningCommand } = await import('../../commands/hardening.js');
  const cmd = hardeningCommand();

  switch (choice.key) {
    case '1':
      await cmd.parseAsync(['hardening', 'audit'], { from: 'user' });
      break;
    case '2':
      await cmd.parseAsync(['hardening', 'fix'], { from: 'user' });
      break;
    case '3':
      await cmd.parseAsync(['hardening', 'report'], { from: 'user' });
      break;
  }
}

// ---------------------------------------------------------------------------
// Prompt commands: Status
// ---------------------------------------------------------------------------

export async function actionStatus(lang: Lang): Promise<void> {
  breadcrumb(['Panguard', lang === 'zh-TW' ? '\u7CFB\u7D71\u72C0\u614B' : 'Status']);
  const { statusCommand } = await import('../../commands/status.js');
  const cmd = statusCommand();
  await cmd.parseAsync(['status'], { from: 'user' });
}

// ---------------------------------------------------------------------------
// Prompt commands: Config
// ---------------------------------------------------------------------------

export async function actionConfig(lang: Lang): Promise<void> {
  breadcrumb(['Panguard', lang === 'zh-TW' ? '\u8A2D\u5B9A\u7BA1\u7406' : 'Settings']);
  const { configCommand } = await import('../../commands/config.js');
  const cmd = configCommand();
  await cmd.parseAsync(['config'], { from: 'user' });
}
