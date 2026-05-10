# Migrator Activation Demo — Live Detection Proof

**Generated:** 2026-05-04T15:02:42.050Z
**Rules loaded:** 50

## Headline

- Attack events: **5**
- Attacks blocked: **5/5** (100%)
- Benign events: **5**
- Benign clean: **5/5**
- False negatives (attacks missed): **0**
- False positives (benign flagged): **0**

## Per-event results

| Event                            | Label  | Outcome | Expected rule    | Fired rules                      |
| -------------------------------- | ------ | ------- | ---------------- | -------------------------------- |
| `attack-01-powershell-exploit`   | attack | **TP**  | `ATR-2026-85501` | `ATR-2026-85501`                 |
| `attack-02-linux-recon`          | attack | **TP**  | `ATR-2026-41443` | `ATR-2026-41443`                 |
| `attack-03-defender-exclusion`   | attack | **TP**  | `ATR-2026-88829` | `ATR-2026-88829`                 |
| `attack-04-ngrok-exfil`          | attack | **TP**  | `ATR-2026-12808` | `ATR-2026-12808, ATR-2026-70113` |
| `attack-05-shadowcopy-delete`    | attack | **TP**  | `ATR-2026-21109` | `ATR-2026-21109`                 |
| `benign-01-educational-mimikatz` | benign | **TN**  | `(none)`         | `(none)`                         |
| `benign-02-legitimate-api`       | benign | **TN**  | `(none)`         | `(none)`                         |
| `benign-03-routine-ls`           | benign | **TN**  | `(none)`         | `(none)`                         |
| `benign-04-readonly-shadowcopy`  | benign | **TN**  | `(none)`         | `(none)`                         |
| `benign-05-single-emoji`         | benign | **TN**  | `(none)`         | `(none)`                         |
