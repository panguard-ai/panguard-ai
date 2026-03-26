#!/usr/bin/env bash
# PanGuard Usage Dashboard — 拉所有使用量數據
# Usage: bash scripts/usage-dashboard.sh

set -e

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}  PanGuard Usage Dashboard${RESET}"
echo -e "  $(date '+%Y-%m-%d %H:%M')"
echo "  ════════════════════════════════════════"
echo ""

# --- npm Downloads ---
echo -e "${BOLD}  npm Downloads${RESET}"
PGA=$(curl -s "https://api.npmjs.org/downloads/point/last-week/@panguard-ai/panguard" | python3 -c "import json,sys;print(json.load(sys.stdin).get('downloads',0))" 2>/dev/null)
ATR=$(curl -s "https://api.npmjs.org/downloads/point/last-week/agent-threat-rules" | python3 -c "import json,sys;print(json.load(sys.stdin).get('downloads',0))" 2>/dev/null)
PGA_TOTAL=$(curl -s "https://api.npmjs.org/downloads/point/2026-01-01:$(date +%Y-%m-%d)/@panguard-ai/panguard" | python3 -c "import json,sys;print(json.load(sys.stdin).get('downloads',0))" 2>/dev/null)
ATR_TOTAL=$(curl -s "https://api.npmjs.org/downloads/point/2026-01-01:$(date +%Y-%m-%d)/agent-threat-rules" | python3 -c "import json,sys;print(json.load(sys.stdin).get('downloads',0))" 2>/dev/null)

echo -e "  ${CYAN}PanGuard${RESET}  ${PGA}/week  ${DIM}(${PGA_TOTAL} total since Jan)${RESET}"
echo -e "  ${CYAN}ATR${RESET}       ${ATR}/week  ${DIM}(${ATR_TOTAL} total since Jan)${RESET}"
echo ""

# --- Threat Cloud ---
echo -e "${BOLD}  Threat Cloud (tc.panguard.ai)${RESET}"
TC_STATS=$(curl -s "https://tc.panguard.ai/api/stats" 2>/dev/null)
TC_RULES=$(echo "$TC_STATS" | python3 -c "import json,sys;d=json.load(sys.stdin).get('data',{});print(d.get('totalRules',0))" 2>/dev/null)
TC_THREATS=$(echo "$TC_STATS" | python3 -c "import json,sys;d=json.load(sys.stdin).get('data',{});print(d.get('totalThreats',0))" 2>/dev/null)
TC_HEALTH=$(curl -s "https://tc.panguard.ai/health" | python3 -c "import json,sys;d=json.load(sys.stdin);u=d.get('data',{}).get('uptime',0);h=int(u//3600);m=int((u%3600)//60);print(f'{h}h {m}m')" 2>/dev/null)

echo -e "  Rules:    ${GREEN}${TC_RULES}${RESET}"
echo -e "  Threats:  ${TC_THREATS}"
echo -e "  Uptime:   ${TC_HEALTH}"
echo ""

# --- ATR Proposals ---
echo -e "${BOLD}  ATR Flywheel${RESET}"
TC_PROPOSALS=$(curl -s "https://tc.panguard.ai/api/atr-proposals" | python3 -c "import json,sys;d=json.load(sys.stdin);props=d.get('data',d.get('proposals',[]));print(len(props) if isinstance(props,list) else 0)" 2>/dev/null)
TC_ATR=$(curl -s "https://tc.panguard.ai/api/atr-rules" | python3 -c "import json,sys;d=json.load(sys.stdin);rules=d.get('data',[]);print(len(rules))" 2>/dev/null)

echo -e "  ATR rules in TC:   ${GREEN}${TC_ATR}${RESET}"
echo -e "  Pending proposals: ${TC_PROPOSALS}"
echo ""

# --- Website (if Vercel Analytics available) ---
echo -e "${BOLD}  Website (panguard.ai)${RESET}"
echo -e "  ${DIM}Check Vercel dashboard for page views${RESET}"
echo -e "  ${DIM}https://vercel.com/dashboard/analytics${RESET}"
echo ""

# --- npm Daily Trend (last 7 days) ---
echo -e "${BOLD}  PanGuard Daily Trend (last 7 days)${RESET}"
START=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d 2>/dev/null)
END=$(date +%Y-%m-%d)
curl -s "https://api.npmjs.org/downloads/range/${START}:${END}/@panguard-ai/panguard" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for x in d.get('downloads',[]):
    bar='█' * (x['downloads'] // 20)
    print(f'  {x[\"day\"]}: {x[\"downloads\"]:>5} {bar}')
" 2>/dev/null
echo ""

echo "  ════════════════════════════════════════"
echo -e "  ${DIM}Run: bash scripts/usage-dashboard.sh${RESET}"
echo ""
