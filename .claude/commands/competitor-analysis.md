# /competitor-analysis — Analyze Competitor Positioning

Research and analyze competitors in the endpoint security / developer security space.

## Input
The user may specify a competitor name, or say "overview" for a general landscape analysis.

## Research Steps

1. **Web search** for the competitor's:
   - Pricing page
   - Product features
   - Target audience
   - Recent blog posts / announcements
   - GitHub presence (if open source)

2. **Compare against Panguard** on these dimensions:

| Dimension | Panguard | Competitor |
|-----------|----------|------------|
| Pricing | Free / $9 / $29 / $79 | ? |
| Install time | 60 seconds, 1 command | ? |
| Target audience | Developers, SMBs | ? |
| Open source | ATR rules (MIT) | ? |
| AI capabilities | 3-tier funnel, 5 agents | ? |
| Detection rules | 3,760 Sigma + 5,961 YARA + ATR | ? |
| Compliance | TCSA, ISO 27001, SOC 2 | ? |
| CLI-first | Yes | ? |

3. **Identify Panguard advantages** — what to highlight in marketing
4. **Identify gaps** — what competitors offer that Panguard doesn't yet
5. **Suggest content angles** — blog posts, comparison pages, social posts

## Key Competitors to Track
- CrowdStrike (enterprise, expensive)
- SentinelOne (enterprise, AI-focused)
- Wazuh (open source SIEM)
- OSSEC (open source HIDS)
- Fail2ban (free, limited)
- Cloudflare Zero Trust (network-focused)

## Output
Return a structured comparison report with actionable marketing recommendations.
