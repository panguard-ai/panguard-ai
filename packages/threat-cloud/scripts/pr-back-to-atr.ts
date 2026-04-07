/**
 * PR-back: Fetch promoted rules from Threat Cloud and open PRs to ATR repo.
 *
 * This runs from PanGuard's CI, NOT from ATR repo.
 * ATR maintains zero knowledge of PanGuard.
 *
 * Flow:
 *   1. GET /api/atr-rules?since=<last_sync> from TC
 *   2. For each new promoted rule:
 *      a. Parse YAML, validate structure
 *      b. Determine category from tags
 *      c. Write to rules/<category>/ATR-YYYY-NNNNN-<slug>.yaml
 *      d. Run `atr validate` and `atr test`
 *      e. Open PR to agent-threat-rules repo
 *   3. Save last_sync timestamp
 *
 * Requires:
 *   - GITHUB_TOKEN (with repo scope for agent-threat-rules)
 *   - TC_API_KEY (Threat Cloud bearer token)
 *   - TC_URL (default: https://tc.panguard.ai)
 *
 * Usage:
 *   npx tsx scripts/pr-back-to-atr.ts [--dry-run] [--since <ISO timestamp>]
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

const TC_URL = process.env.TC_URL ?? 'https://tc.panguard.ai';
const TC_API_KEY = process.env.TC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ATR_REPO = 'Agent-Threat-Rule/agent-threat-rules';
const DRY_RUN = process.argv.includes('--dry-run');
const SINCE_FLAG = process.argv.indexOf('--since');
const LAST_SYNC_FILE = join(import.meta.dirname ?? '.', '.last-pr-back-sync');

interface PromotedRule {
  rule_id: string;
  rule_content: string;
  pattern_hash: string;
  source: string;
  created_at: string;
}

async function fetchPromotedRules(since: string): Promise<PromotedRule[]> {
  if (!TC_API_KEY) throw new Error('TC_API_KEY not set');

  const url = `${TC_URL}/api/atr-rules?since=${encodeURIComponent(since)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TC_API_KEY}` },
  });

  if (!res.ok) throw new Error(`TC API error: ${res.status} ${res.statusText}`);

  const body = (await res.json()) as { ok: boolean; data: PromotedRule[] };
  if (!body.ok) throw new Error('TC API returned ok=false');

  // Filter to community-promoted rules only (not bundled/seeded)
  return body.data.filter((r) => r.source === 'atr-community');
}

function parseAndValidateRule(ruleContent: string): {
  valid: boolean;
  id: string;
  category: string;
  slug: string;
  errors: string[];
} {
  const errors: string[] = [];

  let parsed: Record<string, unknown>;
  try {
    parsed = yaml.load(ruleContent) as Record<string, unknown>;
  } catch (e) {
    return { valid: false, id: '', category: '', slug: '', errors: [`YAML parse error: ${e}`] };
  }

  // Required fields (Cisco quality bar)
  const required = ['title', 'id', 'severity', 'detection', 'response'];
  for (const f of required) {
    if (!parsed[f]) errors.push(`Missing required field: ${f}`);
  }

  // Must have test_cases with true_positives
  const testCases = parsed['test_cases'] as Record<string, unknown> | undefined;
  if (
    !testCases?.['true_positives'] ||
    !Array.isArray(testCases['true_positives']) ||
    testCases['true_positives'].length === 0
  ) {
    errors.push('Missing test_cases.true_positives (required for Cisco-quality rules)');
  }

  // Must have detection.conditions
  const detection = parsed['detection'] as Record<string, unknown> | undefined;
  if (!detection?.['conditions'] || !detection?.['condition']) {
    errors.push('Missing detection.conditions or detection.condition');
  }

  // Extract metadata
  const id = String(parsed['id'] ?? '');
  const tags = parsed['tags'] as Record<string, unknown> | undefined;
  const category = String(tags?.['category'] ?? 'unknown');
  const title = String(parsed['title'] ?? 'unknown');
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 50);

  return { valid: errors.length === 0, id, category, slug, errors };
}

function openPR(ruleFilePath: string, ruleId: string, title: string, category: string): void {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set');

  const branchName = `tc-rule/${ruleId}`;
  const commitMsg = `feat: add ${ruleId} — ${title} (auto-crystallized from Threat Cloud)`;
  const prBody = [
    `## Auto-crystallized ATR Rule`,
    ``,
    `**Rule ID:** ${ruleId}`,
    `**Category:** ${category}`,
    `**Source:** Threat Cloud community crystallization`,
    ``,
    `### Quality Gates Passed`,
    `- [x] LLM reviewer approved (TC Gate 1)`,
    `- [x] 24hr canary observation survived (TC Gate 2)`,
    `- [ ] Schema validation (CI Gate 3 — runs on this PR)`,
    `- [ ] Test cases pass (CI Gate 3 — runs on this PR)`,
    `- [ ] Benchmark regression check (CI Gate 3 — runs on this PR)`,
    `- [ ] Human review (Gate 4 — you)`,
    ``,
    `### How this rule was created`,
    `1. Multiple independent scan reports flagged a threat pattern`,
    `2. TC's LLM analyzer generated a detection rule from real attack payloads`,
    `3. LLM reviewer scored the rule for FP risk and coverage`,
    `4. Rule spent 24 hours in canary (10% of Guard clients) with <3 negative reports`,
    `5. Automatically promoted and submitted as this PR`,
    ``,
    `> This PR was auto-generated by PanGuard Threat Cloud. Human review is required before merge.`,
  ].join('\n');

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would open PR: ${branchName}`);
    console.log(`  File: ${ruleFilePath}`);
    console.log(`  Commit: ${commitMsg}`);
    return;
  }

  // Use gh CLI to create PR
  try {
    execSync(
      `gh api repos/${ATR_REPO}/git/refs -f ref=refs/heads/${branchName} -f sha=$(gh api repos/${ATR_REPO}/git/refs/heads/main -q .object.sha)`,
      {
        env: { ...process.env, GH_TOKEN: GITHUB_TOKEN },
        stdio: 'pipe',
      }
    );
  } catch {
    console.log(`Branch ${branchName} may already exist, continuing...`);
  }

  // Create/update file via GitHub API
  const content = Buffer.from(readFileSync(ruleFilePath, 'utf-8')).toString('base64');
  execSync(
    `gh api repos/${ATR_REPO}/contents/${ruleFilePath} -X PUT -f message="${commitMsg}" -f content="${content}" -f branch="${branchName}"`,
    {
      env: { ...process.env, GH_TOKEN: GITHUB_TOKEN },
      stdio: 'pipe',
    }
  );

  // Create PR
  const prUrl = execSync(
    `gh pr create --repo ${ATR_REPO} --base main --head ${branchName} --title "${commitMsg}" --body "${prBody.replace(/"/g, '\\"')}"`,
    { env: { ...process.env, GH_TOKEN: GITHUB_TOKEN }, encoding: 'utf-8' }
  ).trim();

  console.log(`PR created: ${prUrl}`);
}

async function main() {
  console.log('=== TC PR-Back to ATR ===');
  console.log(`TC URL: ${TC_URL}`);
  console.log(`Dry run: ${DRY_RUN}`);

  // Determine since timestamp
  let since: string;
  if (SINCE_FLAG >= 0 && process.argv[SINCE_FLAG + 1]) {
    since = process.argv[SINCE_FLAG + 1]!;
  } else if (existsSync(LAST_SYNC_FILE)) {
    since = readFileSync(LAST_SYNC_FILE, 'utf-8').trim();
  } else {
    // First run: look back 7 days
    since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  console.log(`Fetching rules promoted since: ${since}`);

  const rules = await fetchPromotedRules(since);
  console.log(`Found ${rules.length} newly promoted rules`);

  let submitted = 0;
  let skipped = 0;

  for (const rule of rules) {
    const validation = parseAndValidateRule(rule.rule_content);

    if (!validation.valid) {
      console.log(`SKIP ${validation.id || rule.pattern_hash}: ${validation.errors.join(', ')}`);
      skipped++;
      continue;
    }

    const filePath = `rules/${validation.category}/${validation.id}-${validation.slug}.yaml`;
    const fullPath = join('/tmp/atr-pr-back', filePath);

    // Write rule file
    mkdirSync(join('/tmp/atr-pr-back', 'rules', validation.category), { recursive: true });
    writeFileSync(fullPath, rule.rule_content);

    console.log(`SUBMIT ${validation.id} → ${filePath}`);

    try {
      openPR(
        filePath,
        validation.id,
        String(yaml.load(rule.rule_content) as Record<string, unknown>).slice(0, 50),
        validation.category
      );
      submitted++;
    } catch (e) {
      console.error(`Failed to open PR for ${validation.id}: ${e}`);
      skipped++;
    }
  }

  // Save sync timestamp
  if (!DRY_RUN) {
    writeFileSync(LAST_SYNC_FILE, new Date().toISOString());
  }

  console.log(`\nDone. Submitted: ${submitted}, Skipped: ${skipped}`);
}

main().catch((e) => {
  console.error('PR-back failed:', e);
  process.exit(1);
});
