# /write-blog — Generate SEO Blog Post for Panguard AI

You are writing a blog post for Panguard AI (https://panguard.ai), an AI-powered endpoint security platform.

## Input

The user will provide a topic or keyword. If no topic is given, suggest 3 topics from the content calendar.

## Brand Context

- Product: CLI security tool for developers and SMBs
- Installs in 60 seconds, single command
- 5 tools: Scan, Guard, Chat, Trap, Report
- 5-agent AI pipeline (Detect, Analyze, Respond, Report, Chat)
- 3-tier AI funnel: local rules 90%, local AI 7%, cloud AI 3%
- Detection: 3,760 Sigma rules + 5,961 YARA signatures + ATR rules
- Pricing: Free / $9 / $29 / $79 per month
- Open source ATR (Agent Threat Rules) format

## Output Requirements

1. **Read existing blog posts** from `packages/website/src/data/blog-posts.ts` to understand format and avoid duplicate topics
2. **Generate the blog post** with:
   - SEO-optimized title (include primary keyword, under 60 chars)
   - Meta description (under 155 chars)
   - Slug (lowercase, hyphenated)
   - 1,200-2,000 words
   - H2/H3 structure for featured snippets
   - Include one quotable definition paragraph (1-2 sentences, factual, cite-worthy)
   - Natural keyword density (primary keyword 3-5 times)
   - Internal links to relevant Panguard pages
   - CTA at the end linking to /early-access or /pricing
3. **Add the entry** to `packages/website/src/data/blog-posts.ts`
4. **Create the blog content file** following the existing blog post pattern
5. **Add translations** to both `packages/website/messages/en.json` and `packages/website/messages/zh.json` if needed

## SEO Checklist

- [ ] Title contains primary keyword
- [ ] First paragraph contains primary keyword
- [ ] At least 2 internal links
- [ ] One external authoritative link
- [ ] Alt text concept for any described images
- [ ] Schema-friendly structure (lists, definitions, how-to steps)

## Tone

Professional but approachable. Write for developers and IT admins who are skeptical of security vendor marketing. Use concrete numbers and technical details. No fluff, no emojis.
