# /wf-research — Pain Point Research (Perplexity API)

Research real customer pain points from Reddit, forums, and social media to fuel ad copy and content.

## What This Does
Uses Perplexity API to search Reddit, HN, and forums for real conversations about the pain points Panguard solves. Outputs structured pain point data for ad generation.

## Step-by-Step

### 1. Load environment
Read `marketing/.env` for `PERPLEXITY_API_KEY`.

### 2. Define search queries
For Panguard, search these pain point categories:

**Security pain points:**
- "server got hacked what do I do" site:reddit.com
- "small business cybersecurity too expensive" site:reddit.com
- "endpoint security for startups" site:reddit.com
- "how to secure linux server" site:reddit.com
- "ransomware small business" site:reddit.com

**Compliance pain points:**
- "SOC 2 compliance small team" site:reddit.com
- "ISO 27001 too expensive small company" site:reddit.com
- "taiwan cybersecurity regulation" site:reddit.com

**Developer pain points:**
- "security monitoring for side project" site:reddit.com
- "SIEM too complex for small team" site:reddit.com
- "free server monitoring tool" site:reddit.com

### 3. Call Perplexity API
For each query, call:
```bash
curl -s https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-sonar-large-128k-online",
    "messages": [
      {"role": "system", "content": "Extract the top 5 most common pain points from Reddit discussions. For each, quote the exact words people use. Format as JSON."},
      {"role": "user", "content": "<search query>"}
    ]
  }'
```

### 4. Structure output
Save to `marketing/output/pain-points.json`:
```json
{
  "date": "2026-03-08",
  "pain_points": [
    {
      "category": "security",
      "pain": "Got hacked and had no monitoring",
      "exact_quote": "I woke up to find my server mining crypto...",
      "source": "r/sysadmin",
      "frequency": "high",
      "panguard_solution": "Guard detects crypto mining in real-time via behavioral AI",
      "ad_angle": "Your server could be mining crypto right now. Would you even know?"
    }
  ]
}
```

### 5. Generate ad angles
From each pain point, generate 3 ad copy variants:
- **Fear-based**: "X% of small businesses that get hacked close within 6 months"
- **Solution-based**: "One command. 60 seconds. Your server is now protected."
- **Social proof**: "Join 500+ developers who stopped worrying about server security"

Save to `marketing/output/ad-angles.md`.

## Output
- `marketing/output/pain-points.json` — structured pain point data
- `marketing/output/ad-angles.md` — ready-to-use ad copy variants
