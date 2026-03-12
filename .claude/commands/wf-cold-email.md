# /wf-cold-email — Direct Cold Email Campaign

Build a targeted cold email campaign from scratch using Apollo prospecting.

## What This Does
Apollo (prospect) → Million Verifier (verify) → Claude (personalize) → Instantly (send)

Use this when you don't have a LinkedIn post to scrape — you're going outbound to a specific ICP.

## Input
User provides target criteria, e.g.:
- "CTO at SaaS companies, 20-200 employees, Taiwan"
- "DevOps engineers at fintech startups, US"
- "IT managers at e-commerce companies"

## Step-by-Step

### 1. Prospect with Apollo

```bash
curl -s https://api.apollo.io/v1/mixed_people/search \
  -H "X-Api-Key: $APOLLO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "person_titles": ["CTO", "VP Engineering", "Head of Security"],
    "organization_num_employees_ranges": ["11,50", "51,200"],
    "person_locations": ["Taiwan"],
    "organization_industry_tag_ids": ["technology"],
    "page": 1,
    "per_page": 100
  }'
```

**Panguard ICP Segments:**

| Segment | Titles | Company Size | Industry | Region |
|---------|--------|-------------|----------|--------|
| Taiwan SMB | CTO, IT Manager | 10-200 | Tech, E-commerce | Taiwan |
| US Startups | CTO, DevOps Lead | 10-100 | SaaS, FinTech | US |
| APAC DevOps | DevOps Engineer, SRE | 20-500 | Technology | APAC |

### 2. Verify emails (Million Verifier)

Batch verify all emails. Discard invalid.

### 3. Segment and personalize

**Segment by pain point:**

| Segment | Pain Point | Angle |
|---------|-----------|-------|
| No security team | "You probably don't have a dedicated security person" | DIY security in 60 seconds |
| Compliance pressure | "SOC 2 / ISO 27001 deadline coming?" | Automated compliance reports |
| Cost sensitive | "CrowdStrike quoted you $50k/year?" | Free tier + $29/mo Pro |
| Developer-led | "Your devs are also your security team" | CLI-first, developer-friendly |

**Email sequence (4 emails):**

**Email 1 — Pain point hook:**
```
Subject: [Company] + server security (quick question)

Hi [First Name],

Running a [company_size]-person [industry] company means security probably falls on whoever has time — which is nobody.

I built Panguard because I had the same problem. It's a CLI tool that installs in 60 seconds and gives you:
- 24/7 threat detection with AI
- Automated SOC 2 / ISO 27001 reports
- Open source, MIT licensed

Would a 5-minute demo make sense?

[Name]
```

**Email 2 (Day 3) — Value add:**
```
Subject: Re: [Company] + server security

[First Name], quick follow-up.

I put together a free security scan you can run right now — no signup, no installation:

curl -fsSL https://get.panguard.ai | sh && panguard scan

Takes 60 seconds. You'll get a PDF report with risk score, open ports, CVE vulnerabilities, and remediation steps.

Might be useful even if Panguard isn't a fit.

[Name]
```

**Email 3 (Day 7) — Social proof:**
```
Subject: How [similar company] secured their servers in under a minute

[First Name],

A [similar_industry] company with [similar_size] employees just ran our free scan and found 3 critical vulnerabilities they didn't know about.

They're now running Panguard Guard 24/7 on their Pro plan ($29/mo for 10 machines).

Want me to show you what it finds on your servers?

[Name]
```

**Email 4 (Day 14) — Breakup:**
```
Subject: closing the loop

[First Name],

I don't want to be annoying, so this is my last note.

If server security ever becomes a priority, here's what we do: https://panguard.ai

The free scan is always available: curl -fsSL https://get.panguard.ai | sh && panguard scan

Cheers,
[Name]
```

### 4. Load into Instantly

Create campaign with the 4-email sequence, proper delays, and tracking.

### 5. Save output

Save to `marketing/output/emails/`:
- `prospects.json` — Apollo results
- `verified.json` — verified leads
- `sequences/` — email sequences per segment
- `campaign-config.json` — Instantly campaign settings

## Volume Guidelines
- Start with 50 emails/day (warm up period)
- Scale to 200/day after 2 weeks
- Use 3-5 sending accounts (rotate via Instantly)
- Monitor bounce rate (keep < 3%) and spam complaints (keep < 0.1%)
