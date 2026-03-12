# /setup-mcp — Configure Marketing MCP Servers

Guide the user through setting up MCP servers for marketing automation.

## Available MCP Servers

### 1. Twitter/X MCP (Post & Search)

```bash
# Install via Claude Code
claude mcp add twitter -- npx -y @enescinar/twitter-mcp

# Or via Smithery
npx -y @smithery/cli install @rafaljanicki/x-twitter-mcp-server --client claude
```

**Required env vars** (set in `.claude/settings.local.json` or env):

- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_TOKEN_SECRET`

**Get credentials:** https://developer.x.com/en/portal/dashboard

- Create a project + app
- Set app permissions to "Read and Write"
- Generate Access Token and Secret

### 2. SE Ranking MCP (SEO Data)

```bash
# Requires Docker
claude mcp add seo-data-api-mcp \
  -e SERANKING_API_TOKEN=your_token \
  -e SERANKING_SITE_ID=your_site_id \
  -- docker run -i --rm \
  -e SERANKING_API_TOKEN \
  -e SERANKING_SITE_ID \
  ghcr.io/seranking/seo-data-api-mcp-server
```

**Get credentials:** https://seranking.com (requires paid plan)

### 3. GitHub MCP (for ATR repo management)

```bash
claude mcp add github -- npx -y @modelcontextprotocol/server-github

# Set env var
export GITHUB_PERSONAL_ACCESS_TOKEN=your_token
```

### 4. OpenTweet MCP (Schedule Tweets)

```bash
claude mcp add opentweet -- npx -y @opentweet/mcp-server
```

**Get API key:** https://opentweet.io

## Quick Setup (Recommended Stack)

For a solopreneur marketing setup, install in this order:

1. **Twitter MCP** — Post and search tweets directly from Claude Code
2. **GitHub MCP** — Manage ATR repo issues, PRs, releases
3. **SE Ranking MCP** — Keyword research and rank tracking (if budget allows)

## Verification

After setup, run:

```bash
claude mcp list
```

Then test each server:

- Twitter: "Search for recent tweets about endpoint security"
- GitHub: "List open issues on panguard/atr repo"
- SEO: "Get keyword data for 'server security tool'"
