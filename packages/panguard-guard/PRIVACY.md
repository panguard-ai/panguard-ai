# PanguardGuard Privacy Policy

## Threat Intelligence Sharing

Collective defense is **opt-in and off by default**. PanguardGuard uploads nothing
unless you explicitly enable collective defense. When you do, only **anonymized**
threat data is sent to Panguard Threat Cloud, so every participating installation
can contribute to and benefit from shared threat intelligence. `pga scan` is always
run with `--no-report` and never uploads.

**Enabling collective defense.** It is presented as an explicit, off-by-default
choice during first-run setup, and can be turned on or off at any time from the
**Threat Cloud** page of the local Guard dashboard. To keep uploads off, leave it
disabled — that is the default and requires no action.

## What Is Uploaded

When a threat is detected, the following anonymized data is uploaded:

| Field               | Example                     | Contains PII?               |
| ------------------- | --------------------------- | --------------------------- |
| `attackSourceIP`    | `192.168.xxx.xxx`           | No (last two octets masked) |
| `attackType`        | `prompt-injection`          | No                          |
| `mitreTechnique`    | `T1059`                     | No                          |
| `atrRulesMatched`   | `ATR-2026-001,ATR-2026-010` | No                          |
| `atrCategory`       | `prompt-injection`          | No                          |
| `timestamp`         | `2026-03-08T12:00:00Z`      | No                          |
| `region`            | `US`                        | No (country only)           |
| `severity`          | `high`                      | No                          |
| `autoResponseTaken` | `block_input`               | No                          |
| `panguardVersion`   | `1.7.0`                     | No                          |
| `osType`            | `linux`                     | No                          |
| `patternHash`       | `a1b2c3...`                 | No (SHA-256 of pattern)     |
| `confidence`        | `0.85`                      | No                          |

### What Is NOT Uploaded

- User prompts or LLM inputs/outputs
- File contents or file paths
- API keys, tokens, or credentials
- Hostnames, usernames, or process names
- Full IP addresses (last two octets always masked)
- Any personally identifiable information (PII)

## Verifying Upload Data

The complete set of fields that can ever be uploaded is listed under "What Is
Uploaded" above — nothing else is sent, and nothing is sent at all unless you
have explicitly enabled collective defense. The anonymization logic that produces
every payload is open source and auditable (see "Open Source Verification").

## Anonymization Method

### IP Addresses

Source IPs are anonymized by masking the last two octets:

- `10.0.45.123` becomes `10.0.xxx.xxx`

This preserves network-level correlation (same /16 subnet) while preventing
identification of specific hosts.

### Pattern Hashing

Attack patterns are SHA-256 hashed. The hash allows Threat Cloud to correlate
similar attacks across installations without storing the actual attack content.

## Data Flow

```
[Guard Engine]
    | threat detected
    v
[Report Agent]
    | anonymize: mask IP, hash patterns, strip PII
    v
[Threat Cloud Client]
    | batch upload (50 events/batch, HTTPS)
    v
[Panguard Threat Cloud]
    | aggregate, publish community rules to the public ATR project
    v
[ATR project / bundled release]
    | rules ship bundled and immutable at install
    v
[Guard Engine]
    | notify-only: surface that a newer rule bundle exists
    | (no live network fetch auto-applies rules)
    v
[You choose when to upgrade to a new bundled release]
```

## Data Retention

Uploaded threat data is retained in Panguard Threat Cloud for 90 days, after which
it is automatically purged. Aggregated statistics (rule hit counts, regional trends)
are retained indefinitely but contain no per-event data.

## Open Source Verification

All anonymization logic is open source and auditable in the `panguard-guard`
package — the report agent that strips PII and masks IP addresses, and the Threat
Cloud upload client. The ATR detection rules are maintained in the public ATR
project.
