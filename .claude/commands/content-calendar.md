# /content-calendar — Generate Weekly Content Calendar

Generate a 1-week or 4-week content calendar for Panguard AI marketing.

## Input

- Duration: "1 week" (default) or "4 weeks"
- Optional focus: product launch, feature highlight, community growth, etc.

## Calendar Format

For each day, specify:
| Day | Platform | Type | Topic | Target Keyword | Status |

## Platform Schedule

- **Mon**: Twitter (product tip) + Blog draft start
- **Tue**: LinkedIn (thought leadership) + Twitter (threat intel)
- **Wed**: Twitter (behind the scenes) + Blog publish
- **Thu**: LinkedIn (industry insight) + Twitter (comparison)
- **Fri**: Twitter (community) + Blog draft start
- **Sat**: Blog publish + Reddit/HN if appropriate
- **Sun**: Rest / plan next week

## Content Pillars (rotate)

1. **Product Education** — How to use Scan, Guard, Chat, Trap, Report
2. **Threat Intelligence** — Real threat trends, ATR rule spotlights
3. **Open Source** — ATR contributions, community milestones
4. **Compliance** — TCSA, ISO 27001, SOC 2 automation tips
5. **Developer Experience** — CLI tips, MCP integration, CI/CD setup
6. **Industry POV** — Why SMBs are targets, AI security landscape

## SEO Keywords to Target (rotate across blog posts)

- "server security tool for small business"
- "endpoint protection for developers"
- "free server security scan"
- "AI security monitoring CLI"
- "sigma rules explained"
- "YARA rules tutorial"
- "AI agent security threats"
- "open source SIEM alternative"
- "taiwan TCSA compliance"
- "SOC 2 compliance automation"

## Output

Return the calendar as a markdown table. Include direct links to use other skills:

- Use `/write-blog <topic>` to generate blog posts
- Use `/write-twitter <topic>` to generate tweets
- Use `/write-linkedin <topic>` to generate LinkedIn posts

## Context

Read `packages/website/src/data/blog-posts.ts` and `packages/website/src/data/changelog-entries.ts` to avoid duplicating existing content and to find inspiration from recent product changes.
