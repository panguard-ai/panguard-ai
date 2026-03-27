/**
 * ATR Rule Creation Standard
 *
 * Defines the LLM prompt standard for generating ATR detection rules.
 * This standard ensures rules are:
 *   - Based on actual malicious payloads (not finding titles)
 *   - Behavioral (catches variants, not just exact matches)
 *   - Aware of the AI agent security landscape
 *   - Compatible with ATR schema v0.1
 *
 * Used by both:
 *   - ATR Drafter (real-time threat → rule)
 *   - Skill Watcher (scan finding → rule)
 *
 * @module panguard-guard/engines/atr-rule-creation-standard
 */

// ---------------------------------------------------------------------------
// Threat landscape context (updated as the world evolves)
// ---------------------------------------------------------------------------

export const THREAT_LANDSCAPE = `
## Current AI Agent Security Landscape (2026)

### Architecture
AI agents (Claude Code, Cursor, OpenClaw) use MCP (Model Context Protocol) to connect
to external tools ("skills" or "MCP servers"). Each skill can:
- Read/write files on the user's machine
- Execute shell commands
- Make network requests
- Access environment variables (API keys, tokens)
- Communicate with other agents

### Attack Surfaces
1. **Skill descriptions/instructions** — Text that the LLM reads. Attackers embed
   hidden instructions to hijack the agent's behavior.
2. **Tool call arguments** — Malicious arguments passed to tools (SSRF, path traversal,
   command injection).
3. **Tool responses** — Malicious content returned by tools that the LLM processes.
4. **Agent-to-agent messages** — In multi-agent systems, one agent can inject
   instructions into another.
5. **Supply chain** — Typosquatting, backdoored dependencies, postinstall scripts.

### Two Types of Threats
1. **Human malice** — Intentional attacks by humans who craft malicious skills,
   inject prompts, or exploit agent capabilities.
   Examples: prompt injection in tool descriptions, credential theft via env access,
   SSRF through tool arguments, social engineering via fake system messages.

2. **Agent autonomous risk** — Unintentional but dangerous behaviors by agents
   acting beyond their intended scope.
   Examples: runaway loops, excessive file deletion, unauthorized financial actions,
   cross-agent privilege escalation, scope creep.

Both must be detected. Human attacks need precise pattern matching.
Agent risks need behavioral boundary enforcement.

### The Expanding Capability Frontier
AI agent capabilities are expanding faster than security rules can be written.
Today's safe operation may become tomorrow's attack vector:
- File access was read-only → now read/write/execute
- Network was http-only → now websockets, SSH tunnels, DNS exfiltration
- Single agent → multi-agent orchestration with delegation chains
- Text-only → multimodal (images, audio, video as attack vectors)
- Local execution → cloud execution with persistent state

Rules must be FORWARD-COMPATIBLE:
- Match behavioral INTENT, not specific tool names or API signatures
- A rule detecting "unauthorized data exfiltration" should work whether
  the exfil happens via HTTP, DNS, file copy, agent delegation, or
  a protocol that doesn't exist yet
- Think: "What is the INVARIANT that makes this action dangerous?"
  The invariant is what the rule should match.

Example invariant: "Sensitive data leaving the user's control boundary"
- Today: curl to external URL with ~/.ssh contents
- Tomorrow: agent-to-agent delegation chain ending in cloud storage upload
- The invariant is the same. The rule should catch both.
`;

// ---------------------------------------------------------------------------
// Rule quality standard
// ---------------------------------------------------------------------------

export const RULE_QUALITY_STANDARD = `
## What Makes a Good ATR Rule

### GOOD: Behavioral regex that catches variants
\`\`\`yaml
# Catches "ignore previous instructions" in many forms
value: "(?i)\\\\b(ignore|disregard|forget)\\\\s+(all\\\\s+)?(the\\\\s+|your\\\\s+)?(previous|prior|above)\\\\s*(instructions?|rules?|directives?)"
\`\`\`
Why good: Covers verb synonyms, optional determiners, noun variants.
Catches "ignore the previous instructions", "forget your prior rules", etc.

### BAD: Keyword concatenation from finding titles
\`\`\`yaml
# Generated from "Shell command execution via tool call"
value: "(?i)Shell.*command.*execution.*call"
\`\`\`
Why bad: Matches any text discussing shell commands. Massive false positives.

### BAD: Exact string match
\`\`\`yaml
value: "ignore all previous instructions"
\`\`\`
Why bad: Only catches this exact phrase. Trivially evaded by rephrasing.

### Rule Design Principles
1. **Match the ATTACK PATTERN, not the description of the attack**
   - Input: actual malicious payload text
   - Output: regex that matches that payload AND its variants

2. **Use behavioral anchoring**
   - Don't just match keywords — match the STRUCTURE of the attack
   - e.g., "verb + target + action" not just "keyword1 AND keyword2"

3. **Cover the evasion space**
   - Synonym coverage for key verbs (ignore/forget/disregard/skip)
   - Optional words (the/your/all/any)
   - Flexible whitespace (\\\\s+ not literal space)

4. **Bound the false positive space**
   - Use word boundaries (\\\\b) to avoid partial matches
   - Use negative context where possible
   - Set appropriate severity (not everything is critical)

5. **Choose the right field**
   - user_input: for prompt injection from users
   - tool_response: for malicious MCP tool responses
   - content: for agent-to-agent messages
   - tool_name + tool_args: for tool call manipulation
`;

// ---------------------------------------------------------------------------
// Example rules (top 3 by quality, for LLM reference)
// ---------------------------------------------------------------------------

export const EXAMPLE_RULES = `
## Example 1: Direct Prompt Injection (ATR-2026-001 Layer 1)
\`\`\`yaml
- field: user_input
  operator: regex
  value: "(?i)\\\\b(ignore|disregard|forget|override|bypass)\\\\s+(all\\\\s+)?(the\\\\s+|your\\\\s+|my\\\\s+|any\\\\s+)?(previous|prior|above|earlier)?\\\\s*(instructions?|prompts?|rules?|guidelines?|directives?)"
  description: "Instruction override with verb synonyms and optional determiners"
\`\`\`

## Example 2: SSRF via Tool Arguments (ATR-2026-013)
\`\`\`yaml
- field: tool_args
  operator: regex
  value: "(?i)(https?://)?((169\\\\.254|10\\\\.\\\\d|172\\\\.(1[6-9]|2\\\\d|3[01])|192\\\\.168|127\\\\.0\\\\.0\\\\.1|0\\\\.0\\\\.0\\\\.0|localhost|\\\\[::1?\\\\]))"
  description: "SSRF targeting cloud metadata, localhost, or private networks"
\`\`\`

## Example 3: Credential Exfiltration in Output (ATR-2026-021)
\`\`\`yaml
- field: agent_output
  operator: regex
  value: "(?i)(sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36}|xox[bpors]-[a-zA-Z0-9-]{10,})"
  description: "Known API key formats leaked in agent output"
\`\`\`
`;

// ---------------------------------------------------------------------------
// Draft prompt builder
// ---------------------------------------------------------------------------

export interface RuleCreationInput {
  /** The actual malicious content/payload (not a finding title) */
  readonly payload: string;
  /** Where the payload was found */
  readonly source:
    | 'skill_description'
    | 'tool_response'
    | 'tool_args'
    | 'user_input'
    | 'agent_message'
    | 'code_analysis';
  /** Attack category */
  readonly category: string;
  /** Why this was flagged (analysis reasoning) */
  readonly reasoning: string;
  /** MITRE techniques if known */
  readonly mitreTechniques?: readonly string[];
  /** Severity assessment */
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  /** Additional context (e.g., skill name, tool name) */
  readonly context?: string;
  /** IDs of existing ATR rules that already partially match */
  readonly existingMatches?: readonly string[];
}

const SOURCE_TO_FIELD: Record<string, string> = {
  skill_description: 'content',
  tool_response: 'tool_response',
  tool_args: 'tool_args',
  user_input: 'user_input',
  agent_message: 'content',
  code_analysis: 'content',
};

export function buildRuleCreationPrompt(input: RuleCreationInput): string {
  const field = SOURCE_TO_FIELD[input.source] ?? 'content';
  const existingNote = input.existingMatches?.length
    ? `\nNote: These existing ATR rules already partially match: ${input.existingMatches.join(', ')}. Your new rule should cover what they miss.`
    : '';

  return `You are an AI agent security researcher creating an ATR (Agent Threat Rules) detection rule.

${THREAT_LANDSCAPE}

${RULE_QUALITY_STANDARD}

${EXAMPLE_RULES}

## Your Task

Create an ATR rule to detect the following threat pattern.

### Malicious Payload
\`\`\`
${input.payload.slice(0, 2000)}
\`\`\`

### Context
- Found in: ${input.source} (use field: "${field}")
- Category: ${input.category}
- Severity: ${input.severity}
- MITRE: ${input.mitreTechniques?.join(', ') || 'N/A'}
${input.context ? `- Additional context: ${input.context}` : ''}
${existingNote}

### Analysis (why this was flagged)
${input.reasoning.slice(0, 500)}

### Requirements
1. Create a BEHAVIORAL regex that catches this payload AND its variants
2. Don't match the exact text — match the PATTERN (verb + target + action structure)
3. Include synonym coverage for key attack verbs
4. Use word boundaries and flexible whitespace
5. The field MUST be "${field}" (based on where the payload was found)
6. Include 2 true_positives (the payload + 1 variant) and 2 true_negatives
7. Include false_positives section listing legitimate uses that might match
8. Set status: "draft" and maturity: "experimental"
9. Use id format: ATR-2026-DRAFT-{8-char-hash}

Output ONLY the YAML rule in a \`\`\`yaml code block.`;
}

// ---------------------------------------------------------------------------
// Review prompt builder
// ---------------------------------------------------------------------------

export function buildRuleReviewPrompt(ruleContent: string): string {
  return `You are reviewing an auto-generated ATR (Agent Threat Rules) rule for production readiness.

${RULE_QUALITY_STANDARD}

## Rule to Review
\`\`\`yaml
${ruleContent}
\`\`\`

## Evaluation Criteria
1. **False Positive Risk** — Would this regex match normal, non-malicious text?
   Test mentally against: coding help requests, documentation, educational security discussions.
2. **Detection Quality** — Does the regex match the BEHAVIOR pattern or just keywords?
3. **Evasion Resistance** — Can an attacker easily bypass by rephrasing?
4. **Field Correctness** — Is the detection field appropriate for the attack vector?
5. **Severity Accuracy** — Does the severity match the real impact?
6. **Forward Compatibility** — Will this rule still work when AI agent capabilities expand?
   - Does it match the behavioral INVARIANT (the dangerous intent) or just today's implementation?
   - If agents gain new tools/protocols/modalities next month, does this rule break?
   - A rule matching "curl to external URL" is NOT forward-compatible.
   - A rule matching "sensitive data leaving control boundary" IS forward-compatible.

## Output
JSON only:
{
  "approved": true/false,
  "falsePositiveRisk": "low" | "medium" | "high",
  "detectionQuality": 0-100,
  "evasionResistance": 0-100,
  "forwardCompatibility": 0-100,
  "reasoning": "1-2 sentence explanation",
  "suggestedFix": "optional: how to improve the regex if not approved"
}`;
}
