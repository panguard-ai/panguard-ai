# /launch-checklist — Pre-Launch & Launch Day Checklist

Run through the complete launch readiness checklist for Panguard AI.

## Pre-Launch Technical Checks

1. **Build & Deploy**
   - Run `pnpm --filter website build` — verify zero errors
   - Check Vercel deployment status
   - Verify all pages render correctly (spot check 5 random pages)

2. **SEO Infrastructure**
   - Verify `https://panguard.ai/sitemap.xml` returns valid XML
   - Verify `https://panguard.ai/robots.txt` is accessible
   - Verify `https://panguard.ai/llms.txt` is accessible
   - Verify `https://panguard.ai/feed.xml` returns valid RSS
   - Check Google Search Console for indexing errors
   - Test OG images: paste URLs into https://www.opengraph.xyz/

3. **Performance**
   - Run Lighthouse on homepage, pricing, product pages
   - Target: Performance > 90, SEO > 95, Accessibility > 90
   - Check Core Web Vitals in Search Console

4. **Security Headers**
   - Verify CSP, HSTS, X-Frame-Options are set
   - Run https://securityheaders.com on panguard.ai

5. **Links**
   - Check for broken links (internal + external)
   - Verify all CTA buttons link to correct pages
   - Test early-access and demo forms submit correctly

## Launch Day Sequence

### T-1 Day (Preparation)
- [ ] Draft Product Hunt listing (tagline, description, 5 images, maker comment)
- [ ] Draft Show HN post (plain text, no marketing speak)
- [ ] Pre-write 5 tweets for launch day thread
- [ ] Pre-write LinkedIn announcement
- [ ] Email early access list (if any)

### T-0 (Launch Day)
- [ ] Submit to Product Hunt at 12:01 AM PT
- [ ] Post Show HN at 8 AM PT / 11 PM Taipei
- [ ] Tweet launch thread
- [ ] Post LinkedIn announcement
- [ ] Post to r/netsec, r/cybersecurity, r/selfhosted (follow subreddit rules)
- [ ] Monitor PH and HN for comments — respond quickly
- [ ] Share launch link with friends/network for initial upvotes

### T+1 Day (Follow-up)
- [ ] Thank voters and commenters
- [ ] Write "lessons learned" tweet thread
- [ ] Check analytics for traffic spike sources
- [ ] Follow up with any interested users/leads

## Output
For each item, check the current state and report:
- PASS / FAIL / SKIP
- Action needed if FAIL
