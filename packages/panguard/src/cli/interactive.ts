/**
 * Panguard AI - Interactive CLI Mode
 *
 * Launches when user runs `panguard` without subcommands.
 * Provides a menu-driven terminal interface with brand styling.
 *
 * @module @openclaw/panguard/cli/interactive
 */

import {
  c, banner, spinner, statusPanel, divider, scoreDisplay,
  colorSeverity, table, box, symbols, formatDuration,
} from '@openclaw/core';
import type { TableColumn, StatusItem } from '@openclaw/core';
import { PANGUARD_VERSION } from '../index.js';
import {
  renderMenu, renderCompactMenu, renderStatusBox,
  waitForChoice, pressAnyKey, showHelp, cleanupTerminal,
} from './menu.js';
import type { MenuItem } from './menu.js';
import { checkFeatureAccess, showUpgradePrompt } from './auth-guard.js';

type Lang = 'en' | 'zh-TW';

let currentLang: Lang = 'zh-TW';

// ---------------------------------------------------------------------------
// Main menu items
// ---------------------------------------------------------------------------

const MAIN_MENU_ITEMS: MenuItem[] = [
  {
    key: '0',
    icon: symbols.arrow,
    label: { 'zh-TW': '\u521D\u59CB\u8A2D\u5B9A', en: 'Setup Wizard' },
    description: {
      'zh-TW': '\u554F\u5377\u5F0F\u5F15\u5C0E\uFF0C\u81EA\u52D5\u914D\u7F6E\u6240\u6709\u6A21\u7D44',
      en: 'Guided questionnaire to configure all modules',
    },
  },
  {
    key: '1',
    icon: symbols.scan,
    label: { 'zh-TW': '\u5B89\u5168\u6383\u63CF', en: 'Security Scan' },
    description: {
      'zh-TW': '\u6383\u63CF\u7CFB\u7D71\u5B89\u5168\u72C0\u614B\uFF0C\u5206\u6790\u6F5B\u5728\u98A8\u96AA',
      en: 'Scan your system for security issues and risks',
    },
  },
  {
    key: '2',
    icon: symbols.shield,
    label: { 'zh-TW': '\u5408\u898F\u5831\u544A [PRO]', en: 'Compliance Report [PRO]' },
    description: {
      'zh-TW': '\u7522\u751F ISO 27001\u3001SOC 2\u3001\u8CC7\u901A\u5B89\u5168\u7BA1\u7406\u6CD5\u5831\u544A',
      en: 'Generate ISO 27001, SOC 2, or TW Cyber Security Act reports',
    },
  },
  {
    key: '3',
    icon: symbols.pass,
    label: { 'zh-TW': '\u5B88\u8B77\u5F15\u64CE', en: 'Guard Engine' },
    description: {
      'zh-TW': '\u5373\u6642\u76E3\u63A7\u8207\u9632\u8B77\u7CFB\u7D71',
      en: 'Real-time monitoring and protection system',
    },
  },
  {
    key: '4',
    label: { 'zh-TW': '\u871C\u7F50\u7CFB\u7D71 [PRO]', en: 'Honeypot System [PRO]' },
    description: {
      'zh-TW': '\u90E8\u7F72\u871C\u7F50\u670D\u52D9\uFF0C\u5206\u6790\u653B\u64CA\u8005\u884C\u70BA',
      en: 'Deploy honeypot services for attacker profiling',
    },
  },
  {
    key: '5',
    label: { 'zh-TW': '\u901A\u77E5\u7CFB\u7D71 [SOLO]', en: 'Notifications [SOLO]' },
    description: {
      'zh-TW': 'LINE\u3001Telegram\u3001Slack\u3001Email\u3001Webhook \u901A\u77E5\u7BA1\u9053',
      en: 'Notification channels: LINE, Telegram, Slack, Email, Webhook',
    },
  },
  {
    key: '6',
    label: { 'zh-TW': '\u5A01\u8105\u60C5\u5831 [ENT]', en: 'Threat Cloud [ENT]' },
    description: {
      'zh-TW': '\u5A01\u8105\u60C5\u5831 REST API \u4F3A\u670D\u5668',
      en: 'Threat intelligence REST API server',
    },
  },
  {
    key: '7',
    label: { 'zh-TW': '\u81EA\u52D5\u5C55\u793A', en: 'Auto Demo' },
    description: {
      'zh-TW': '\u81EA\u52D5\u57F7\u884C\u6240\u6709\u529F\u80FD\u5C55\u793A',
      en: 'Run through all features automatically',
    },
  },
];

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function startInteractive(lang?: string): Promise<void> {
  currentLang = lang === 'en' ? 'en' : 'zh-TW';

  const exit = () => {
    cleanupTerminal();
    const msg = currentLang === 'zh-TW'
      ? `\u611F\u8B1D\u4F7F\u7528 Panguard AI\uFF0C\u518D\u898B\uFF01`
      : 'Goodbye from Panguard AI!';
    console.log(`\n  ${symbols.pass} ${c.sage(msg)}\n`);
    process.exit(0);
  };
  process.on('SIGINT', exit);
  process.on('SIGTERM', exit);

  // Welcome screen
  console.clear();
  console.log(banner());
  console.log('');

  // System status dashboard
  renderStatusBox([
    {
      label: currentLang === 'zh-TW' ? '\u9632\u8B77\u72C0\u614B' : 'Protection',
      value: currentLang === 'zh-TW' ? '\u5DF2\u5C31\u7DD2' : 'Ready',
      color: c.safe,
    },
    {
      label: currentLang === 'zh-TW' ? '\u53EF\u7528\u6A21\u7D44' : 'Modules',
      value: currentLang === 'zh-TW' ? '6 \u500B\u6A21\u7D44\u53EF\u7528' : '6 modules available',
      color: c.sage,
    },
    {
      label: currentLang === 'zh-TW' ? '\u7248\u672C' : 'Version',
      value: `v${PANGUARD_VERSION}`,
      color: c.dim,
    },
  ], currentLang);
  console.log('');

  // Main loop
  while (true) {
    renderMenu(
      { en: 'Main Menu', 'zh-TW': '\u4E3B\u9078\u55AE' },
      MAIN_MENU_ITEMS,
      currentLang,
    );

    const choice = await waitForChoice(MAIN_MENU_ITEMS, {
      quitLabel: { en: 'Quit', 'zh-TW': '\u9000\u51FA' },
      lang: currentLang,
    });

    if (choice === null) {
      exit();
      return;
    }

    if (choice.key === '__lang__') {
      currentLang = currentLang === 'zh-TW' ? 'en' : 'zh-TW';
      console.clear();
      console.log(banner());
      console.log('');
      const langName = currentLang === 'zh-TW' ? '\u7E41\u9AD4\u4E2D\u6587' : 'English';
      console.log(`  ${symbols.info} ${currentLang === 'zh-TW' ? '\u8A9E\u8A00\u5DF2\u5207\u63DB\u70BA' : 'Language switched to'}: ${c.sage(langName)}`);
      console.log('');
      continue;
    }

    if (choice.key === '__help__') {
      showHelp(currentLang);
      await pressAnyKey(currentLang);
      console.clear();
      console.log(banner());
      console.log('');
      continue;
    }

    console.clear();
    try {
      switch (choice.key) {
        case '0': await actionInit(); break;
        case '1': await actionScan(); break;
        case '2':
          if (!checkFeatureAccess('report')) { showUpgradePrompt('Compliance Report'); break; }
          await actionReport();
          break;
        case '3': await actionGuard(); break;
        case '4':
          if (!checkFeatureAccess('trap')) { showUpgradePrompt('Honeypot System'); break; }
          await actionTrap();
          break;
        case '5':
          if (!checkFeatureAccess('notifications')) { showUpgradePrompt('Notifications'); break; }
          await actionChat();
          break;
        case '6':
          if (!checkFeatureAccess('threat-cloud')) { showUpgradePrompt('Threat Cloud'); break; }
          await actionThreat();
          break;
        case '7': await actionDemo(); break;
      }
    } catch (err) {
      console.log('');
      console.log(box(
        `${symbols.fail} ${err instanceof Error ? err.message : String(err)}`,
        { borderColor: c.critical, title: currentLang === 'zh-TW' ? '\u932F\u8AA4' : 'Error' },
      ));
    }

    await pressAnyKey(currentLang);
    console.clear();
    console.log(banner());
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// 0. Setup Wizard
// ---------------------------------------------------------------------------

async function actionInit(): Promise<void> {
  const { runInitWizard } = await import('../init/index.js');
  await runInitWizard(currentLang);
}

// ---------------------------------------------------------------------------
// 1. Security Scan
// ---------------------------------------------------------------------------

async function actionScan(): Promise<void> {
  console.log(banner());
  console.log(divider(currentLang === 'zh-TW' ? '\u5B89\u5168\u6383\u63CF / Security Scan' : 'Security Scan'));
  console.log('');

  const depthItems: MenuItem[] = [
    {
      key: '1',
      label: {
        'zh-TW': '\u5FEB\u901F\u6383\u63CF',
        en: 'Quick Scan',
      },
      description: {
        'zh-TW': '\u5FEB\u901F\u6383\u63CF (~30 \u79D2)',
        en: 'Fast scan (~30 seconds)',
      },
    },
    {
      key: '2',
      label: {
        'zh-TW': '\u5B8C\u6574\u6383\u63CF',
        en: 'Full Scan',
      },
      description: {
        'zh-TW': '\u5B8C\u6574\u7CFB\u7D71\u6383\u63CF',
        en: 'Complete system scan',
      },
    },
  ];

  renderCompactMenu(
    { en: 'Scan Mode', 'zh-TW': '\u6383\u63CF\u6A21\u5F0F' },
    depthItems,
    currentLang,
  );

  const choice = await waitForChoice(depthItems, {
    backLabel: { en: 'Back', 'zh-TW': '\u8FD4\u56DE' },
    lang: currentLang,
  });
  if (!choice || choice.key.startsWith('__')) return;

  const depth = choice.key === '1' ? 'quick' : 'full';
  console.log('');

  const { runScan } = await import('@openclaw/panguard-scan');
  const sp = spinner(currentLang === 'zh-TW'
    ? '\u6B63\u5728\u6383\u63CF\u7CFB\u7D71\u5B89\u5168...'
    : 'Scanning system security...');
  const result = await runScan({ depth, lang: currentLang, verbose: false });
  sp.succeed(currentLang === 'zh-TW'
    ? `\u6383\u63CF\u5B8C\u6210 ${c.dim(`(${formatDuration(result.scanDuration)})`)}`
    : `Scan complete ${c.dim(`(${formatDuration(result.scanDuration)})`)}`);

  const safetyScore = Math.max(0, 100 - result.riskScore);
  const grade = safetyScore >= 90 ? 'A' : safetyScore >= 75 ? 'B' : safetyScore >= 60 ? 'C' : safetyScore >= 40 ? 'D' : 'F';
  console.log(scoreDisplay(safetyScore, grade));

  const statusItems: StatusItem[] = [
    {
      label: currentLang === 'zh-TW' ? '\u72C0\u614B' : 'Status',
      value: result.riskScore <= 25
        ? c.safe(currentLang === 'zh-TW' ? '\u5B89\u5168' : 'PROTECTED')
        : result.riskScore <= 50
        ? c.caution(currentLang === 'zh-TW' ? '\u6CE8\u610F' : 'AT RISK')
        : c.critical(currentLang === 'zh-TW' ? '\u5371\u96AA' : 'VULNERABLE'),
      status: result.riskScore <= 25 ? 'safe' as const : result.riskScore <= 50 ? 'caution' as const : 'critical' as const,
    },
    { label: currentLang === 'zh-TW' ? '\u98A8\u96AA\u5206\u6578' : 'Risk Score', value: `${result.riskScore}/100` },
    { label: currentLang === 'zh-TW' ? '\u767C\u73FE\u554F\u984C' : 'Issues Found', value: String(result.findings.length) },
    { label: currentLang === 'zh-TW' ? '\u6383\u63CF\u6642\u9577' : 'Duration', value: formatDuration(result.scanDuration) },
  ];
  console.log(statusPanel(
    currentLang === 'zh-TW' ? 'PANGUARD AI \u5B89\u5168\u72C0\u614B' : 'PANGUARD AI Security Status',
    statusItems,
  ));

  if (result.findings.length > 0) {
    console.log(divider(`${result.findings.length} ${currentLang === 'zh-TW' ? '\u500B\u554F\u984C' : 'Finding(s)'}`));
    console.log('');

    const columns: TableColumn[] = [
      { header: '#', key: 'num', width: 4, align: 'right' },
      { header: currentLang === 'zh-TW' ? '\u56B4\u91CD\u7A0B\u5EA6' : 'Severity', key: 'severity', width: 10 },
      { header: currentLang === 'zh-TW' ? '\u554F\u984C' : 'Finding', key: 'title', width: 42 },
    ];
    const rows = result.findings.map((f, i) => ({
      num: String(i + 1),
      severity: colorSeverity(f.severity),
      title: f.title,
    }));
    console.log(table(columns, rows));
  } else {
    console.log(box(
      `${symbols.pass} ${currentLang === 'zh-TW' ? '\u672A\u767C\u73FE\u5B89\u5168\u554F\u984C\uFF01' : 'No security issues found!'}`,
      { borderColor: c.safe, title: currentLang === 'zh-TW' ? '\u5B89\u5168' : 'All Clear' },
    ));
  }
}

// ---------------------------------------------------------------------------
// 2. Compliance Report
// ---------------------------------------------------------------------------

async function actionReport(): Promise<void> {
  console.log(banner());
  console.log(divider(currentLang === 'zh-TW' ? '\u5408\u898F\u5831\u544A / Compliance Report' : 'Compliance Report'));
  console.log('');

  const frameworkItems: MenuItem[] = [
    {
      key: '1',
      label: { 'zh-TW': 'ISO 27001', en: 'ISO 27001' },
      description: {
        'zh-TW': '\u570B\u969B\u8CC7\u8A0A\u5B89\u5168\u7BA1\u7406\u6A19\u6E96',
        en: 'International information security management',
      },
    },
    {
      key: '2',
      label: { 'zh-TW': 'SOC 2', en: 'SOC 2' },
      description: {
        'zh-TW': '\u670D\u52D9\u7D44\u7E54\u4FE1\u4EFB\u6E96\u5247',
        en: 'Service organization trust criteria',
      },
    },
    {
      key: '3',
      label: {
        'zh-TW': '\u8CC7\u901A\u5B89\u5168\u7BA1\u7406\u6CD5',
        en: 'TW Cyber Security Act',
      },
      description: {
        'zh-TW': '\u53F0\u7063\u8CC7\u901A\u5B89\u5168\u5408\u898F\u6A19\u6E96',
        en: 'Taiwan information security compliance',
      },
    },
  ];

  renderCompactMenu(
    { en: 'Select Framework', 'zh-TW': '\u9078\u64C7\u5408\u898F\u6846\u67B6' },
    frameworkItems,
    currentLang,
  );

  const fwChoice = await waitForChoice(frameworkItems, {
    backLabel: { en: 'Back', 'zh-TW': '\u8FD4\u56DE' },
    lang: currentLang,
  });
  if (!fwChoice || fwChoice.key.startsWith('__')) return;

  const frameworkMap: Record<string, string> = { '1': 'iso27001', '2': 'soc2', '3': 'tw_cyber_security_act' };
  const framework = frameworkMap[fwChoice.key] ?? 'iso27001';

  const langItems: MenuItem[] = [
    {
      key: '1',
      label: {
        'zh-TW': '\u7E41\u9AD4\u4E2D\u6587 (zh-TW)',
        en: 'Chinese (zh-TW)',
      },
      description: {
        'zh-TW': '\u7522\u751F\u4E2D\u6587\u5831\u544A',
        en: 'Generate report in Traditional Chinese',
      },
    },
    {
      key: '2',
      label: {
        'zh-TW': '\u82F1\u6587 (en)',
        en: 'English (en)',
      },
      description: {
        'zh-TW': '\u7522\u751F\u82F1\u6587\u5831\u544A',
        en: 'Generate report in English',
      },
    },
  ];

  console.log('');
  renderCompactMenu(
    { en: 'Report Language', 'zh-TW': '\u5831\u544A\u8A9E\u8A00' },
    langItems,
    currentLang,
  );
  const langChoice = await waitForChoice(langItems, {
    backLabel: { en: 'Back', 'zh-TW': '\u8FD4\u56DE' },
    lang: currentLang,
  });
  if (!langChoice || langChoice.key.startsWith('__')) return;

  const reportLang = langChoice.key === '1' ? 'zh-TW' : 'en';

  console.log('');
  const { executeCli } = await import('@openclaw/panguard-report');
  await executeCli(['generate', '--framework', framework, '--language', reportLang]);
}

// ---------------------------------------------------------------------------
// 3. Guard Engine
// ---------------------------------------------------------------------------

async function actionGuard(): Promise<void> {
  console.log(banner());
  console.log(divider(currentLang === 'zh-TW' ? '\u5B88\u8B77\u5F15\u64CE / Guard Engine' : 'Guard Engine'));
  console.log('');

  const items: MenuItem[] = [
    {
      key: '1',
      label: { 'zh-TW': '\u67E5\u770B\u72C0\u614B', en: 'Status' },
      description: {
        'zh-TW': '\u986F\u793A\u5B88\u8B77\u5F15\u64CE\u76EE\u524D\u72C0\u614B',
        en: 'Show guard engine status',
      },
    },
    {
      key: '2',
      label: { 'zh-TW': '\u555F\u52D5\u5F15\u64CE', en: 'Start' },
      description: {
        'zh-TW': '\u555F\u52D5\u5373\u6642\u76E3\u63A7\u8207\u9632\u8B77',
        en: 'Start the guard engine',
      },
    },
    {
      key: '3',
      label: { 'zh-TW': '\u505C\u6B62\u5F15\u64CE', en: 'Stop' },
      description: {
        'zh-TW': '\u505C\u6B62\u5B88\u8B77\u5F15\u64CE',
        en: 'Stop the guard engine',
      },
    },
    {
      key: '4',
      label: { 'zh-TW': '\u7522\u751F\u91D1\u9470', en: 'Generate Key' },
      description: {
        'zh-TW': '\u7522\u751F\u6E2C\u8A66\u7528 Pro \u6388\u6B0A\u91D1\u9470',
        en: 'Generate a test Pro license key',
      },
    },
  ];

  renderCompactMenu(
    { en: 'Guard Engine', 'zh-TW': '\u5B88\u8B77\u5F15\u64CE' },
    items,
    currentLang,
  );
  const choice = await waitForChoice(items, {
    backLabel: { en: 'Back', 'zh-TW': '\u8FD4\u56DE' },
    lang: currentLang,
  });
  if (!choice || choice.key.startsWith('__')) return;

  console.log('');
  const { runCLI } = await import('@openclaw/panguard-guard');

  switch (choice.key) {
    case '1': await runCLI(['status']); break;
    case '2': {
      if (!checkFeatureAccess('notifications')) {
        console.log(`  ${symbols.info} ${currentLang === 'zh-TW'
          ? '\u514D\u8CBB\u7248 Guard\uFF1A\u50C5\u555F\u7528 Layer 1 \u898F\u5247\u5F15\u64CE\u5075\u6E2C\u3002'
          : 'Free Guard: Layer 1 rule engine detection only.'}`);
        console.log(`  ${c.dim(currentLang === 'zh-TW'
          ? '\u5347\u7D1A\u5230 Solo ($9/\u6708) \u89E3\u9396\u5B8C\u6574\u4E09\u5C64\u9632\u79A6 + \u81EA\u52D5\u56DE\u61C9\u3002'
          : 'Upgrade to Solo ($9/mo) for full 3-layer defense + auto-response.')}`);
        console.log('');
      }
      await runCLI(['start']);
      break;
    }
    case '3': await runCLI(['stop']); break;
    case '4': await runCLI(['generate-key', 'pro']); break;
  }
}

// ---------------------------------------------------------------------------
// 4. Honeypot System
// ---------------------------------------------------------------------------

async function actionTrap(): Promise<void> {
  console.log(banner());
  console.log(divider(currentLang === 'zh-TW' ? '\u871C\u7F50\u7CFB\u7D71 / Honeypot System' : 'Honeypot System'));
  console.log('');

  const items: MenuItem[] = [
    {
      key: '1',
      label: { 'zh-TW': '\u57FA\u672C\u914D\u7F6E (SSH + HTTP)', en: 'Config (SSH + HTTP)' },
      description: {
        'zh-TW': '\u986F\u793A SSH \u548C HTTP \u871C\u7F50\u914D\u7F6E',
        en: 'Show SSH + HTTP honeypot configuration',
      },
    },
    {
      key: '2',
      label: { 'zh-TW': '\u5B8C\u6574\u914D\u7F6E (8 \u7A2E\u670D\u52D9)', en: 'Config (All 8 Services)' },
      description: {
        'zh-TW': '\u986F\u793A\u5168\u90E8 8 \u7A2E\u871C\u7F50\u670D\u52D9\u914D\u7F6E',
        en: 'Show all 8 honeypot service configurations',
      },
    },
    {
      key: '3',
      label: { 'zh-TW': '\u67E5\u770B\u72C0\u614B', en: 'Status' },
      description: {
        'zh-TW': '\u986F\u793A\u871C\u7F50\u7CFB\u7D71\u76EE\u524D\u72C0\u614B',
        en: 'Show honeypot system status',
      },
    },
    {
      key: '4',
      label: { 'zh-TW': '\u653B\u64CA\u8005\u5206\u6790', en: 'Attacker Profiles' },
      description: {
        'zh-TW': '\u986F\u793A\u653B\u64CA\u8005\u884C\u70BA\u5206\u6790\u5831\u544A',
        en: 'Show attacker behavior analysis profiles',
      },
    },
  ];

  renderCompactMenu(
    { en: 'Honeypot System', 'zh-TW': '\u871C\u7F50\u7CFB\u7D71' },
    items,
    currentLang,
  );
  const choice = await waitForChoice(items, {
    backLabel: { en: 'Back', 'zh-TW': '\u8FD4\u56DE' },
    lang: currentLang,
  });
  if (!choice || choice.key.startsWith('__')) return;

  console.log('');
  const { executeCli } = await import('@openclaw/panguard-trap');

  switch (choice.key) {
    case '1': await executeCli(['config', '--services', 'ssh,http']); break;
    case '2': await executeCli(['config', '--services', 'ssh,http,ftp,telnet,mysql,redis,smb,rdp']); break;
    case '3': await executeCli(['status']); break;
    case '4': await executeCli(['profiles']); break;
  }
}

// ---------------------------------------------------------------------------
// 5. Notifications
// ---------------------------------------------------------------------------

async function actionChat(): Promise<void> {
  console.log(banner());
  console.log(divider(currentLang === 'zh-TW' ? '\u901A\u77E5\u7CFB\u7D71 / Notifications' : 'Notifications'));
  console.log('');

  const items: MenuItem[] = [
    {
      key: '1',
      label: { 'zh-TW': '\u8A2D\u5B9A\u901A\u77E5', en: 'Setup' },
      description: {
        'zh-TW': '\u4E92\u52D5\u5F0F\u901A\u77E5\u7BA1\u9053\u8A2D\u5B9A',
        en: 'Interactive notification channel setup',
      },
    },
    {
      key: '2',
      label: { 'zh-TW': '\u67E5\u770B\u72C0\u614B', en: 'Status' },
      description: {
        'zh-TW': '\u986F\u793A\u901A\u77E5\u7BA1\u9053\u72C0\u614B',
        en: 'Show notification channel status',
      },
    },
    {
      key: '3',
      label: { 'zh-TW': '\u67E5\u770B\u914D\u7F6E', en: 'Config' },
      description: {
        'zh-TW': '\u986F\u793A\u76EE\u524D\u901A\u77E5\u914D\u7F6E',
        en: 'Show current notification configuration',
      },
    },
  ];

  renderCompactMenu(
    { en: 'Notifications', 'zh-TW': '\u901A\u77E5\u7CFB\u7D71' },
    items,
    currentLang,
  );
  const choice = await waitForChoice(items, {
    backLabel: { en: 'Back', 'zh-TW': '\u8FD4\u56DE' },
    lang: currentLang,
  });
  if (!choice || choice.key.startsWith('__')) return;

  console.log('');
  const { runCLI } = await import('@openclaw/panguard-chat');

  switch (choice.key) {
    case '1': await runCLI(['setup', '--lang', currentLang]); break;
    case '2': await runCLI(['status']); break;
    case '3': await runCLI(['config']); break;
  }
}

// ---------------------------------------------------------------------------
// 6. Threat Cloud
// ---------------------------------------------------------------------------

async function actionThreat(): Promise<void> {
  console.log(banner());
  console.log(divider(currentLang === 'zh-TW' ? '\u5A01\u8105\u60C5\u5831 / Threat Cloud' : 'Threat Cloud'));
  console.log('');

  console.log(`  ${symbols.info} ${currentLang === 'zh-TW'
    ? '\u5373\u5C07\u555F\u52D5\u5A01\u8105\u60C5\u5831 REST API \u4F3A\u670D\u5668 (port 8080)'
    : 'Starting Threat Cloud REST API server (port 8080)...'}`);
  console.log(`  ${c.dim(currentLang === 'zh-TW'
    ? '\u6309\u4EFB\u610F\u9375\u505C\u6B62\u4F3A\u670D\u5668\u4E26\u8FD4\u56DE\u9078\u55AE'
    : 'Press any key to stop the server and return to menu.')}`);
  console.log('');

  const { ThreatCloudServer } = await import('@openclaw/threat-cloud');
  const sp = spinner(currentLang === 'zh-TW'
    ? '\u6B63\u5728\u555F\u52D5 Threat Cloud API...'
    : 'Starting Threat Cloud API server...');

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
    sp.succeed(currentLang === 'zh-TW'
      ? 'Threat Cloud API \u4F3A\u670D\u5668\u5DF2\u555F\u52D5'
      : 'Threat Cloud API server started');

    console.log(statusPanel('PANGUARD AI Threat Cloud', [
      { label: 'URL', value: c.underline('http://127.0.0.1:8080') },
      { label: 'Health', value: c.sage('http://127.0.0.1:8080/health') },
      { label: 'API', value: c.sage('http://127.0.0.1:8080/api/stats') },
    ]));

    console.log(`  ${c.dim(currentLang === 'zh-TW'
      ? '\u4F3A\u670D\u5668\u904B\u884C\u4E2D\uFF0C\u6309\u4EFB\u610F\u9375\u505C\u6B62...'
      : 'Server running. Press any key to stop...')}`);

    await pressAnyKey(currentLang);
    await server.stop();
    console.log(`  ${symbols.pass} ${currentLang === 'zh-TW'
      ? 'Threat Cloud \u4F3A\u670D\u5668\u5DF2\u505C\u6B62'
      : 'Threat Cloud server stopped'}`);
  } catch (err) {
    sp.fail(`${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// 7. Auto Demo
// ---------------------------------------------------------------------------

async function actionDemo(): Promise<void> {
  const { runScan } = await import('@openclaw/panguard-scan');
  const { generateComplianceReport, generateSummaryText } = await import('@openclaw/panguard-report');

  console.log(banner());
  console.log(`  ${symbols.info} ${c.bold('Panguard AI - ' + (currentLang === 'zh-TW' ? '\u81EA\u52D5\u5C55\u793A' : 'Automated Demo'))}`);
  console.log(`  ${c.dim(currentLang === 'zh-TW'
    ? '\u6B63\u5728\u57F7\u884C\u6240\u6709\u5B89\u5168\u6A21\u7D44...'
    : 'Running through all security modules...')}`);
  console.log('');

  // 1. Security Scan
  console.log(divider(currentLang === 'zh-TW' ? '1. \u5B89\u5168\u6383\u63CF' : '1. Security Scan'));
  console.log('');

  const scanSp = spinner(currentLang === 'zh-TW'
    ? '\u6B63\u5728\u57F7\u884C\u5FEB\u901F\u5B89\u5168\u6383\u63CF...'
    : 'Running quick security scan...');
  try {
    const result = await runScan({ depth: 'quick', lang: currentLang, verbose: false });
    scanSp.succeed(`${currentLang === 'zh-TW' ? '\u6383\u63CF\u5B8C\u6210' : 'Scan complete'} ${c.dim(`(${formatDuration(result.scanDuration)})`)}`);

    const safetyScore = Math.max(0, 100 - result.riskScore);
    const grade = safetyScore >= 90 ? 'A' : safetyScore >= 75 ? 'B' : safetyScore >= 60 ? 'C' : safetyScore >= 40 ? 'D' : 'F';
    console.log(scoreDisplay(safetyScore, grade));

    console.log(statusPanel(currentLang === 'zh-TW' ? '\u6383\u63CF\u7D50\u679C' : 'Scan Results', [
      {
        label: currentLang === 'zh-TW' ? '\u98A8\u96AA\u5206\u6578' : 'Risk Score',
        value: `${result.riskScore}/100`,
        status: result.riskScore <= 25 ? 'safe' as const : result.riskScore <= 50 ? 'caution' as const : 'critical' as const,
      },
      {
        label: currentLang === 'zh-TW' ? '\u767C\u73FE\u554F\u984C' : 'Findings',
        value: String(result.findings.length),
        status: result.findings.length === 0 ? 'safe' as const : 'caution' as const,
      },
    ]));
  } catch (err) {
    scanSp.fail(`${err instanceof Error ? err.message : err}`);
  }

  // 2. Compliance Report
  console.log(divider(currentLang === 'zh-TW' ? '2. \u5408\u898F\u5831\u544A (ISO 27001)' : '2. Compliance Report (ISO 27001)'));
  console.log('');

  const reportSp = spinner(currentLang === 'zh-TW'
    ? '\u6B63\u5728\u7522\u751F ISO 27001 \u5408\u898F\u5831\u544A...'
    : 'Generating ISO 27001 compliance report...');
  try {
    const findings = [
      {
        findingId: 'DEMO-001',
        severity: 'high' as const,
        title: 'Missing information security policy',
        description: 'No formal information security policy document found.',
        category: 'policy',
        timestamp: new Date(),
        source: 'panguard-scan' as const,
      },
      {
        findingId: 'DEMO-002',
        severity: 'medium' as const,
        title: 'Unencrypted data at rest',
        description: 'Database storage does not use encryption at rest.',
        category: 'encryption',
        timestamp: new Date(),
        source: 'panguard-scan' as const,
      },
    ];

    const report = generateComplianceReport(findings, 'iso27001', 'en', {
      includeRecommendations: true,
    });
    const summary = generateSummaryText(report);
    reportSp.succeed(currentLang === 'zh-TW'
      ? 'ISO 27001 \u5831\u544A\u5DF2\u7522\u751F'
      : 'ISO 27001 report generated');

    const summaryLines = summary.split('\n').slice(0, 15);
    console.log('');
    for (const line of summaryLines) {
      console.log(`  ${c.dim(line)}`);
    }
    console.log(`  ${c.dim('...')}`);
    console.log('');
  } catch (err) {
    reportSp.fail(`${err instanceof Error ? err.message : err}`);
  }

  // 3. Guard Engine
  console.log(divider(currentLang === 'zh-TW' ? '3. \u5B88\u8B77\u5F15\u64CE' : '3. Guard Engine'));
  console.log('');

  try {
    const { runCLI: guardCLI } = await import('@openclaw/panguard-guard');
    await guardCLI(['status']);
  } catch {
    console.log(`  ${symbols.info} ${c.dim(currentLang === 'zh-TW'
      ? '\u5B88\u8B77\u5F15\u64CE: \u672A\u904B\u884C (\u5C55\u793A\u6B63\u5E38)'
      : 'Guard engine: not running (normal for demo)')}`);
  }
  console.log('');

  // 4. Honeypot
  console.log(divider(currentLang === 'zh-TW' ? '4. \u871C\u7F50\u7CFB\u7D71' : '4. Honeypot System'));
  console.log('');

  try {
    const { executeCli: trapCLI } = await import('@openclaw/panguard-trap');
    await trapCLI(['config', '--services', 'ssh,http']);
  } catch (err) {
    console.log(`  ${symbols.fail} ${err instanceof Error ? err.message : err}`);
  }
  console.log('');

  // 5. Notifications
  console.log(divider(currentLang === 'zh-TW' ? '5. \u901A\u77E5\u7CFB\u7D71' : '5. Notification System'));
  console.log('');

  try {
    const { runCLI: chatCLI } = await import('@openclaw/panguard-chat');
    await chatCLI(['status']);
  } catch {
    console.log(`  ${symbols.info} ${c.dim(currentLang === 'zh-TW'
      ? '\u901A\u77E5\u7CFB\u7D71: \u5C1A\u672A\u914D\u7F6E'
      : 'Notification system: not configured')}`);
  }
  console.log('');

  // Summary
  console.log(divider(currentLang === 'zh-TW' ? '\u5C55\u793A\u5B8C\u6210' : 'Demo Complete'));
  console.log('');

  console.log(statusPanel('PANGUARD AI - ' + (currentLang === 'zh-TW' ? '\u5C55\u793A\u6458\u8981' : 'Demo Summary'), [
    { label: currentLang === 'zh-TW' ? '\u5B89\u5168\u6383\u63CF' : 'Security Scan', value: c.safe('OK'), status: 'safe' },
    { label: currentLang === 'zh-TW' ? '\u5408\u898F\u5831\u544A' : 'Compliance Report', value: c.safe('OK'), status: 'safe' },
    { label: currentLang === 'zh-TW' ? '\u5B88\u8B77\u5F15\u64CE' : 'Guard Engine', value: c.safe('OK'), status: 'safe' },
    { label: currentLang === 'zh-TW' ? '\u871C\u7F50\u7CFB\u7D71' : 'Honeypot System', value: c.safe('OK'), status: 'safe' },
    { label: currentLang === 'zh-TW' ? '\u901A\u77E5\u7CFB\u7D71' : 'Notification System', value: c.safe('OK'), status: 'safe' },
  ]));
}
