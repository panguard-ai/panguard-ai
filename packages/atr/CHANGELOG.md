# Changelog

All notable changes to ATR will be documented in this file.

## [0.1.0-rc2] - 2026-03-09

### Added
- 29 detection rules across 9 attack categories
- TypeScript reference engine with SessionTracker
- Full OWASP Top 10 for Agentic Applications (2026) coverage
- 13 real CVE mappings across 16 rules
- OWASP LLM Top 10 (2025) mapping for all rules
- MITRE ATLAS technique references
- JSON Schema specification (spec/atr-schema.yaml)
- Built-in true positive and true negative test cases for every rule
- Attack corpus validation tests
- Coverage report (COVERAGE.md)

### Attack Categories
- Prompt Injection (5 rules)
- Tool Poisoning (4 rules)
- Context Exfiltration (3 rules)
- Agent Manipulation (3 rules)
- Privilege Escalation (2 rules)
- Excessive Autonomy (2 rules)
- Skill Compromise (7 rules)
- Data Poisoning (1 rule)
- Model Security (2 rules)
