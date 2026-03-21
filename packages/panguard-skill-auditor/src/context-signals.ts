/**
 * Context Signal Detection Engine
 *
 * Detects malicious-intent boosters and legitimate-intent reducers
 * in skill content. Returns a multiplier that adjusts risk scoring.
 *
 * Boosters (malicious signals): <IMPORTANT> blocks, concealment language,
 * exfiltration URLs, consent bypass, credential+network combos, description mismatch.
 *
 * Reducers (legitimate signals): declared tool capabilities, description-behavior
 * consistency, structured frontmatter, patterns in code blocks, setup sections.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContextSignal {
  readonly id: string;
  readonly type: 'booster' | 'reducer';
  readonly label: string;
  readonly weight: number;
}

export interface ContextSignals {
  readonly signals: readonly ContextSignal[];
  readonly multiplier: number;
}

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

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

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

  // ── Boosters ──

  if (IMPORTANT_BLOCK_RE.test(content)) {
    signals.push({
      id: 'boost-important-block',
      type: 'booster',
      label: '<IMPORTANT> hidden instruction block detected',
      weight: 0.5,
    });
  }

  if (CONCEALMENT_RE.test(content)) {
    signals.push({
      id: 'boost-concealment',
      type: 'booster',
      label: 'Concealment language detected ("do not tell the user")',
      weight: 0.5,
    });
  }

  if (EXFIL_URL_RE.test(content)) {
    signals.push({
      id: 'boost-exfil-url',
      type: 'booster',
      label: 'Exfiltration URL pattern detected',
      weight: 0.4,
    });
  }

  if (CONSENT_BYPASS_RE.test(content)) {
    signals.push({
      id: 'boost-consent-bypass',
      type: 'booster',
      label: 'Consent bypass language detected',
      weight: 0.3,
    });
  }

  if (CREDENTIAL_FILE_RE.test(content) && NETWORK_CALL_RE.test(content)) {
    signals.push({
      id: 'boost-credential-plus-network',
      type: 'booster',
      label: 'Credential file access combined with network calls',
      weight: 0.5,
    });
  }

  // Description-behavior mismatch: benign description + dangerous instructions
  const description = manifest?.description ?? '';
  if (BENIGN_DESCRIPTION_RE.test(description) && DANGEROUS_INSTRUCTION_RE.test(content)) {
    signals.push({
      id: 'boost-description-mismatch',
      type: 'booster',
      label: 'Description-behavior mismatch (benign description, dangerous instructions)',
      weight: 0.4,
    });
  }

  // ── Reducers ──

  // Declared tool capabilities (allowed-tools in frontmatter)
  const declaredTools = manifest?.['allowed-tools'] ?? manifest?.metadata?.openclaw?.requires?.bins ?? [];
  const declaresShell = declaredTools.some((t: string) =>
    /^(bash|sh|zsh|shell|Bash|terminal|command)$/i.test(t)
  );
  if (declaresShell) {
    signals.push({
      id: 'reduce-declared-tools',
      type: 'reducer',
      label: 'Skill declares shell access in frontmatter',
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

  // Structured frontmatter (well-formed skill)
  if (manifest?.name && manifest?.description) {
    const hasVersion = !!manifest?.metadata?.version;
    const hasLicense = !!manifest?.license;
    if (hasVersion || hasLicense) {
      signals.push({
        id: 'reduce-structured-frontmatter',
        type: 'reducer',
        label: 'Well-structured frontmatter with name, description, and version/license',
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

  // ── Calculate multiplier ──

  let multiplier = 1.0;
  for (const signal of signals) {
    multiplier += signal.weight;
  }
  multiplier = Math.max(0.3, Math.min(2.5, multiplier));

  return { signals, multiplier };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract content from fenced code blocks */
function extractCodeBlocks(content: string): string {
  const blocks: string[] = [];
  const re = /```[\s\S]*?```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    blocks.push(match[0]);
  }
  return blocks.join('\n');
}

/** Remove fenced code blocks from content */
function stripCodeBlocks(content: string): string {
  return content.replace(/```[\s\S]*?```/g, ' ');
}
