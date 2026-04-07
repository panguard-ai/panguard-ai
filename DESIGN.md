# PanGuard AI — Design System

## Visual Theme & Atmosphere

Dark, professional security dashboard. Calm authority — not flashy or alarming.
Think "mission control" not "gaming UI". Dense but readable. Information-first.
The sage green conveys "protected" without being aggressive.

Density: High (security dashboards need lots of data visible at once)
Mood: Confident, calm, vigilant
Philosophy: Show status at a glance, details on demand

## Color Palette & Roles

| Role           | Token            | Hex                    | Usage                                                 |
| -------------- | ---------------- | ---------------------- | ----------------------------------------------------- |
| Primary/Accent | `--sage`         | #8B9A8E                | Buttons, active states, "protected" indicators, links |
| Background L0  | `--bg-base`      | #1A1614                | Page background                                       |
| Background L1  | `--bg-card`      | #242220                | Cards, sidebar                                        |
| Background L2  | `--bg-raised`    | #2E2C2A                | Hover states, inputs, raised surfaces                 |
| Border         | `--border`       | #3A3836                | Card borders, dividers                                |
| Text Primary   | `--text-primary` | #F5F1E8                | Headings, key values, labels                          |
| Text Muted     | `--text-muted`   | #A09A94                | Secondary text, descriptions, timestamps              |
| Success        | `--ok`           | #2ED573                | Clean status, passed checks, connected                |
| Warning        | `--warn`         | #FBBF24                | Suspicious, medium severity, pending                  |
| Danger         | `--danger`       | #EF4444                | Critical threats, errors, blocked                     |
| Sage Glow      | `--glow`         | rgba(139,154,142,0.15) | Subtle card glow on hover                             |

Severity colors:

- CRITICAL: `--danger` #EF4444
- HIGH: #F97316 (orange)
- MEDIUM: `--warn` #FBBF24
- LOW: `--sage` #8B9A8E
- INFORMATIONAL: `--text-muted` #A09A94

## Typography Rules

| Level         | Font           | Size          | Weight        | Color            | Use                                       |
| ------------- | -------------- | ------------- | ------------- | ---------------- | ----------------------------------------- |
| Page title    | Space Grotesk  | 20px          | 700           | `--text-primary` | Page headings                             |
| Section title | Space Grotesk  | 14px          | 600           | `--text-muted`   | Section labels, uppercase, 0.5px tracking |
| KPI value     | Space Grotesk  | 28px          | 700           | varies by status | Big numbers on cards                      |
| Body          | Inter          | 13px          | 400           | `--text-primary` | Default text                              |
| Label         | Inter          | 11px          | 500           | `--text-muted`   | Card labels, uppercase, 0.8px tracking    |
| Monospace     | JetBrains Mono | 12px          | 400           | `--text-primary` | Event logs, rule IDs, timestamps          |
| CJK           | Noto Sans TC   | matches level | matches level | matches level    | Traditional Chinese text                  |

Font loading: Google Fonts — Space Grotesk (700), Inter (400,500), JetBrains Mono (400)

## Component Stylings

### Cards (KPI, status)

```
background: var(--bg-card)
border: 1px solid var(--border)
border-radius: 12px
padding: 16px 18px
box-shadow: var(--glow)
transition: border-color 0.2s
hover: border-color var(--sage)
```

### Status Badge

```
padding: 4px 12px
border-radius: 20px
font-size: 11px
font-weight: 600
text-transform: uppercase
letter-spacing: 0.5px

PROTECTED: background rgba(46,213,115,0.15), color var(--ok)
LEARNING: background rgba(251,191,36,0.15), color var(--warn)
OFFLINE: background rgba(239,68,68,0.15), color var(--danger)
```

### Sidebar Navigation Item

```
display: flex, align-items: center, gap: 10px
padding: 10px 20px
font-size: 13px, font-weight: 500
color: var(--text-muted)
border-left: 3px solid transparent
hover: background var(--bg-raised), color var(--text-primary)
active: color var(--sage), border-left-color var(--sage), background rgba(139,154,142,0.08)
```

### Event Log Item

```
padding: 10px 16px
border-bottom: 1px solid var(--border)
font-family: JetBrains Mono, monospace
font-size: 12px
border-left: 3px solid (varies by severity)
  CRITICAL: var(--danger)
  HIGH: #F97316
  SUSPICIOUS: var(--warn)
  CLEAN: var(--ok)
```

### Buttons

```
Primary: background var(--sage), color #1A1614, border-radius 8px, padding 8px 16px, font-weight 600
Secondary: background var(--bg-raised), color var(--text-primary), border 1px solid var(--border)
Danger: background rgba(239,68,68,0.15), color var(--danger)
All: font-size 13px, transition all 0.15s
```

## Layout Principles

Spacing scale: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64
Grid: CSS Grid, auto-fit, minmax(180px, 1fr) for KPI cards
Sidebar: fixed 220px width
Main content: flex-1, padding 24px 28px, overflow-y auto
Max content width: none (dashboard is full-width)

### Dashboard Page Layout

```
+-- Sidebar (220px) --+-- Main Content (flex-1) ---------------+
| Logo                 | Status Bar (PROTECTED | 172 rules)     |
| Dashboard (active)   | KPI Cards Grid (4 cards)               |
| Threats              |   [Rules Active] [Threats] [TC] [Scan] |
| Rules                | Threat Timeline (chart area)            |
| Skills               | Recent Events (log list)                |
| Threat Cloud         | TC Flywheel Status                      |
| Settings             |                                         |
+----------------------+-----------------------------------------+
```

## Depth & Elevation

Three levels only:

- L0: Page background (--bg-base) — the void
- L1: Cards, sidebar (--bg-card) — primary surfaces
- L2: Hover states, modals (--bg-raised) — interactive surfaces

Shadow: `0 0 20px rgba(139,154,142,0.15)` on card hover only. No other shadows.
No gradients. No blur effects. Clean flat surfaces with border separation.

## Do's and Don'ts

DO:

- Use sage green sparingly — it's the accent, not the background
- Show numbers prominently (28px bold) with labels below (11px muted)
- Use monospace for technical content (rule IDs, hashes, timestamps)
- Left-align everything. No centered text except status badges.
- Show severity with colored left-border on event items

DON'T:

- No emojis anywhere in the UI
- No rounded avatars or profile pictures
- No gradients or glass effects
- No animation except subtle transitions (0.15s)
- No more than 3 colors visible in any single card
- Don't use red for anything except actual threats/errors

## Responsive Behavior

Breakpoints:

- Desktop (>1024px): Full sidebar + main layout
- Tablet (768-1024px): Collapsed sidebar (icons only), main expands
- Mobile (<768px): No sidebar, bottom tab navigation, stacked cards

The dashboard is primarily desktop. Mobile is secondary.

## Dashboard Pages

### 1. Dashboard (Overview)

- Status hero: large "PROTECTED" or "LEARNING" badge with mode description
- 4 KPI cards: Rules Active, Threats Detected, TC Rules Synced, Skills Monitored
- Recent events log (last 20 events, auto-scroll)
- Uptime counter

### 2. Threats

- Threat event timeline (table, sortable)
- Severity filter chips
- Each row: timestamp, rule ID, severity badge, matched pattern (truncated), action taken

### 3. Rules

- All loaded ATR rules in a searchable table
- Columns: ID, Title, Severity, Category, scan_target, Status
- Filter by category, severity, scan_target
- Show total count prominently

### 4. Skills

- Installed skills from all platforms
- Whitelist status (green dot = whitelisted, yellow = unknown, red = blacklisted)
- Last audit date, risk score

### 5. Threat Cloud

- Connection status (connected/disconnected with colored dot)
- Rules received count
- Threats uploaded count
- Last sync timestamp
- Flywheel visualization: threats in → rules out

### 6. Settings

- Guard mode (learning/protection)
- TC endpoint + upload toggle
- AI layer config (Ollama/Claude/OpenAI)
- Dashboard port
- Language (EN/ZH-TW)

## Agent Prompt Guide

When building PanGuard dashboard components:

- Background: #1A1614, Cards: #242220, Borders: #3A3836
- Accent: #8B9A8E (sage green), Text: #F5F1E8
- Success: #2ED573, Warning: #FBBF24, Danger: #EF4444
- Font: Space Grotesk for headings, Inter for body, JetBrains Mono for code
- All cards: 12px radius, 1px border, sage glow on hover
- Severity left-borders: critical=red, high=orange, medium=yellow, low=sage
