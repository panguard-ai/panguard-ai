# /wf-podcast — Podcast Cold Outreach Pipeline

Find relevant podcasts, verify host emails, and send personalized cold outreach to get booked as a guest.

## What This Does
Automates the entire podcast guest booking pipeline:
Rephonic (find podcasts) → Apollo (enrich contact) → Million Verifier (verify email) → Instantly (send outreach)

## Prerequisites
- API keys in `marketing/.env`: REPHONIC_API_KEY, APOLLO_API_KEY, MILLIONVERIFIER_API_KEY, INSTANTLY_API_KEY

## Step-by-Step

### 1. Find target podcasts (Rephonic API)

Search categories relevant to Panguard:
- "cybersecurity"
- "developer tools"
- "startup technology"
- "small business"
- "open source"
- "devops"
- "information security"

Filter criteria:
- Audience size: 500-50,000 (sweet spot — big enough to matter, small enough to get booked)
- Active: published episode in last 30 days
- Language: English (primary), Chinese (secondary)
- Has guest interviews (not solo shows)

```bash
# Rephonic API call pattern
curl -s https://api.rephonic.com/v1/podcasts/search \
  -H "Authorization: Bearer $REPHONIC_API_KEY" \
  -d '{"query": "cybersecurity", "min_listeners": 500, "max_listeners": 50000}'
```

### 2. Enrich host contacts (Apollo API)

For each podcast host, enrich via Apollo:
```bash
curl -s https://api.apollo.io/v1/people/match \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $APOLLO_API_KEY" \
  -d '{"name": "Host Name", "organization_name": "Podcast Name"}'
```

Extract: email, LinkedIn, title, company.

### 3. Verify emails (Million Verifier)

```bash
curl -s "https://api.millionverifier.com/api/v3/?api=$MILLIONVERIFIER_API_KEY&email=host@example.com"
```

Only keep emails with result: "ok" or "catch_all". Discard "invalid" and "disposable".

### 4. Generate personalized pitch emails

For each verified host, generate a personalized pitch:

**Subject line options (A/B test):**
- "Guest pitch: How a solo dev built an AI security platform"
- "The 60-second server protection story — podcast guest idea"
- "[Podcast Name] guest idea: Open-source AI security"

**Email template:**
```
Hi [First Name],

I've been listening to [Podcast Name] — your episode about [recent_episode_topic] really resonated with me.

I'm building Panguard AI, an open-source endpoint security tool that installs in 60 seconds. We're trying to solve security for the 99% of businesses that can't afford CrowdStrike.

A few angles that might work for your audience:
- How one person can replace a SOC team with AI agents
- Why open-source security rules (like our ATR format) matter
- The 3 AM story: what happens when an AI catches a breach while you sleep

Happy to chat about what fits best. Here's a quick overview: https://panguard.ai

[Your name]
Founder, Panguard AI
```

**Personalization rules:**
- Reference their most recent episode by title
- Match their audience (developer show = technical angle, business show = ROI angle)
- Keep under 150 words
- No attachments, no links in first email except panguard.ai

### 5. Load into Instantly

```bash
curl -s https://api.instantly.ai/api/v1/lead/add \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "$INSTANTLY_API_KEY",
    "campaign_id": "podcast-outreach",
    "leads": [
      {
        "email": "host@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "company_name": "Security Weekly",
        "custom_variables": {
          "podcast_name": "Security Weekly",
          "recent_episode": "AI in Cybersecurity"
        }
      }
    ]
  }'
```

### 6. Save output

Save to `marketing/output/podcasts/`:
- `target-list.json` — all found podcasts with host info
- `verified-contacts.json` — verified email contacts
- `pitch-emails.md` — generated pitch emails for review
- `campaign-stats.md` — sent/open/reply tracking

## Output
Complete podcast outreach pipeline data in `marketing/output/podcasts/`

## Follow-up sequence (automated via Instantly)
- Day 0: Initial pitch
- Day 3: Follow-up if no reply ("Just bumping this up...")
- Day 7: Value-add follow-up (share a relevant blog post)
- Day 14: Break-up email ("No worries if the timing isn't right...")
