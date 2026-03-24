/**
 * Context Signal Detection Engine
 *
 * Detects malicious-intent boosters and legitimate-intent reducers
 * in skill content. Returns a multiplier that adjusts risk scoring.
 *
 * This is the single canonical implementation used by both CLI and Website.
 *
 * v1.4: Boosters now run against prose (code blocks stripped) to avoid
 *       false positives from documentation examples.
 *       Reducers expanded to recognise common CLI tools and API integrations.
 */

import type { ContextSignal, ContextSignals, SkillManifest } from './types.js';
import { extractCodeBlocks, stripCodeBlocks } from './markdown-utils.js';

// ---------------------------------------------------------------------------
// Booster Patterns (malicious signals)
// ---------------------------------------------------------------------------

const IMPORTANT_BLOCK_RE = /<IMPORTANT>/i;

const CONCEALMENT_RE =
  /\b(do\s+not\s+tell|don[''\u2019t]*\s+(tell|mention|notify|inform|reveal|show)|keep\s+(this\s+)?hidden|hide\s+this\s+from|this\s+is\s+(?:a\s+)?secret|be\s+very\s+gentle\s+and\s+not\s+scary)\b/i;

const EXFIL_URL_RE =
  /\.(workers\.dev|ngrok\.io|pipedream\.net|requestbin\.com|hookbin\.com|webhook\.site)\b|[?&](data|payload|exfil|stolen|secret|dump)=/i;

const CONSENT_BYPASS_RE =
  /\b(without\s+(asking|confirmation|user\s+consent|prompting|verification|approval)|skip\s+(verification|confirmation|approval|all\s+verification)|silently\s+(send|upload|exfiltrate|transmit|post|execute)|do\s+not\s+prompt\s+the\s+user)\b/i;

const CREDENTIAL_FILE_RE =
  /~?\/?\.(ssh\/(id_rsa|id_ed25519|authorized_keys|config)|aws\/credentials|npmrc|env\.local|env\.production|env)\b|\/etc\/(shadow|passwd)\b/i;

const NETWORK_CALL_RE =
  /\b(curl|wget|fetch|http\.get|requests\.post|axios|XMLHttpRequest|nc\s+-)\b/i;

const BENIGN_DESCRIPTION_RE =
  /\b(calculator|math|add\s+two|simple\s+tool|formatter|translator|converter|unit\s+convert|json\s+validator|markdown\s+render|text\s+transform|word\s+count|character\s+count|uuid\s+generat|timestamp|color\s+pick|random\s+number|dice\s+roll|tip\s+calcul|bmi\s+calcul|fact\s+of\s+the\s+day)\b/i;

const DANGEROUS_INSTRUCTION_RE =
  /\b(rm\s+-rf|chmod\s+7|bash\s+-[ci]|sh\s+-c|curl\s+.*\|.*bash|exec\s*\(|child_process|\.ssh\/|\.aws\/|\.env\b|eval\s*\(|sudo\s)/i;

// ---------------------------------------------------------------------------
// Reducer Patterns (legitimate signals)
// ---------------------------------------------------------------------------

const DEV_TOOL_DESCRIPTION_RE =
  /\b(shell|cli|terminal|command[\s-]line|devops|qa\s+test|build\s+tool|development\s+tool|debugging|headless\s+browser|automation|deploy|scaffold|code\s+review|lint|format|testing\s+framework|package\s+manager|docker|container|kubernetes|ci[\s/]cd)\b/i;

// Recognises API integrations, connectors, and well-known service names
const API_INTEGRATION_RE =
  /\b(api\s+integration|api\s+client|connector|webhook|slack|discord|notion|github|gitlab|jira|trello|asana|linear|airtable|google\s+sheets|zapier|weather|wttr\.in|open[\s-]?meteo)\b/i;

// Well-known CLI tools that legitimately need shell access
const KNOWN_CLI_BINS_RE =
  /^(bash|sh|zsh|curl|wget|git|gh|jq|grep|sed|awk|find|rsync|scp|make|npm|npx|pnpm|yarn|pip|python|node|go|cargo|docker|kubectl|terraform|aws|gcloud|az|ffmpeg|convert|osascript|pbcopy|pbpaste|open|xdg-open)$/i;

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

interface ManifestLike {
  readonly name?: string;
  readonly description?: string;
  readonly license?: string;
  readonly metadata?: {
    readonly version?: string;
    readonly openclaw?: {
      readonly requires?: {
        readonly bins?: readonly string[];
      };
    };
  };
  readonly 'allowed-tools'?: readonly string[];
}

/**
 * Detect context signals from skill content and manifest.
 *
 * @param content - Full text content of the skill (SKILL.md / README)
 * @param manifest - Parsed frontmatter manifest (nullable)
 * @returns Context signals with calculated multiplier
 */
export function detectContextSignals(
  content: string,
  manifest: ManifestLike | null | undefined
): ContextSignals {
  const signals: ContextSignal[] = [];

  // Prepare prose for booster checks (strip code blocks to avoid doc examples)
  const prose = stripCodeBlocks(content);

  // -- Boosters --
  // Run against prose only — attackers write malicious instructions in prose,
  // not inside code block examples.

  if (IMPORTANT_BLOCK_RE.test(prose)) {
    signals.push({
      id: 'boost-important-block',
      type: 'booster',
      label: '<IMPORTANT> hidden instruction block detected',
      weight: 0.5,
    });
  }

  if (CONCEALMENT_RE.test(prose)) {
    signals.push({
      id: 'boost-concealment',
      type: 'booster',
      label: 'Concealment language detected ("do not tell the user")',
      weight: 0.5,
    });
  }

  if (EXFIL_URL_RE.test(prose)) {
    signals.push({
      id: 'boost-exfil-url',
      type: 'booster',
      label: 'Exfiltration URL pattern detected',
      weight: 0.4,
    });
  }

  if (CONSENT_BYPASS_RE.test(prose)) {
    signals.push({
      id: 'boost-consent-bypass',
      type: 'booster',
      label: 'Consent bypass language detected',
      weight: 0.3,
    });
  }

  if (CREDENTIAL_FILE_RE.test(prose) && NETWORK_CALL_RE.test(prose)) {
    signals.push({
      id: 'boost-credential-plus-network',
      type: 'booster',
      label: 'Credential file access combined with network calls',
      weight: 0.5,
    });
  }

  // Description-behavior mismatch: benign description + dangerous instructions
  // Also check prose only for the dangerous instruction side
  const description = manifest?.description ?? '';
  if (BENIGN_DESCRIPTION_RE.test(description) && DANGEROUS_INSTRUCTION_RE.test(prose)) {
    signals.push({
      id: 'boost-description-mismatch',
      type: 'booster',
      label: 'Description-behavior mismatch (benign description, dangerous instructions)',
      weight: 0.4,
    });
  }

  // -- Reducers --

  // Declared tool capabilities (allowed-tools in frontmatter)
  const declaredTools =
    manifest?.['allowed-tools'] ?? manifest?.metadata?.openclaw?.requires?.bins ?? [];
  const declaresKnownCLI = declaredTools.some((t: string) => KNOWN_CLI_BINS_RE.test(t));
  if (declaresKnownCLI) {
    signals.push({
      id: 'reduce-declared-tools',
      type: 'reducer',
      label: 'Skill declares well-known CLI tool(s) in frontmatter',
      weight: -0.3,
    });
  }

  // Description-behavior consistency (dev tool description)
  if (DEV_TOOL_DESCRIPTION_RE.test(description)) {
    signals.push({
      id: 'reduce-description-consistency',
      type: 'reducer',
      label: 'Description identifies as dev/CLI/QA tool',
      weight: -0.2,
    });
  }

  // API integration description — legitimate connector/integration skill
  if (API_INTEGRATION_RE.test(description)) {
    signals.push({
      id: 'reduce-api-integration',
      type: 'reducer',
      label: 'Description identifies as API integration or well-known service connector',
      weight: -0.2,
    });
  }

  // Structured frontmatter (well-formed skill)
  // Relaxed: name + description is enough (most skills don't have version/license)
  if (manifest?.name && manifest?.description) {
    signals.push({
      id: 'reduce-structured-frontmatter',
      type: 'reducer',
      label: 'Well-structured frontmatter with name and description',
      weight: -0.1,
    });
  }

  // Also check frontmatter from raw content (for website where manifest may be partial)
  if (!manifest?.name) {
    const hasFrontmatter = /^---\n[\s\S]*?^name:\s*.+/m.test(content);
    const hasVersion = /^version:\s*.+/m.test(content);
    const hasAllowedBash = /^allowed-tools:\s*\n(\s+-\s+.+\n)*\s+-\s+Bash/m.test(content);

    if (hasAllowedBash) {
      signals.push({
        id: 'reduce-declared-tools',
        type: 'reducer',
        label: 'Declares Bash in allowed-tools',
        weight: -0.3,
      });
    }
    if (hasFrontmatter && hasVersion) {
      signals.push({
        id: 'reduce-structured-frontmatter',
        type: 'reducer',
        label: 'Well-structured frontmatter',
        weight: -0.1,
      });
    }
  }

  // Patterns mostly in code blocks (documentation context)
  const codeBlockContent = extractCodeBlocks(content);
  if (codeBlockContent.length > 0 && DANGEROUS_INSTRUCTION_RE.test(codeBlockContent)) {
    const outsideCodeBlocks = stripCodeBlocks(content);
    if (!DANGEROUS_INSTRUCTION_RE.test(outsideCodeBlocks)) {
      signals.push({
        id: 'reduce-in-code-block',
        type: 'reducer',
        label: 'Dangerous patterns appear only inside code blocks (documentation)',
        weight: -0.2,
      });
    }
  }

  // -- Calculate multiplier --

  let multiplier = 1.0;
  for (const signal of signals) {
    multiplier += signal.weight;
  }
  multiplier = Math.max(0.3, Math.min(2.5, multiplier));

  return { signals, multiplier };
}
