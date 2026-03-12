# Contribution Paths

Three paths to contributing ATR rules, from manual to fully automated.

All paths converge at the same quality gate before merge.

---

## Path A: Manual Rule Writing

Best for: security researchers, red teamers, developers who have discovered an attack pattern firsthand.

### Workflow

1. **Scaffold** -- Generate a rule template:

   ```bash
   atr scaffold
   ```

2. **Edit** -- Fill in the YAML with your detection logic:
   - Define detection conditions (regex patterns, field matching)
   - Write at least 5 true positive test cases
   - Write at least 5 true negative test cases (include adversarial near-misses)
   - Add 3+ evasion tests documenting known bypasses
   - Map to OWASP LLM Top 10, OWASP Agentic Top 10, or MITRE ATLAS

3. **Validate** -- Check schema conformance:

   ```bash
   atr validate my-rule.yaml
   ```

4. **Test** -- Run embedded test cases:

   ```bash
   atr test my-rule.yaml
   ```

5. **Submit** -- Open a PR to [Agent-Threat-Rule/agent-threat-rules](https://github.com/Agent-Threat-Rule/agent-threat-rules):
   - Place the file in `rules/<category>/`
   - Include a description of the attack pattern
   - Reference any CVEs, papers, or blog posts that document the attack

### Time estimate

1-2 hours for a well-researched rule.

---

## Path B: MiroFish AI Prediction

Best for: generating rules for emerging threats before they appear in the wild, using swarm intelligence simulation to predict attack patterns.

### What is MiroFish?

MiroFish is a multi-agent swarm intelligence framework. It runs N agents through M rounds of deliberation on a topic, producing a consensus prediction report. When seeded with security domain data, it predicts plausible future attack patterns that can be converted to ATR rules.

### Workflow

1. **Prepare seed data** -- Create agent profiles and a knowledge base:
   - `agent-profiles.json`: Define agent personas (red teamer, defense analyst, protocol researcher, etc.)
   - `knowledge-base.json`: Include OWASP Top 10 descriptions, known CVEs, published attack research

2. **Run simulation** -- Execute the MiroFish swarm:

   ```bash
   python mirofish_run.py \
     --agents agent-profiles.json \
     --knowledge knowledge-base.json \
     --rounds 40 \
     --model claude-sonnet-4-20250514
   ```

   - 40 rounds recommended for stable consensus
   - Cost estimate: $1-3 USD for 40 rounds with Claude Sonnet

3. **Export report** -- Save the prediction output:

   ```bash
   python mirofish_export.py --format json --output prediction-report.json
   ```

4. **Convert to ATR rules** -- Use the converter script:

   ```bash
   python mirofish_to_atr.py \
     --input prediction-report.json \
     --output-dir generated-rules/
   ```

   The converter:
   - Extracts attack patterns from the prediction report
   - Generates ATR-compliant YAML for each pattern
   - Assigns appropriate categories, severity, and framework references
   - Creates initial test cases from the prediction examples

5. **Quality review** -- The converter runs an automated quality gate:
   - Schema validation
   - Regex complexity check (ReDoS prevention)
   - Minimum test case count
   - OWASP/MITRE reference requirement

6. **Human review and refinement** -- Review each generated rule:
   - Verify detection patterns are specific enough (not overly broad)
   - Add adversarial true negatives
   - Add evasion tests with honest `expected: not_triggered`
   - Adjust severity based on real-world impact assessment

7. **Submit** -- Open a PR with the `mirofish-generated` label.

### Real-world example

The first MiroFish-to-ATR pipeline run used the following configuration:

- **Model**: Claude Sonnet API
- **Agents**: 14 specialized personas (red teamer, blue teamer, protocol analyst, supply chain auditor, and others)
- **Rounds**: 40 deliberation rounds
- **Knowledge base**: OWASP Agentic Top 10 (2026), MITRE ATLAS techniques, published MCP vulnerability research
- **Output**: Prediction report covering 17 novel attack vectors
- **Conversion**: `mirofish_to_atr.py` generated 17 ATR rule drafts
- **Result**: After human review and refinement, 17 rules passed quality gate

### When to use this path

- You want to detect threats that have not been publicly exploited yet
- You have access to the MiroFish framework and a Claude API key
- You are comfortable reviewing AI-generated detection patterns for accuracy
- You want to contribute multiple rules at once

---

## Path C: Detection-Driven Auto-Draft

Best for: operators running Panguard in production who encounter novel attack patterns in real agent traffic.

### Workflow

1. **Runtime detection** -- Panguard's runtime monitor detects anomalous agent behavior that does not match any existing ATR rule.

2. **Auto-draft** -- The ATR Drafter module:
   - Captures the event that triggered the anomaly
   - Extracts candidate detection patterns
   - Generates a draft ATR rule YAML
   - Runs schema validation and basic quality checks

3. **GitHub issue** -- The drafter automatically opens a GitHub issue:
   - Uses the `auto-drafted` label
   - Includes the draft rule YAML
   - Includes the anonymized event context
   - Requests community review

4. **Community review** -- Contributors:
   - Verify the detection pattern is valid and specific
   - Add additional test cases
   - Refine regex patterns for evasion resistance
   - Map to OWASP/MITRE frameworks

5. **Merge** -- Once the rule passes the quality gate and receives reviewer approval, it is merged into the main rule set.

### When to use this path

- You are running Panguard in production
- You observe agent behavior that existing rules do not cover
- You want to contribute real-world detection data (anonymized)

---

## Unified Quality Gate

All three paths must pass the same quality gate before merge. No exceptions.

### Automated checks (CI)

| Check               | Requirement                                                     |
| ------------------- | --------------------------------------------------------------- |
| Schema validation   | `atr validate` passes with zero errors                          |
| True positives      | Minimum 5 test cases, all pass                                  |
| True negatives      | Minimum 5 test cases, all pass                                  |
| Framework reference | At least one OWASP LLM, OWASP Agentic, or MITRE ATLAS reference |
| Regex safety        | No overly broad patterns (`.+` or `.*` alone as the full value) |
| Regex complexity    | No patterns vulnerable to catastrophic backtracking (ReDoS)     |
| ID format           | Matches `ATR-YYYY-NNN` pattern                                  |
| Required fields     | All schema-required fields present                              |

### Human review

| Check                        | Requirement                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| Detection specificity        | Patterns target actual attack indicators, not generic language            |
| False positive documentation | `false_positives` section lists realistic scenarios                       |
| Evasion honesty              | At least 3 evasion tests with `expected: not_triggered` where appropriate |
| Severity justification       | Severity matches real-world impact, not pattern complexity                |
| Description accuracy         | States what IS detected and what IS NOT                                   |
| Reviewer approval            | At least one maintainer approval                                          |

### Labels applied by CI

- `quality-ready` -- All automated checks pass
- `needs-work` -- One or more automated checks failed
- `mirofish-generated` -- Rule was generated via MiroFish prediction (Path B)
- `auto-drafted` -- Rule was auto-drafted from runtime detection (Path C)
