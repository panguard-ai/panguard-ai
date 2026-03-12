# /growth-metrics — Check Growth Metrics & Suggest Actions

Analyze current growth metrics and suggest next actions.

## Data Sources to Check

1. **Website Analytics** (manual — user provides Plausible data)
   - Total visitors (daily/weekly/monthly)
   - Top pages by traffic
   - Referral sources
   - Geographic distribution
   - Bounce rate on key pages

2. **GitHub Metrics** (can check via CLI)
   - Stars on main repo and ATR repo
   - Forks, issues, PRs
   - Contributors count
   - Recent activity

3. **Content Metrics**
   - Read `packages/website/src/data/blog-posts.ts` — count published posts
   - Read `packages/website/src/data/changelog-entries.ts` — recent updates
   - Check blog post dates — publishing frequency

4. **SEO Metrics** (manual — user provides Search Console data)
   - Indexed pages
   - Search impressions
   - Click-through rate
   - Top queries

## Analysis Framework

For each metric area, provide:

1. **Current state** — what the numbers say
2. **Benchmark** — what good looks like for a pre-launch/early-stage security SaaS
3. **Gap** — where you're behind
4. **Action** — specific next step to improve

## Growth Levers (prioritized)

1. **SEO content** — blog posts targeting long-tail keywords
2. **Open source community** — GitHub stars, ATR contributions
3. **Product-led growth** — free Scan tool as top-of-funnel
4. **Developer relations** — conference talks, podcasts, guest posts
5. **Partnerships** — MSPs, IT consultancies, hosting providers

## Output

Return a dashboard-style summary with red/yellow/green indicators and the top 3 actions for this week.
