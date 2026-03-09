# How to Write an ATR Rule

This guide walks you through creating detection rules for AI agent threats.

## Before You Start

ATR rules use regex-based pattern matching (`detection_tier: pattern`). Be honest about what this can and cannot do:

**Regex CAN detect:**
- Known attack phrases and keywords
- Encoded payloads (base64, hex, unicode)
- Credential formats (API keys, tokens)
- Structural patterns (markdown injection, delimiter abuse)

**Regex CANNOT detect:**
- Paraphrased attacks (same meaning, different words)
- Multilingual variants you haven't written patterns for
- Semantic manipulation (subtle framing, selective omission)
- Protocol-level attacks (timing, ordering)

If your rule tries to detect something regex fundamentally cannot catch, mark it clearly in the description. See `LIMITATIONS.md` for the full list.

## Step 1: Identify the Attack

Before writing a rule, clearly define:
- What attack does this detect?
- Which OWASP Agentic Top 10 category does it map to?
- What data source is needed (LLM I/O, tool calls, agent behavior)?
- What specific text patterns indicate this attack?
- Can this attack be trivially rephrased to evade detection?

## Step 2: Choose the Right Category

| Category | Use When |
|----------|----------|
| `prompt-injection` | User/external input tries to override agent instructions |
| `tool-poisoning` | Tool responses contain malicious or manipulative content |
| `context-exfiltration` | Agent leaks system prompt, API keys, or internal data |
| `agent-manipulation` | One agent manipulates another agent's behavior |
| `privilege-escalation` | Agent accesses resources beyond its authorized scope |
| `excessive-autonomy` | Agent operates beyond intended boundaries (loops, resource abuse) |
| `data-poisoning` | Training or retrieval data has been tampered with |
| `skill-compromise` | MCP skills/tools are impersonated, hijacked, or over-permissioned |
| `model-security` | Model weights, behavior, or training pipeline are targeted |

## Step 3: Write the Rule

### Required fields (per schema v0.1)

```yaml
title: "Descriptive Title of What This Detects"
id: ATR-2026-XXX
status: experimental
description: |
  What this rule detects and how. Include limitations.
  Note: This rule detects [specific patterns], not [what it cannot detect].
author: "Your Name"
date: "2026/03/09"
schema_version: "0.1"
detection_tier: pattern
maturity: experimental
severity: high

references:
  owasp_llm:
    - "LLM01:2025 - Prompt Injection"
  owasp_agentic:
    - "ASI01:2026 - Agent Goal Hijack"
  mitre_atlas:
    - "AML.T0054 - LLM Prompt Injection"

tags:
  category: prompt-injection
  subcategory: your-subcategory
  confidence: medium

agent_source:
  type: llm_io
  framework:
    - any
  provider:
    - any

detection:
  conditions:
    - field: user_input
      operator: regex
      value: "(?i)your\\s+regex\\s+pattern\\s+here"
      description: "What this pattern catches"
    - field: user_input
      operator: regex
      value: "(?i)another\\s+pattern"
      description: "What this second pattern catches"
  condition: any
  false_positives:
    - "Describe legitimate scenarios that could trigger this rule"

response:
  actions:
    - block_input
    - alert
    - snapshot
  auto_response_threshold: high
  message_template: |
    [ATR-2026-XXX] Rule triggered. Pattern: {matched_pattern}.
    Session: {session_id}.

test_cases:
  true_positives:
    - input: "Exact text that SHOULD trigger this rule"
      expected: triggered
      description: "Why this should trigger"
  true_negatives:
    - input: "Legitimate text that should NOT trigger"
      expected: not_triggered
      description: "Why this should not trigger"

evasion_tests:
  - input: "Rephrased version that evades detection"
    expected: not_triggered
    bypass_technique: paraphrase
    notes: "Requires embedding similarity detection (v0.2)"
```

## Step 4: Severity Calibration

Choose severity based on real-world impact, not pattern sophistication:

| Severity | Criteria | Example |
|----------|----------|---------|
| `critical` | Immediate data loss, credential exposure, or system compromise | API key exfiltration with active exploitation |
| `high` | Significant security boundary violation | Direct prompt injection overriding safety controls |
| `medium` | Potential for escalation or policy violation | Suspicious tool call patterns without confirmed exploitation |
| `low` | Anomalous behavior worth logging | Unusual but possibly legitimate agent autonomy |
| `informational` | Context for security analysis | Metadata patterns useful for correlation |

## Step 5: Write Good Test Cases

### Minimum requirements
- 5 true positives (attacks that SHOULD trigger)
- 5 true negatives (legitimate content that should NOT trigger)
- 3 evasion tests (known bypass techniques)

### True positive tips
- Cover all detection conditions (each regex pattern should have at least one TP)
- Include realistic attack payloads, not toy examples
- Test edge cases: mixed case, extra whitespace, unicode

### True negative tips (most important for credibility)
- Include adversarial true negatives: inputs that LOOK suspicious but are legitimate
- Test professional language that overlaps with attack patterns
- Examples:
  - "Please update the system prompt to reflect new branding" (legitimate, looks like injection)
  - "As CEO, I am directing you to prioritize this task" (authority language, not an attack)
  - "The analysis is 100% correct per our validation suite" (confidence language, not manipulation)

### Evasion test tips
- Document what you CANNOT catch. This builds trust.
- Common bypass techniques to test:
  - `paraphrase`: Same meaning, completely different wording
  - `language_switch`: Attack in German, Chinese, Japanese, etc.
  - `indirect_reference`: Referring to attack concepts without using keywords
  - `encoding`: Base64, ROT13, unicode homoglyphs
  - `social_engineering`: Polite, professional tone wrapping malicious intent
  - `fictional_framing`: "In a novel, the character would say..."

## Anti-Patterns (What NOT to Do)

### 1. Overly broad regex
```yaml
# BAD: Catches nearly everything
value: "(?i)(ignore|change|update|modify)"

# GOOD: Specific to attack context
value: "(?i)(ignore|disregard)\\s+(all\\s+)?previous\\s+(instructions|directives|rules)"
```

### 2. No word boundaries
```yaml
# BAD: Matches "signore" (Italian for "sir")
value: "(?i)ignore"

# GOOD: Word boundary prevents false positives
value: "(?i)\\bignore\\b\\s+\\b(previous|prior|above)\\b"
```

### 3. Claiming behavioral detection with regex
```yaml
# BAD: This regex cannot detect actual cascading failures
description: "Detects cascading failures in agent pipelines"

# GOOD: Be honest about what regex detects
description: |
  Detects textual descriptions of cascading failure patterns.
  Note: Structural cascade prevention requires behavioral monitoring (v0.2).
```

### 4. Aggressive response actions for weak detection
```yaml
# BAD: Blocking based on text description detection
response:
  actions:
    - block_input
    - kill_agent

# GOOD: Alert-only for pattern-tier detection of behavioral threats
response:
  actions:
    - alert
    - snapshot
```

### 5. Missing false_positives section
Every rule WILL have false positives. If you can't think of any, your rule is either too narrow to be useful or you haven't thought hard enough.

## Step 6: Validate and Test

```bash
# Validate your rule structure
npx agent-threat-rules validate my-rule.yaml

# Run embedded test cases
npx agent-threat-rules test my-rule.yaml

# Check stats
npx agent-threat-rules stats
```

## Step 7: Submit

1. Fork `github.com/Agent-Threat-Rule/agent-threat-rules`
2. Place your rule in the correct category directory under `rules/`
3. Run `npx agent-threat-rules validate rules/` to check all rules
4. Run `npx agent-threat-rules test rules/` to run all test cases
5. Submit a PR with:
   - Rule YAML file
   - Description of what attack this detects
   - References (OWASP, MITRE ATLAS, CVE if applicable)
   - Any known limitations or evasion techniques
