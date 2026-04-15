# PanGuard Console — Product Design

> Every feature maps to a concrete attack scenario in THREAT-MODEL.md.
> Features without threat model mapping do not get built.

## User Persona

DevSecOps lead or solo developer managing 5-500 machines with AI agents.
Wants: open console, see status, fix problems. No learning curve.

## Information Hierarchy (3-layer drill-down)

```
Layer 1: Fleet Overview (first thing user sees)
  - KPI cards: Protected / Needs Rescan / Outdated / Skills Monitored
  - Device table: status, agent count, skill count (flagged), last seen
  - Threat Model: #6 (Scope Escalation — org-level visibility)

Layer 2: Device Detail (click a device)
  - Device info: OS, Guard version, ATR version
  - Agent list with per-agent skill count and status
  - Flagged skills section with [Rescan] [Block] [Approve] actions
  - Threat Model: #1 (Supply Chain), #6

Layer 3: Skill Detail (click a skill)
  - Scan result: matched rules, severity, pattern
  - Drift history: content hash changes over time
  - TC verdict: blacklisted/whitelisted status
  - Threat Model: #1, #2, #3, #4
```

## Skill Status State Machine

```
                    skill installed
                         |
                         v
                    [Scanning] <-- user clicks [Rescan]
                         |
              +----------+----------+
              v          v          v
         [Clean]    [Flagged]   [Blocked]
              |          |          ^
     content  |   user   |          |
     changed  | [Approve]|   user   |
              v          v  [Block] |
        [Needs      [Clean]        |
         Rescan] -- auto-rescan -->+
```

States:

- Clean (green dot): Last scan passed, no drift
- Flagged (orange square): Scan found issues, awaiting review
- Blocked (red X): User or TC blacklist blocked this skill
- Needs Rescan (half dot): Content hash changed since last scan
- Scanning (spinner): Scan in progress

## Drift Detection (Differentiator)

Guard SkillWatcher detects file changes. Console compares content_hash
from heartbeat against last scan hash. Hash mismatch = Needs Rescan.

This catches rug pulls: clean version published first, malicious update later.
Maps to Threat Model #1 (Supply Chain Poisoning).

ATR already has skill_hash_history table with rug_pull_flag.

## MVP Scope

| Feature                             | Threat Model | Priority |
| ----------------------------------- | ------------ | -------- |
| Fleet overview (KPI + device table) | #6           | P0       |
| Device detail (agents + skills)     | #1, #6       | P0       |
| Skill status badges                 | #1           | P0       |
| Drift badge (hash changed)          | #1           | P0       |
| One-click Rescan                    | #1           | P0       |
| Alert timeline                      | All          | P0       |

## Post-MVP

| Feature                                | Threat Model      | Priority |
| -------------------------------------- | ----------------- | -------- |
| Policy editor (allow/block categories) | #1, #6            | P1       |
| Monthly PDF report                     | EU AI Act Art. 12 | P1       |
| Audit log viewer                       | EU AI Act Art. 14 | P1       |
| Agent kill-switch                      | Art. 14           | P2       |
| Compliance status dashboard            | EU AI Act         | P2       |

## Visual Design

Follow DESIGN.md: dark theme, sage green accent, mission control aesthetic.
Console uses independent sidebar layout (220px sidebar + flex-1 main).

## Auth

MVP: API key auth (TC server checkAdminAuth already exists).
Future: Clerk for login/org management when paid tier launches.

## API Endpoints (TC Server)

- POST /api/devices/heartbeat — Guard sends device + agent + skill data
- GET /api/orgs/:orgId/devices — Fleet view data
- GET/POST/DELETE /api/orgs/:orgId/policies — Policy CRUD
- GET /api/skill-threats — Flagged skills
- GET /api/audit-log — Audit trail
