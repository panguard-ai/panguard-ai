## What does this PR do?

## Contribution Type

- [ ] New rule(s)
- [ ] Rule improvement (tighter patterns, reduced false positives)
- [ ] Evasion test (documenting a known bypass)
- [ ] Engine improvement
- [ ] Documentation
- [ ] Rule(s) deprecated

## Checklist

- [ ] Follows ATR schema (`spec/atr-schema.yaml`)
- [ ] Has `schema_version`, `detection_tier`, `maturity`, and `author` fields
- [ ] At least 5 true positive test cases
- [ ] At least 5 true negative test cases (including adversarial near-misses)
- [ ] At least 3 evasion tests with `bypass_technique`
- [ ] `false_positives` section lists known edge cases
- [ ] OWASP/MITRE references included
- [ ] Description explains what IS and IS NOT detected
- [ ] `npx agent-threat-rules validate` passes
- [ ] `npx agent-threat-rules test` passes
