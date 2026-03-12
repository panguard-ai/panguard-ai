# /seo-audit — Run SEO Audit on Panguard Website

Perform a comprehensive SEO audit of the Panguard AI website.

## Steps

1. **Check sitemap coverage**
   - Read `packages/website/src/app/sitemap.ts`
   - Glob all `page.tsx` files under `packages/website/src/app/[locale]/`
   - Compare: report any pages missing from sitemap

2. **Check metadata completeness**
   - For each page.tsx with `generateMetadata`, verify:
     - title is set
     - description is set
     - openGraph title + description + image
     - alternates (hreflang) via `buildAlternates()`
   - Report pages missing any of these

3. **Check JSON-LD coverage**
   - Search for `application/ld+json` across all pages
   - Report which Schema.org types are used where
   - Suggest missing schemas (e.g., HowTo, Product, FAQ)

4. **Check translation completeness**
   - Compare key counts between `messages/en.json` and `messages/zh.json`
   - Report missing translation keys

5. **Check internal linking**
   - Search for `<Link href=` patterns
   - Identify orphan pages (pages not linked from any other page)

6. **Check llms.txt coverage**
   - Read `public/llms.txt`
   - Compare against all public pages
   - Report missing pages

## Output

Produce a markdown table with:
| Category | Status | Issues Found | Priority |

End with an actionable fix list sorted by priority (HIGH/MEDIUM/LOW).
