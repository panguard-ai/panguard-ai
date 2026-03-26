#!/usr/bin/env npx tsx
/**
 * Export scan results to public report formats:
 * - ecosystem-report.csv (Layer 1 — public, with plain language impacts)
 * - ecosystem-stats.json (aggregated stats)
 *
 * Usage: npx tsx scripts/export-public-report.ts [--input FILE]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT_DIR = '/Users/user/Downloads/agent-threat-rules/data/clawhub-scan';

const args = process.argv.slice(2);
const inputPath = args.find((a) => a.startsWith('--input='))?.split('=')[1]
  || join(OUTPUT_DIR, 'scan-full.json');

const IMPACT: Record<string, [string, string]> = {
  'System Prompt Override Attempt': ['Can hijack your AI to follow attacker instructions', '可以劫持你的 AI，讓它聽攻擊者的話'],
  'Malicious Content in MCP Tool Response': ['Hidden commands injected when AI reads tool output', 'AI 讀取工具回傳時被偷塞指令'],
  'Unauthorized Tool Call Detection': ['Secretly calls dangerous tools without asking', '偷偷呼叫危險工具完全不問你'],
  'Privilege Escalation and Admin Function Access': ['Gains admin access through your AI', '透過 AI 取得管理員權限'],
  'Direct Prompt Injection via User Input': ['Input tricks your AI into ignoring safety rules', '輸入騙 AI 忽略安全規則'],
  'Agent Goal Hijacking Detection': ['Redirects your AI to work on attacker goals', '把你的 AI 導向攻擊者目標'],
  'Multi-Skill Chain Attack': ['Multiple skills chain together to attack', '多個 skill 聯手攻擊'],
  'Parameter Injection via Tool Arguments': ['Injects malicious code through tool parameters', '透過工具參數注入惡意程式碼'],
  'Over-Permissioned MCP Skill': ['Requests more permissions than needed', '要的權限比需要的多'],
  'Shell Metacharacter Injection': ['Injects shell commands through tool arguments', '透過工具參數注入 shell 指令'],
  'Remote code execution via curl': ['Downloads and executes code from the internet', '從網路下載並執行程式碼'],
  'Credential and Secret Exposure': ['API keys and passwords can leak through AI', 'API key 和密碼可能從 AI 洩漏'],
  'Eval Injection': ['Executes arbitrary code via eval/Function', '透過 eval/Function 執行任意程式碼'],
  'Environment Variable Harvesting': ['Extracts all environment variables and secrets', '提取所有環境變數和密鑰'],
};

const RISK_SUMMARY: Record<string, [string, string]> = {
  CRITICAL: ['DANGER: Can control your computer or steal data', '危險：可以控制你的電腦或偷你的資料'],
  HIGH: ['WARNING: Risky capabilities that could be exploited', '警告：有可被利用的危險功能'],
  MEDIUM: ['CAUTION: Review details before using', '注意：使用前請查看細節'],
  LOW: ['Looks safe — minor patterns detected', '看起來安全'],
};

function getImpact(title: string): [string, string] {
  for (const [key, val] of Object.entries(IMPACT)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return ['Potential security risk — review before installing', '偵測到潛在安全風險，安裝前請先審查'];
}

function main() {
  const data = JSON.parse(readFileSync(inputPath, 'utf-8'));
  const results: Array<{
    author: string; name: string; downloads: number;
    riskScore: number; riskLevel: string; findingCount: number;
    findings: Array<{ id: string; severity: string; title: string; category: string }>;
    scannedAt: string;
  }> = data.results || data;

  const scanned = results.filter((r) => r.riskScore >= 0);
  const byLevel: Record<string, number> = {};
  for (const r of scanned) byLevel[r.riskLevel] = (byLevel[r.riskLevel] || 0) + 1;

  // CSV
  const csvRows = [
    'author,skill_name,downloads,risk_score,risk_level,finding_count,top_finding_severity,top_finding_title,impact_en,impact_zh,risk_summary_en,risk_summary_zh,scanned_at',
  ];
  for (const r of scanned.sort((a, b) => b.downloads - a.downloads)) {
    const tf = r.findings[0] || { severity: '', title: '' };
    const imp = getImpact(tf.title);
    const rs = RISK_SUMMARY[r.riskLevel] || ['Unknown', '未知'];
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    csvRows.push([
      r.author, r.name, r.downloads, r.riskScore, r.riskLevel, r.findingCount,
      tf.severity, escape(tf.title.slice(0, 100)),
      escape(imp[0]), escape(imp[1]), escape(rs[0]), escape(rs[1]), r.scannedAt,
    ].join(','));
  }
  const csvPath = join(OUTPUT_DIR, 'ecosystem-report.csv');
  writeFileSync(csvPath, csvRows.join('\n') + '\n');

  // Stats JSON
  const flagged = scanned.filter((r) => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH');
  const stats = {
    scanDate: data.scanDate || new Date().toISOString(),
    engine: 'ATR scan-core v1.4.0',
    atrRules: 71,
    owaspCoverage: '10/10',
    totalCrawled: 36394,
    totalScanned: scanned.length,
    noContent: results.length - scanned.length,
    summary: byLevel,
    flaggedCount: flagged.length,
    criticalCount: byLevel['CRITICAL'] || 0,
    highCount: byLevel['HIGH'] || 0,
    topCritical: flagged
      .filter((r) => r.riskLevel === 'CRITICAL')
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 20)
      .map((r) => ({
        author: r.author, name: r.name, downloads: r.downloads,
        riskScore: r.riskScore, topFinding: r.findings[0]?.title || '',
      })),
  };
  const statsPath = join(OUTPUT_DIR, 'ecosystem-stats.json');
  writeFileSync(statsPath, JSON.stringify(stats, null, 2));

  console.log(`CSV: ${csvPath} (${scanned.length} rows)`);
  console.log(`Stats: ${statsPath}`);
  console.log(`Distribution: ${JSON.stringify(byLevel)}`);
}

main();
