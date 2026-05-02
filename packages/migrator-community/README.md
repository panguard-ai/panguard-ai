# @panguard-ai/migrator-community

> Sigma / YARA → ATR YAML converter — open-source, MIT-licensed.

Convert legacy detection rules (Sigma, YARA) into the
[ATR (Agent Threat Rules)](https://github.com/atr-org/agent-threat-rules)
YAML format used by AI agent runtime engines.

## What this is

This is the community edition of the PanGuard Migrator. It takes Sigma
(YAML) or YARA (text) detection rules and outputs ATR YAML rules that
pass the public `agent-threat-rules` `validateRule()` contract — meaning
they can be loaded directly into the ATR runtime engine, deployed to a
SIEM via the public ATR converters (Elastic, Splunk, SARIF), or pushed
back to the ATR open-source repo as community contributions.

## What this is NOT

The community edition produces **schema-valid output without compliance
metadata**. For:

- LLM-driven enrichment with 5-framework compliance mapping (EU AI Act,
  OWASP Agentic Top 10, OWASP LLM Top 10, NIST AI RMF, ISO/IEC 42001)
- Reauthored detection conditions targeting agent-context fields
  (`tool_call.arguments`, `agent_action.command_line`)
- Test cases (true positives + true negatives) per rule
- EU AI Act audit evidence pack (signed JSON + PDF)
- Live activation demo
- Threat Cloud telemetry + ATR contribution path

…see the **enterprise edition** at <https://panguard.ai/migrator>.

## Install

```bash
npm install -g @panguard-ai/migrator-community
```

## Usage

### CLI

```bash
# Convert a directory of Sigma rules
panguard-migrate --input ./customer-sigma --output ./atr-out

# Convert a single YARA file
panguard-migrate --input rule.yar --output atr.yaml

# Mixed input (auto-detected by file extension)
panguard-migrate --input ./detection-rules --output ./atr-out
```

### Programmatic API

```typescript
import { convertSigma, convertYara } from '@panguard-ai/migrator-community';
import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';

// Sigma rule (parsed YAML object)
const sigmaText = readFileSync('rule.yml', 'utf-8');
const sigma = yaml.load(sigmaText);
const result = await convertSigma(sigma);
if (result.outcome === 'converted') {
  console.log(yaml.dump(result.atr));
}

// YARA rule (raw text)
const yaraText = readFileSync('rule.yar', 'utf-8');
const yaraResult = await convertYara(yaraText);
```

### With your own enrichment

The community transformer accepts an externally-produced enrichment
object that adds compliance metadata, test cases, and reauthored
detection conditions. Generate this however you want — manually,
via your own LLM pipeline, or by importing the schema from
`@panguard-ai/migrator-community/enrichment/types`.

```typescript
import type { Enrichment } from '@panguard-ai/migrator-community/enrichment/types';
import { convertSigma } from '@panguard-ai/migrator-community';

const enrichment: Enrichment = {
  has_agent_analogue: true,
  agent_source_type: 'tool_call',
  category: 'tool-poisoning',
  compliance: {
    eu_ai_act: [
      { article: '15', strength: 'primary', context: 'Robustness control' },
    ],
    owasp_agentic: [
      { id: 'ASI06:2026', strength: 'primary', context: 'Tool misuse' },
    ],
  },
  // ... rest of the contract — see types.ts for full shape
};

const result = await convertSigma(sigma, { enrichment });
```

## What you get

For each input rule, the migrator produces an ATR YAML object with:

- `schema_version`, `id`, `title`, `severity`, `description`
- `detection.conditions[]` — agent-context detection conditions
- `agent_source` — type, framework, provider
- `tags` — category, scan_target, confidence
- `response` — actions, message template
- `references` — MITRE ATT&CK technique IDs (if Sigma rule had `tags`)
- `migrator_provenance` — source format, source ID, audit fields

If you supply an `Enrichment` object, the output also includes
`compliance`, `test_cases`, and reauthored `detection.conditions`.

## Limitations

- **YARA**: ~80% of YARA condition shapes are supported. Complex
  conditions like `2 of ($a, $b, $c) and $d` are skipped with a clear
  reason; see `parsers/yara/condition-parser.ts`.
- **Sigma**: 3 condition shapes supported (`selection`, `1 of selection*`,
  `all of selection*`). Other shapes are skipped.
- **No LLM**: this package never makes external API calls. All enrichment
  is provided by the caller.

## Contributing back to ATR

If you convert a rule that you think should be in the public ATR
standard, the easiest path is:

1. Run `panguard-migrate` to produce ATR YAML
2. Verify it passes `agent-threat-rules` `validateRule()` (the migrator
   does this internally)
3. Open a PR against
   [agent-threat-rules](https://github.com/atr-org/agent-threat-rules)
   in `rules/community-contrib/`

Migrated rules carry a `migrator_provenance` block referencing the
original source rule, so attribution is preserved.

## License

MIT. See [LICENSE](./LICENSE).
