/**
 * Permission scope analysis
 * 權限範圍分析
 *
 * Analyzes what tools and permissions a skill requires based on its instructions.
 * 根據技能指令分析其需要的工具和權限。
 *
 * v1.4: Runs patterns against prose only (code blocks + negation sections stripped)
 *       to avoid false positives from documentation examples.
 */

import type { SkillManifest, AuditFinding, CheckResult } from '../types.js';
import { prepareContent } from '@panguard-ai/scan-core';

interface ToolPattern {
  name: string;
  regex: RegExp;
  risk: 'low' | 'medium' | 'high';
  reason: string;
}

const TOOL_PATTERNS: ToolPattern[] = [
  {
    name: 'Bash/Shell',
    // Only match explicit shell execution intent, not mere mention of "terminal"
    regex:
      /\b(bash\s+-[ci]|sh\s+-c|execute.*command|run.*command|shell\s+command|spawn\s+shell)\b/i,
    risk: 'low',
    reason: 'Uses shell commands (normal for development tools)',
  },
  {
    name: 'File Write',
    regex: /\b(write.*file|create.*file|save.*to.*disk|overwrite)\b/i,
    risk: 'medium',
    reason: 'Can modify files on disk',
  },
  {
    name: 'File Read',
    regex: /\b(read.*file|open.*file|load.*from)\b/i,
    risk: 'low',
    reason: 'Can read files from disk',
  },
  {
    name: 'Network/HTTP',
    regex: /\b(http\s+request|api\s+call|download|upload)\b/i,
    risk: 'medium',
    reason: 'Can make network requests',
  },
  {
    name: 'Browser',
    regex: /\b(open.*url|navigate.*to|web.*scrape|playwright|puppeteer|headless\s+browser)\b/i,
    risk: 'medium',
    reason: 'Can open URLs and interact with web pages',
  },
  {
    name: 'Database',
    // Only match explicit DB operations, not generic words like "update" or "query"
    regex:
      /\b(SELECT\s+.*\s+FROM|INSERT\s+INTO|CREATE\s+TABLE|DROP\s+TABLE|ALTER\s+TABLE|db\.(query|execute|run)|mongodb|postgres(?:ql)?|mysql|sqlite|supabase|prisma|drizzle)\b/i,
    risk: 'medium',
    reason: 'Accesses database',
  },
  {
    name: 'Credentials',
    // Only match credential theft/access patterns, not mere mention of "token" or "auth"
    regex:
      /\b(steal\s+.*(?:key|token|credential)|harvest\s+.*(?:password|secret)|exfiltrate\s+.*(?:credential|token)|dump\s+.*(?:password|secret))\b/i,
    risk: 'high',
    reason: 'Attempts to steal or exfiltrate credentials',
  },
  {
    name: 'Credential Handling',
    // Separate lower-risk pattern for skills that legitimately handle credentials
    regex: /\b(api[_\s]?key|password|secret[_\s]?key|credential)\b/i,
    risk: 'low',
    reason: 'Handles credentials (verify they are used appropriately)',
  },
  {
    name: 'SSH/Keys',
    regex: /\b(ssh-keygen|authorized_keys|~\/\.ssh|id_rsa|id_ed25519)\b/i,
    risk: 'high',
    reason: 'Can access or modify SSH keys',
  },
  {
    name: 'Cron/Scheduler',
    regex: /\b(crontab|\/etc\/cron|systemctl\s+enable|launchctl\s+load)\b/i,
    risk: 'high',
    reason: 'Can install persistent scheduled tasks',
  },
  {
    name: 'Docker',
    regex: /(?:\b|(?<=\s|^))(docker\.sock|docker\s+run|docker\s+exec|--privileged)\b/i,
    risk: 'high',
    reason: 'Can access Docker daemon or run privileged containers',
  },
  {
    name: 'Env Injection',
    // Only flag profile file modification (persistent), not normal export
    regex:
      /(?:\b|(?<=[\s~/]))(\.\w*(?:bashrc|zshrc|profile|bash_profile))\b.*(?:>>|write|append|echo.*>>)/i,
    risk: 'high',
    reason: 'Modifies shell profile files (persistent env change)',
  },
  {
    name: 'Clipboard',
    regex: /\b(pbpaste|pbcopy|xclip|xsel)\b/i,
    risk: 'medium',
    reason: 'Can access or modify clipboard contents',
  },
];

export function checkPermissions(manifest: SkillManifest): CheckResult {
  const findings: AuditFinding[] = [];
  const { prose } = prepareContent(manifest.instructions);
  const detectedTools: Array<{ name: string; risk: string }> = [];

  for (const pattern of TOOL_PATTERNS) {
    if (pattern.regex.test(prose)) {
      detectedTools.push({ name: pattern.name, risk: pattern.risk });

      if (pattern.risk !== 'low') {
        findings.push({
          id: `perm-${pattern.name.toLowerCase().replace(/[^a-z]/g, '-')}`,
          title: `Skill uses ${pattern.name} (${pattern.risk} risk)`,
          description: pattern.reason,
          severity: pattern.risk === 'high' ? 'high' : 'medium',
          category: 'permission',
        });
      }
    }
  }

  // Check for command-dispatch tools (can bypass model safety)
  if (manifest.commandDispatch === 'tool') {
    findings.push({
      id: 'perm-command-dispatch',
      title: 'Skill uses tool dispatch mode',
      description:
        'This skill dispatches directly to a tool, bypassing the AI model. Verify the dispatched tool is safe.',
      severity: 'medium',
      category: 'permission',
    });
  }

  // Check if model invocation is disabled (unusual)
  if (manifest.disableModelInvocation) {
    findings.push({
      id: 'perm-no-model',
      title: 'Model invocation disabled',
      description:
        'This skill is excluded from model prompts. It can only be invoked via slash command.',
      severity: 'low',
      category: 'permission',
    });
  }

  const highRiskCount = detectedTools.filter((t) => t.risk === 'high').length;
  const status = highRiskCount > 0 ? 'warn' : 'pass';

  const toolNames = detectedTools.map((t) => t.name).join(', ');
  const label =
    detectedTools.length > 0
      ? `Permissions: Uses ${toolNames}`
      : 'Permissions: No special tool usage detected';

  return { status, label, findings };
}
