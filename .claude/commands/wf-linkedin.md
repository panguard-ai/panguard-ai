# /wf-linkedin — LinkedIn Engager to Cold Email Pipeline

Convert LinkedIn post engagers (likes, comments) into qualified leads and send personalized cold emails.

## What This Does
Automates: LinkedIn post URL → PhantomBuster (scrape engagers) → Apollo (enrich) → Million Verifier (verify) → Instantly (cold email)

This is the highest-ROI workflow because these people already showed interest in your topic.

## Prerequisites
- API keys in `marketing/.env`: PHANTOMBUSTER_API_KEY, APOLLO_API_KEY, MILLIONVERIFIER_API_KEY, INSTANTLY_API_KEY
- A LinkedIn post URL (yours or a competitor's post about security/devops)

## Input
User provides a LinkedIn post URL, e.g.:
```
https://www.linkedin.com/feed/update/urn:li:activity:1234567890
```

## Step-by-Step

### 1. Scrape LinkedIn engagers (PhantomBuster)

Use the "LinkedIn Post Likers" phantom:
```bash
curl -s https://api.phantombuster.com/api/v2/agents/launch \
  -H "X-Phantombuster-Key: $PHANTOMBUSTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "<phantom_id>",
    "argument": {
      "postUrl": "<linkedin_post_url>",
      "sessionCookie": "<your_li_at_cookie>"
    }
  }'
```

**Setup required (one-time):**
1. Go to PhantomBuster dashboard
2. Create "LinkedIn Post Likers" phantom
3. Connect your LinkedIn session cookie
4. Note the phantom ID for API calls

Extract from each engager:
- Full name
- LinkedIn URL
- Job title
- Company
- Location

### 2. Enrich contacts (Apollo)

For each engager, enrich:
```bash
curl -s https://api.apollo.io/v1/people/match \
  -H "X-Api-Key: $APOLLO_API_KEY" \
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "organization_name": "TechCorp",
    "linkedin_url": "https://linkedin.com/in/janedoe"
  }'
```

Extract: business email, phone, company size, industry, seniority level.

**Filter for ICP (Ideal Customer Profile):**
- Title contains: CTO, VP Engineering, DevOps, Security, IT Manager, Founder
- Company size: 10-500 employees (SMB sweet spot)
- Industry: Technology, SaaS, E-commerce, FinTech

### 3. Verify emails (Million Verifier)

```bash
# Bulk verify
curl -s "https://api.millionverifier.com/api/v3/?api=$MILLIONVERIFIER_API_KEY&email=jane@techcorp.com"
```

Keep only: "ok" and "catch_all" results.

### 4. Generate personalized emails

**Personalization approach (Cody Schneider style):**
The key insight — they engaged with a post about [topic], so reference that:

**Subject lines (A/B):**
- "Saw you liked [poster's] post about [topic]"
- "Quick question about [their company]'s security"
- "[First name], 60-second server protection"

**Email body:**
```
Hi [First Name],

I noticed you engaged with [poster]'s post about [topic] — clearly something you care about.

I'm building something that directly addresses this: Panguard is an AI-powered security tool that installs on any server in 60 seconds. One CLI command, and you get:

- Real-time threat detection (3,760 Sigma rules + behavioral AI)
- Automated compliance reports (SOC 2, ISO 27001)
- Free tier that actually works (not just a trial)

Would it make sense to show you a quick demo? It's literally a 60-second install.

[Your name]
```

**Personalization variables:**
- {first_name} — from Apollo
- {company} — from Apollo
- {post_topic} — from the LinkedIn post
- {poster_name} — original poster
- {pain_point} — inferred from their title (CTO = budget, DevOps = complexity, Security = coverage)

### 5. Load into Instantly campaign

```bash
curl -s https://api.instantly.ai/api/v1/lead/add \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "$INSTANTLY_API_KEY",
    "campaign_id": "linkedin-engagers",
    "leads": [...]
  }'
```

### 6. Save output

Save to `marketing/output/linkedin/`:
- `engagers-raw.json` — raw PhantomBuster scrape
- `enriched-contacts.json` — Apollo-enriched data
- `verified-leads.json` — email-verified leads
- `email-drafts.md` — personalized emails for review
- `campaign-loaded.md` — confirmation of Instantly upload

## Metrics to Track
- Engagers scraped → Emails found rate (target: 40-60%)
- Email verification pass rate (target: 80%+)
- Email open rate (target: 50%+, since they're warm)
- Reply rate (target: 5-10%)
- Demo booked rate (target: 2-5% of sends)

## Tips
- Best posts to scrape: competitor posts about security challenges
- Best timing: scrape within 48 hours of post going viral
- Volume: 50-200 leads per post is typical
- Frequency: run this weekly on 2-3 high-engagement posts
