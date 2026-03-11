# MiroFish Bridge - AI Attack Prediction for ATR

Use [MiroFish](https://github.com/666ghj/MiroFish) swarm intelligence to predict future AI agent attacks and generate pre-emptive ATR detection rules.

## Architecture

```
MiroFish (another computer)          Panguard (this repo)
========================          ====================
1. Load seed data          -->
2. Run simulation (30+ rounds)
3. ReportAgent generates predictions
4. mirofish_to_atr.py converts     --> 5. ATR YAML rules
   predictions to ATR format        --> 6. Submit to Threat Cloud
                                    --> 7. Community consensus
                                    --> 8. Distributed to all nodes
```

## Quick Start

### On the other computer (MiroFish):

```bash
# 1. Clone MiroFish
git clone https://github.com/666ghj/MiroFish.git
cd MiroFish

# 2. Setup
cp .env.example .env
# Edit .env with your LLM API key (see config/mirofish-env.example for options)
npm run setup:all

# 3. Copy seed data into MiroFish
cp -r /path/to/panguard-ai/tools/mirofish-bridge/seed-data/ ./seed-data/

# 4. Start MiroFish
npm run dev

# 5. In MiroFish UI (http://localhost:3000):
#    - Upload seed-data/knowledge-base.json as seed material
#    - Upload seed-data/agent-profiles.json for agent configuration
#    - Set simulation rounds to 30+
#    - Describe the prediction goal:
#      "Simulate the AI agent security ecosystem in 2026-2027.
#       Attackers develop novel techniques to bypass detection rules.
#       Defenders create new detection rules.
#       Focus on: prompt injection evasion, skill supply chain attacks,
#       behavioral fingerprint evasion, multi-agent exploitation,
#       and multimodal injection vectors.
#       Output detailed attack patterns with detection signatures."
#    - Run simulation
#    - Export report as JSON

# 6. Convert MiroFish output to ATR rules
pip install pyyaml requests
python /path/to/panguard-ai/tools/mirofish-bridge/converter/mirofish_to_atr.py \
  --input ./output/report.json \
  --output-dir ./generated-atr-rules/ \
  --verbose
```

### On Panguard (this repo):

```bash
# Import generated rules into ATR
cp /path/to/generated-atr-rules/*.yaml packages/atr/rules/mirofish-predicted/

# Or submit directly to Threat Cloud
python tools/mirofish-bridge/converter/mirofish_to_atr.py \
  --input-dir /path/to/mirofish-output/ \
  --output-dir ./generated-atr-rules/ \
  --submit-to https://your-threat-cloud-endpoint
```

## Seed Data Files

| File | Purpose |
|------|---------|
| `seed-data/agent-profiles.json` | 12 agent archetypes (6 attackers, 3 defenders, 3 users) |
| `seed-data/knowledge-base.json` | Complete AI threat landscape, existing ATR coverage, gaps, scenarios |
| `seed-data/mitre-atlas-mapping.json` | Full MITRE ATLAS + ATT&CK mapping with coverage analysis |

## Converter Usage

```bash
# Single file
python converter/mirofish_to_atr.py -i report.json -o ./rules/

# Directory of reports
python converter/mirofish_to_atr.py -d ./mirofish-output/ -o ./rules/

# Dry run (preview without writing)
python converter/mirofish_to_atr.py -i report.json --dry-run

# Submit to Threat Cloud
python converter/mirofish_to_atr.py -i report.json --submit-to https://threat-cloud.panguard.ai
```

The converter accepts MiroFish output in JSON, YAML, or plain text format. It:
1. Parses predictions from simulation reports
2. Infers ATR category, severity, and MITRE techniques
3. Extracts detection patterns (regex-suitable)
4. Generates ATR YAML with proper schema
5. Optionally submits as proposals to Threat Cloud consensus

## Simulation Scenarios

The seed data includes 6 pre-defined scenarios for MiroFish god-view injection:

| Round | Event |
|-------|-------|
| 5 | MCP skill registry compromised |
| 10 | New multimodal LLM released (image injection surface) |
| 15 | Enterprise deploys 1000 autonomous agents |
| 20 | Fingerprint evasion techniques published |
| 25 | Sybil attack on community consensus (50 fake nodes) |

## Expected Output

Each simulation run should produce 10-30 predicted attack patterns, covering:
- Novel prompt injection evasion techniques
- Behavioral fingerprint evasion methods
- Cross-skill collusion attacks
- Multi-agent consensus poisoning
- Multimodal injection vectors
- Agent memory persistence attacks

## Skill Whitelist Integration

Generated rules automatically integrate with Panguard's skill whitelist system:

```typescript
// In guard config
{
  trustedSkills: ['read-file', 'web-search', 'calculator', ...]
}
```

Whitelisted skills:
- Still run through ATR pattern rules (Layer 1)
- Still tracked by behavioral fingerprinting (Layer 2)
- Skip expensive LLM deep analysis (Layer 3)
- Auto-promoted when fingerprint stabilizes (10+ consistent invocations)
- Auto-revoked if behavioral drift detected
