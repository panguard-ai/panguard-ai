# MiroFish Prediction Guide

Generate ATR rules from swarm intelligence predictions.

---

## What is MiroFish?

MiroFish is a multi-agent swarm intelligence framework for structured deliberation. It runs N specialized agents through M rounds of discussion on a given topic, producing a consensus prediction report.

When seeded with AI security domain data (OWASP Top 10, MITRE ATLAS, known CVEs, published attack research), MiroFish agents debate and predict plausible future attack vectors. These predictions are then converted into ATR detection rules using the `mirofish_to_atr.py` converter.

This is speculative threat modeling at scale -- the swarm explores attack surfaces that a single researcher might miss.

---

## Prerequisites

- Python 3.12+
- MiroFish framework (`pip install mirofish`)
- Claude API key (set `ANTHROPIC_API_KEY` environment variable)
- ATR CLI (`npm i -g agent-threat-rules`)
- `mirofish_to_atr.py` converter script (included in this repository under `tools/`)

---

## Step 1: Prepare Seed Data

### Agent Profiles

Create `agent-profiles.json` defining the personas for the swarm. Each agent brings a different perspective:

```json
[
  {
    "id": "red-teamer",
    "role": "Offensive Security Researcher",
    "expertise": "Prompt injection, jailbreaking, tool exploitation",
    "bias": "Assumes every interface is an attack surface"
  },
  {
    "id": "blue-teamer",
    "role": "Defense Analyst",
    "expertise": "Detection engineering, rule writing, false positive management",
    "bias": "Prioritizes actionable detection over theoretical attacks"
  },
  {
    "id": "protocol-analyst",
    "role": "Protocol Security Researcher",
    "expertise": "MCP protocol, tool-use protocols, agent communication standards",
    "bias": "Focuses on protocol-level vulnerabilities"
  },
  {
    "id": "supply-chain-auditor",
    "role": "Supply Chain Security Auditor",
    "expertise": "Dependency analysis, skill registries, package integrity",
    "bias": "Assumes third-party components are compromised until proven otherwise"
  },
  {
    "id": "ml-researcher",
    "role": "ML Security Researcher",
    "expertise": "Model extraction, training data poisoning, adversarial examples",
    "bias": "Focuses on model-level attack vectors"
  }
]
```

Recommended: 10-14 agents for diverse coverage. The first successful run used 14 agents.

### Knowledge Base

Create `knowledge-base.json` with security domain data:

```json
{
  "frameworks": [
    {
      "name": "OWASP LLM Top 10 (2025)",
      "items": [
        "LLM01: Prompt Injection",
        "LLM02: Insecure Output Handling",
        "LLM03: Training Data Poisoning",
        "LLM04: Model Denial of Service",
        "LLM05: Supply Chain Vulnerabilities",
        "LLM06: Sensitive Information Disclosure",
        "LLM07: Insecure Plugin Design",
        "LLM08: Excessive Agency",
        "LLM09: Overreliance",
        "LLM10: Model Theft"
      ]
    },
    {
      "name": "OWASP Agentic Top 10 (2026)",
      "items": [
        "ASI01: Agent Goal Hijack",
        "ASI02: Tool Misuse and Manipulation",
        "ASI03: Privilege Boundary Breach",
        "ASI04: Skill Supply Chain Attack",
        "ASI05: Unsafe Autonomous Action",
        "ASI06: Context and Memory Corruption",
        "ASI07: Multi-Agent Trust Exploitation",
        "ASI08: Resource Exhaustion",
        "ASI09: Audit and Accountability Gaps",
        "ASI10: Cascading Agent Failure"
      ]
    }
  ],
  "known_cves": [
    "CVE-2025-53773: GitHub Copilot RCE via prompt injection",
    "CVE-2025-32711: EchoLeak system prompt exfiltration",
    "CVE-2025-68143: Malicious MCP server arbitrary code execution"
  ],
  "attack_research": [
    "Indirect prompt injection via tool responses (Greshake et al., 2023)",
    "MCP tool poisoning via description manipulation (Invariant Labs, 2025)",
    "Multi-agent jailbreak propagation (Anthropic, 2025)"
  ]
}
```

Include as much real-world data as possible. The knowledge base grounds the swarm's predictions in reality.

---

## Step 2: Run Simulation

```bash
python mirofish_run.py \
  --agents agent-profiles.json \
  --knowledge knowledge-base.json \
  --rounds 40 \
  --model claude-sonnet-4-20250514 \
  --topic "Predict novel attack vectors against AI agents using MCP tool-use protocols in 2026-2027" \
  --output simulation-output/
```

### Parameters

| Parameter | Recommended | Description |
|-----------|-------------|-------------|
| `--rounds` | 40 | Number of deliberation rounds. Lower (20) for quick exploration, higher (60) for deeper consensus |
| `--model` | `claude-sonnet-4-20250514` | LLM backend. Sonnet balances cost and quality |
| `--agents` | 10-14 profiles | More agents = more diverse perspectives, higher cost |
| `--topic` | Specific question | Be specific. Vague topics produce vague predictions |

### Cost Estimate

| Configuration | Approximate Cost |
|---------------|-----------------|
| 10 agents, 20 rounds, Sonnet | $0.50 - $1.00 |
| 14 agents, 40 rounds, Sonnet | $1.00 - $3.00 |
| 14 agents, 60 rounds, Sonnet | $2.00 - $5.00 |
| 14 agents, 40 rounds, Opus | $5.00 - $15.00 |

---

## Step 3: Export Report

```bash
python mirofish_export.py \
  --input simulation-output/ \
  --format json \
  --output prediction-report.json
```

The report contains:

- Predicted attack vectors with consensus scores
- Attack descriptions and impact assessments
- Suggested detection approaches
- Framework mappings (OWASP, MITRE)
- Agent voting records and disagreements

---

## Step 4: Convert to ATR Rules

```bash
python mirofish_to_atr.py \
  --input prediction-report.json \
  --output-dir generated-rules/ \
  --min-consensus 0.6
```

### What the converter does

1. Extracts each predicted attack vector from the report
2. Maps it to the appropriate ATR category and agent_source type
3. Generates regex detection patterns from the attack description
4. Creates initial test cases from the prediction examples
5. Assigns severity based on the swarm's impact assessment
6. Maps to OWASP and MITRE references
7. Runs schema validation on each generated rule

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--min-consensus` | 0.6 | Minimum swarm consensus score (0-1) to generate a rule |
| `--severity-override` | none | Override the swarm's severity assessment |
| `--dry-run` | false | Preview rules without writing files |

### Output

The converter produces one YAML file per predicted attack vector:

```
generated-rules/
  ATR-2026-XXX-predicted-mcp-relay-attack.yaml
  ATR-2026-XXX-predicted-skill-version-rollback.yaml
  ATR-2026-XXX-predicted-context-window-overflow.yaml
  ...
```

---

## Step 5: Quality Review

The converter runs an automated quality gate on each generated rule:

```bash
# Validate all generated rules
atr validate generated-rules/

# Run test cases
atr test generated-rules/
```

Fix any validation errors before proceeding to human review.

---

## Step 6: Human Review and Refinement

AI-generated rules require human review. For each rule:

1. **Verify detection patterns** -- Are the regex patterns specific enough? Do they target actual attack indicators or generic language?

2. **Add adversarial true negatives** -- The converter generates basic true negatives. Add inputs that share vocabulary with the attack pattern but are legitimate.

3. **Add evasion tests** -- Document known bypasses with `expected: not_triggered`. Honesty about limitations builds trust.

4. **Adjust severity** -- The swarm's severity assessment may not match your operational context. Adjust based on real-world impact.

5. **Refine descriptions** -- Ensure the description states what IS detected and what IS NOT. AI-generated descriptions tend to overclaim.

6. **Check for ReDoS** -- Review regex patterns for catastrophic backtracking. Use bounded quantifiers (`.{0,100}` instead of `.*`).

---

## Step 7: Submit Rules

1. Place reviewed rules in `rules/<category>/`
2. Run final validation:
   ```bash
   atr validate rules/
   atr test rules/
   ```
3. Submit a PR to [Agent-Threat-Rule/agent-threat-rules](https://github.com/Agent-Threat-Rule/agent-threat-rules)
4. Use the `mirofish-generated` label
5. Include the MiroFish configuration (agent count, round count, topic) in the PR description

---

## Reference: First Successful Run

The first MiroFish-to-ATR pipeline run produced 17 rules:

| Parameter | Value |
|-----------|-------|
| Model | Claude Sonnet (via Anthropic API) |
| Agents | 14 specialized personas |
| Rounds | 40 deliberation rounds |
| Topic | Novel attack vectors against AI agents using MCP in 2026-2027 |
| Knowledge base | OWASP Agentic Top 10, MITRE ATLAS, 6 published CVEs, 10 research papers |
| Cost | ~$2.50 USD |
| Output | 17 predicted attack vectors |
| Rules generated | 17 ATR rule drafts |
| After human review | 17 rules passed quality gate |

The generated rules covered attack vectors across 6 categories: skill-compromise, tool-poisoning, context-exfiltration, privilege-escalation, agent-manipulation, and model-abuse.

---

## Troubleshooting

### Simulation produces vague predictions

- Make the topic more specific
- Add more real-world examples to the knowledge base
- Increase agent count for more diverse perspectives
- Increase round count for deeper deliberation

### Converter generates overly broad patterns

- Increase `--min-consensus` to filter low-confidence predictions
- Review and narrow regex patterns manually during human review
- Add word boundaries and bounded quantifiers

### High cost

- Reduce round count (20 is sufficient for exploration)
- Use fewer agents (8 minimum for useful diversity)
- Use Sonnet instead of Opus (3x cost savings, sufficient quality for prediction tasks)
