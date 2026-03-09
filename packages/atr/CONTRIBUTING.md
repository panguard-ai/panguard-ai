# Contributing to ATR

ATR is MIT-licensed. Contributing requires a text editor, a YAML file,
and `npx agent-threat-rules test`. Nothing else.

No Panguard account. No threat-cloud. No proprietary tooling. No telemetry. No CLA.

ATR is maintained by Panguard AI but governed as an open standard.
Rules contributed here are MIT-licensed and belong to the community.

---

## Three Ways to Contribute

### A. Report an Evasion (~15 minutes)

Found a way to bypass an existing rule? This is the most valuable contribution.

1. Check the rule's existing `evasion_tests` section and [LIMITATIONS.md](./LIMITATIONS.md)
   to verify the bypass is not already documented.
2. Open an issue using the **Evasion Report** template.
3. Include: rule ID, bypass input, technique used, why it works.

Every confirmed evasion becomes a new `evasion_tests` entry in the rule YAML.
You get credited in [CONTRIBUTORS.md](./CONTRIBUTORS.md).

We already know regex has limits. We publish evasion tests openly.
Your bypass makes the project more honest.

### B. Report a False Positive (~20 minutes)

A rule triggered on legitimate content?

1. Open an issue using the **False Positive Report** template.
2. Include: rule ID, the input that triggered it, why it is legitimate.

Confirmed false positives become new `true_negatives` test cases.

### C. Submit a New Rule (1-2 hours)

Write a full detection rule for a new attack pattern.

1. Fork this repository
2. Create a YAML file in the appropriate `rules/<category>/` subdirectory
3. Follow the ATR schema (`spec/atr-schema.yaml`)
4. See [examples/how-to-write-a-rule.md](./examples/how-to-write-a-rule.md) for a walkthrough
5. Validate and test locally (see Quick Start below)
6. Submit a PR

---

## Quick Start

Clone and test all rules:

```bash
git clone https://github.com/Agent-Threat-Rule/agent-threat-rules
cd agent-threat-rules
npm install
npm test
```

Or validate and test a single rule without cloning:

```bash
npx agent-threat-rules validate path/to/my-rule.yaml
npx agent-threat-rules test path/to/my-rule.yaml
```

The `agent-threat-rules` CLI pulls from npm. No monorepo setup required.
Source code: [src/cli.ts](./src/cli.ts).

---

## Rule Quality Checklist

Before submitting, verify:

- [ ] Follows ATR schema (`spec/atr-schema.yaml`)
- [ ] Has `schema_version: "0.1"`
- [ ] Has `detection_tier: pattern` (or appropriate tier)
- [ ] Has `maturity: experimental` (maintainers promote to `test`/`stable`)
- [ ] Has `author` field with your name or handle
- [ ] Has OWASP LLM Top 10 or OWASP Agentic Top 10 mapping
- [ ] Has MITRE ATLAS mapping (if applicable)
- [ ] At least 5 true positive test cases
- [ ] At least 5 true negative test cases (include adversarial near-misses)
- [ ] At least 3 evasion tests with `bypass_technique` and honest
      `expected: not_triggered` where the pattern cannot catch the bypass
- [ ] `false_positives` section lists known edge cases
      (every rule has them -- if you cannot think of any, think harder)
- [ ] `description` explains what IS detected AND what IS NOT
- [ ] `severity` justified per calibration in `how-to-write-a-rule.md`
- [ ] Regex patterns tested for catastrophic backtracking (ReDoS)
- [ ] `npx agent-threat-rules validate` passes
- [ ] `npx agent-threat-rules test` passes

---

## Rule Naming Convention

- File: `ATR-YYYY-NNN-short-description.yaml`
- Place in the correct `rules/<category>/` subdirectory
- Categories: `prompt-injection`, `tool-poisoning`, `context-exfiltration`,
  `agent-manipulation`, `privilege-escalation`, `excessive-autonomy`,
  `skill-compromise`, `data-poisoning`, `model-security`
- If unsure about the next available ID, use a placeholder.
  Maintainers assign the final ID during review.

---

## See ATR in Action (Optional)

Want to see ATR rules working before contributing? Run the skill auditor
against any MCP skill directory:

```bash
npx @panguard-ai/panguard-skill-auditor audit <skill-directory>
```

The auditor evaluates AI agent skill manifests against ATR detection patterns.
If you notice a gap -- an attack it should catch but does not -- that gap
is your first rule contribution.

Using the skill auditor is optional. Reading [COVERAGE.md](./COVERAGE.md)
and [LIMITATIONS.md](./LIMITATIONS.md) is another way to find what is missing.

---

## Recognition

Contributors are credited through:

1. **YAML `author` field** -- Your name appears in every rule you write.
   Ships with the npm package. Everyone who installs ATR sees it.
2. **[CONTRIBUTORS.md](./CONTRIBUTORS.md)** -- Listed by contribution type.
3. **Release notes** -- New rules credited by author in each release.
4. **CVE credit** -- If your rule detects a CVE you discovered, the
   `references.cve` section links your work permanently.

---

## Schema Changes

Major schema changes require community discussion:

1. Open an issue with the `schema-change` label
2. Describe the proposed change and rationale
3. Minimum 7-day comment period
4. Submit a PR if consensus is reached

---

## Code of Conduct

- Be constructive in reviews
- Credit original research when submitting rules based on published work
- Report security vulnerabilities privately (see [SECURITY.md](./SECURITY.md))
- Respect differing opinions on severity classification
- No marketing or product promotion in rule descriptions

---

## License

All contributions are licensed under MIT.
By submitting a PR, you agree to license your contribution under MIT.
No CLA required.
