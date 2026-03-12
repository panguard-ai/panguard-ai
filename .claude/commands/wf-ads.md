# /wf-ads — Batch Ad Variant Generation

Generate 50-100 ad copy variants from pain point research, then create renderable ad images.

## What This Does
Takes pain points from `/wf-research` output, generates massive ad variant batches, and creates React components that render to 1080x1080 images for Facebook/Instagram ads.

## Prerequisites
- Run `/wf-research` first (or provide pain points manually)
- Pain points data at `marketing/output/pain-points.json`

## Step-by-Step

### 1. Load pain points
Read `marketing/output/pain-points.json`. If not found, ask user to run `/wf-research` first.

### 2. Generate ad copy variants

For each pain point, generate variants across these frameworks:

**Framework A: Problem-Agitate-Solve (PAS)**
- Problem: State the pain
- Agitate: Make it worse
- Solve: Panguard fixes it

**Framework B: Before-After-Bridge (BAB)**
- Before: Life without Panguard
- After: Life with Panguard
- Bridge: How to get there (install in 60s)

**Framework C: Feature-Advantage-Benefit (FAB)**
- Feature: What it does
- Advantage: Why it's better
- Benefit: What user gains

**Ad Copy Format (per variant):**
```
Headline (max 40 chars): "Your Server Is Unprotected Right Now"
Primary text (max 125 chars): "60% of hacked SMBs close within 6 months. Install Panguard in 60 seconds. Open source."
CTA: "Get Protected Free"
Link: https://panguard.ai/early-access
```

### 3. Generate at least 50 variants
- 10 per pain point category
- Mix frameworks (PAS, BAB, FAB)
- Vary tone: fear, empowerment, technical, casual
- Vary CTA: "Get Started Free", "Scan Your Server", "See Demo", "Start Protecting"

### 4. Create React ad component

Generate a simple React component at `marketing/templates/AdCard.tsx`:

```tsx
interface AdCardProps {
  headline: string;
  body: string;
  cta: string;
  variant: 'dark' | 'light' | 'sage';
}

// 1080x1080 card with Panguard branding
// Dark: #1A1614 bg, #F5F1E8 text
// Sage: #8B9A8E accent
// Use system fonts, no external dependencies
```

### 5. Save output

Save all variants to `marketing/output/ads/variants.json`:
```json
[
  {
    "id": "ad-001",
    "pain_point": "server hacked no monitoring",
    "framework": "PAS",
    "headline": "Your Server Is Unprotected",
    "primary_text": "60% of hacked SMBs close within 6 months...",
    "cta": "Get Protected Free",
    "link": "https://panguard.ai/early-access",
    "variant_style": "dark"
  }
]
```

Also save a human-readable `marketing/output/ads/variants.md` for easy review.

### 6. Testing strategy

Include a testing plan:
- Upload all variants to Facebook Ads Manager
- Set $5/day per variant, run for 3 days
- Kill variants with CTR < 1%
- Scale winners to $50/day
- Take top 3 winners → make polished versions with Canva/Figma

## Output
- `marketing/output/ads/variants.json` — structured ad data
- `marketing/output/ads/variants.md` — human-readable review
- `marketing/templates/AdCard.tsx` — React component for rendering
