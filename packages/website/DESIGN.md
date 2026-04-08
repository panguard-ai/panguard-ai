# Design System of PanGuard AI

## 1. Visual Theme & Atmosphere

PanGuard's interface is a dark security operations center for the AI agent era. Deep warm-black surfaces (`#1A1614`) ground the experience in the seriousness of security work, while a sage green accent (`#8B9A8E`) communicates calm authority, not alarm. This is not a generic SaaS landing page. It is a purpose-built tool for developers who need to protect their AI agents from prompt injection, tool poisoning, and supply chain attacks.

The sage green is the brand's signature. It reads as "monitored, protected, operational" against the warm-dark canvas. Unlike the electric neons of typical security tools, sage conveys quiet competence. The accent green (`#34D399`) activates for interactive elements, CTAs, and positive states, creating a clear visual hierarchy: sage for brand presence, emerald for action.

Typography uses Space Grotesk for headings, delivering geometric authority with a technical edge. Inter carries body text with precision. JetBrains Mono provides code credibility. Noto Sans TC handles Traditional Chinese for the bilingual experience.

The warm undertone throughout (`#1A1614` instead of pure black, `#F5F1E8` instead of pure white) prevents the dark theme from feeling clinical. Every surface has a faint warmth that makes the interface feel like hand-crafted wood, not cold steel.

**Key Characteristics:**
- Warm-black canvas (`#1A1614`) with warm-brown border containment (`#2E2A27`)
- Dual-accent system: Brand Sage (`#8B9A8E`) for identity, Active Emerald (`#34D399`) for interaction
- Warm text palette (`#F5F1E8` primary, `#A09890` secondary) that reads like parchment on dark wood
- Four-font system: Space Grotesk (headings), Inter (body), JetBrains Mono (code), Noto Sans TC (Chinese)
- Security-first visual language: shield iconography, risk gauges, severity color coding
- Bilingual by default: EN + Traditional Chinese (zh-TW)

## 2. Color Palette & Roles

### Primary Brand
- **Brand Sage** (`#8B9A8E`): The defining color. Used for logo, overline text, trust badges, brand presence. Calm, authoritative, distinctive.
- **Sage Light** (`#A3B0A6`): Hover states on sage elements, lighter brand applications
- **Sage Dark** (`#6B7A6E`): Pressed states, darker brand contexts
- **Sage Glow** (`rgba(139, 154, 142, 0.15)`): Subtle glow behind sage elements
- **Sage Wash** (`rgba(139, 154, 142, 0.04)`): Barely-visible tint for section backgrounds

### Active Accent
- **PanGuard Green** (`#34D399`): Primary interactive color. CTAs, scan buttons, active states, positive indicators, trust badges. The "go" signal.
- **Green Light** (`#6EE7B7`): Hover state for green buttons, secondary positive indicators
- **Green Dark** (`#059669`): Pressed state, dark-context green

### Surface & Background
- **Surface 0** (`#1A1614`): Page canvas. The deepest layer. Warm near-black with brown undertone.
- **Surface 1** (`#1F1C19`): Primary card background. One step lighter for contained content.
- **Surface 2** (`#272320`): Elevated surfaces: modals, dropdowns, code blocks. Two steps lighter.
- **Surface 3** (`#302B27`): Highest elevation: tooltips, active nav items. Three steps.

### Border
- **Default** (`#2E2A27`): Standard borders. Warm brown, not cold gray.
- **Hover** (`#3D3835`): Border hover state. Noticeably lighter.
- **Subtle** (`#242120`): Minimal separation borders. Almost invisible.

### Text
- **Primary** (`#F5F1E8`): Main text. Warm off-white with a parchment quality.
- **Secondary** (`#A09890`): Supporting text, descriptions. Warm mid-gray.
- **Tertiary/Muted** (`#9A9490`): De-emphasized text, metadata, timestamps.

### Severity (Security-Specific)
- **Critical** (`#EF4444` / red-400): Highest severity findings, blocked threats
- **High** (`#F97316` / orange-400): High-severity findings, warnings
- **Medium** (`#EAB308` / yellow-400): Medium-severity, caution states
- **Low** (`#34D399` / emerald-400): Low risk, clean scan results
- **Info** (`#9CA3AF` / gray-400): Informational findings, neutral

### Semantic
- **PanGuard Red** (`#C75050`): Destructive actions, critical alerts, threat blocked
- **Success**: Uses PanGuard Green (`#34D399`)
- **Warning**: Uses severity yellow (`#EAB308`)

## 3. Typography Rules

### Font Families
- **Display/Headings**: `Space Grotesk`, with fallbacks: `system-ui, -apple-system, sans-serif`
- **Body/UI**: `Inter`, with fallbacks: `system-ui, sans-serif`
- **Code**: `JetBrains Mono`, with fallbacks: `SF Mono, Menlo, Monaco, Consolas, monospace`
- **Chinese**: `Noto Sans TC`, with fallbacks: `PingFang TC, Microsoft JhengHei`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Hero Display | Space Grotesk | clamp(24px, 5vw, 48px) | 700 | 1.3 | -0.02em | Homepage hero, fluid scaling |
| Section Heading | Space Grotesk | 24-30px (1.5-1.875rem) | 700 | 1.1 | -0.01em | Section titles |
| Card Title | Space Grotesk | 18-20px (1.125-1.25rem) | 600 | 1.25 | normal | Card headings, feature names |
| Overline | Inter | 11px (0.688rem) | 600 | 1.0 | 0.15em | `text-transform: uppercase`, sage green color |
| Body | Inter | 14-16px (0.875-1rem) | 400 | 1.5-1.65 | normal | Standard text |
| Body Emphasis | Inter | 14-16px | 600 | 1.5 | normal | Bold body, nav items |
| Small Text | Inter | 12-13px (0.75-0.813rem) | 400-500 | 1.4 | normal | Metadata, timestamps |
| Micro Label | Inter | 10-11px (0.625-0.688rem) | 600 | 1.0 | 0.1em | Badge text, tiny labels |
| Code | JetBrains Mono | 12-14px | 400 | 1.5 | normal | Code blocks, CLI commands |
| Badge | Inter | 11-12px | 500-600 | 1.0 | normal | Trust badges, category badges |

## 4. Component Stylings

### Buttons

| Variant | Background | Text | Border | Border Radius | Padding | States |
|---------|-----------|------|--------|--------------|---------|--------|
| Primary CTA | `#34D399` | `#FFFFFF` | none | 12px (rounded-xl) | 16px 28px | Hover: `#6EE7B7`, Active: scale(0.98) |
| Ghost | transparent | `#A09890` | `#2E2A27` | 9999px (full) | 12px 32px | Hover: text `#F5F1E8`, border `#8B9A8E` |
| Tab Active | `rgba(52,211,153,0.15)` | `#34D399` | `rgba(52,211,153,0.3)` | 8px | 8px 16px | Solid feel on dark |
| Tab Inactive | transparent | `#9A9490` | none | 8px | 8px 16px | Hover: text `#A09890` |

### Cards
- Background: `Surface 1` (`#1F1C19`)
- Border: `#2E2A27`, 1px solid
- Border Radius: 16px (rounded-2xl)
- Hover: border transitions to `rgba(139,154,142,0.4)` (sage glow)
- Padding: 24px (p-6)
- Card Glow class: subtle sage shadow on hover

### Input Fields
- Background: `rgba(31,28,25,0.8)` with `backdrop-blur-sm`
- Border: `#2E2A27`, transitions to `#34D399` on focus
- Focus ring: `rgba(52,211,153,0.3)` 1px
- Border Radius: 12px
- Padding: 16px with left icon space (40px left)
- Placeholder: `#9A9490`

### Risk Gauge (Scanner-Specific)
- Bar background: `Surface 2` (`#272320`)
- Bar fill: gradient by severity (emerald/yellow/orange/red)
- Score: 2xl extrabold, severity-colored
- Level badge: uppercase, severity-colored background at 10% opacity

### Trust Badges
- Background: `rgba(31,28,25,0.3)`
- Border: `rgba(46,42,39,0.5)`
- Border Radius: 9999px (full)
- Text: `#9A9490`, 11-12px
- Padding: 6px 12px
- Layout: horizontal flex-wrap, centered

### Navigation
- Background: transparent, sticky top
- Logo: shield icon + "PANGUARD AI" text, sage green on hover
- Links: 14px Inter, `#A09890`, hover `#F5F1E8`
- Active CTA: "Install" button, PanGuard Green, rounded-full
- Language toggle: EN/ZH buttons, pill style
- Mobile: hamburger menu (not defined yet, needs spec)

## 5. Layout Principles

### Spacing Scale
Based on 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128

### Content Width
- Max content: 1200px (max-w-5xl)
- Narrow content: 700px (scanner, blog)
- Wide content: 1440px (full-bleed hero)

### Section Rhythm
- Section padding: 48-80px vertical (py-12 to py-20)
- Section separation: 1px border-border/30 or gradient transitions
- Hero: full-viewport height, centered content
- Content sections: alternating dark/darker backgrounds

### Grid
- Homepage: single-column, max-w centered
- Blog: 2-column grid (md:grid-cols-2) with gap-6
- Feature cards: 3-column (sm:grid-cols-3) with gap-4
- Stats: 2x2 or 4-column (grid-cols-2 sm:grid-cols-4)

### Whitespace Philosophy
- Generous vertical padding between sections (64-96px)
- Tight internal padding in cards (24px)
- Scanner section: compact, above-the-fold focused
- Below-fold content earns its scroll with new information density

## 6. Depth & Elevation

### Shadow System
- **Card hover**: `0 0 15px rgba(139,154,142,0.1)` (sage glow)
- **Modal/dropdown**: `0 20px 60px rgba(0,0,0,0.3)`
- **Cookie banner**: `shadow-lg` (system default large shadow)
- **Scanner result**: `shadow-2xl` on result card container
- **No shadows on flat surfaces**: Surface elevation is via background color, not shadow

### Surface Hierarchy
```
Surface 0 (#1A1614) — Page canvas
  Surface 1 (#1F1C19) — Cards, contained content
    Surface 2 (#272320) — Code blocks, elevated panels
      Surface 3 (#302B27) — Tooltips, active states
```

### Frosted Glass
- Cookie banner: `backdrop-blur-sm` with `bg-surface-1/95`
- Scanner input: `bg-surface-1/80 backdrop-blur-sm`

## 7. Do's and Don'ts

### Do
- Use sage green for brand presence, emerald green for interactive
- Use warm off-whites (`#F5F1E8`) not pure white
- Use warm dark surfaces (`#1A1614`) not pure black
- Show real security data (108 rules, 96.9% recall, 90K+ scanned)
- Keep overlines uppercase, 11px, 0.15em letter-spacing, sage colored
- Use severity colors consistently (red=critical, orange=high, yellow=medium, green=low)
- Use shield iconography for security context
- Provide bilingual content (EN + zh-TW) for all user-facing text

### Don't
- Don't use emojis in UI components or code
- Don't use pure black (#000000) or pure white (#FFFFFF) for surfaces
- Don't use blue/purple as primary accent (that's Sentry's territory)
- Don't imply paid features exist (everything is MIT licensed, free)
- Don't use generic SaaS card grids as first impression
- Don't use stock photography or decorative illustrations
- Don't center-align everything (left-align body text, center-align only heroes and badges)
- Don't use more than 2 accent colors on any single screen
- Don't hardcode numbers (use stats.ts as single source of truth)

## 8. Responsive Behavior

### Breakpoints
- Mobile: < 640px (default)
- Tablet: >= 640px (`sm:`)
- Desktop: >= 768px (`md:`)
- Wide: >= 1024px (`lg:`)
- Ultra-wide: >= 1280px (`xl:`)

### Mobile Adaptations
- Hero text: clamp(24px, 5vw, 48px) scales down naturally
- Trust badges: flex-wrap, 2 rows on mobile
- Scanner: full-width input + button stacked
- Blog grid: single column
- Navigation: hamburger menu (needs implementation)
- Platform ticker: horizontal scroll, smaller text
- Section padding: reduces from py-20 to py-12

### Touch Targets
- Minimum: 44px height for all tappable elements
- Buttons: py-3.5 minimum (14px + padding = ~44px)
- Badge buttons: py-1.5 minimum but grouped (not primary interaction)

### Collapsing Strategy
- 3-column grids → single column on mobile
- Stat cards: 2x2 grid maintained on mobile (grid-cols-2)
- Scanner tabs: full-width buttons
- Cookie banner: bottom-right corner, compact

## 9. Agent Prompt Guide

### Quick Color Reference
```
--brand-sage: #8B9A8E
--brand-sage-light: #A3B0A6
--panguard-green: #34D399
--panguard-green-light: #6EE7B7
--surface-0: #1A1614
--surface-1: #1F1C19
--surface-2: #272320
--surface-3: #302B27
--border: #2E2A27
--text-primary: #F5F1E8
--text-secondary: #A09890
--text-muted: #9A9490
--severity-critical: #EF4444
--severity-high: #F97316
--severity-medium: #EAB308
--severity-low: #34D399
```

### Ready-to-Use Prompts
- "Build a dark card component using surface-1 background, border default, 16px radius, sage glow on hover"
- "Create a CTA button: panguard-green background, white text, rounded-xl, scale-98 active state"
- "Build a severity badge: uppercase, 10px, severity color text on 10% opacity severity background"
- "Build a section with overline (uppercase, 11px, sage, 0.15em spacing) + heading (Space Grotesk, 24-30px, bold) + body (Inter, 14-16px, text-secondary)"
- "Build a trust badge row: flex-wrap centered, rounded-full pills, border-border/50, text-muted 11px"
