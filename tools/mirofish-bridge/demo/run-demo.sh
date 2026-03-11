#!/bin/bash
# =============================================================================
# Panguard ATR Contribution Demo
# MiroFish Predictive Threat Intelligence -> ATR Rule Generation
# =============================================================================
#
# This script demonstrates the full pipeline:
#   1. Export MiroFish simulation report
#   2. Convert predictions to ATR rules
#   3. Quality review gate
#   4. Preview rules ready for Threat Cloud submission
#
# Prerequisites:
#   - MiroFish simulation completed (backend running on localhost:5001)
#   - Python 3.12+ with pyyaml installed
#   - Simulation ID (passed as argument or auto-detected)
#
# Usage:
#   ./run-demo.sh [simulation_id]
#   ./run-demo.sh                    # auto-detect latest simulation
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRIDGE_DIR="$(dirname "$SCRIPT_DIR")"
CONVERTER="$BRIDGE_DIR/converter/mirofish_to_atr.py"
OUTPUT_DIR="$BRIDGE_DIR/output"
MIROFISH_API="http://localhost:5001/api"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}============================================${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}============================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BOLD}${GREEN}[Step $1]${NC} $2"
}

print_info() {
    echo -e "${BLUE}  -> $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}  [!] $1${NC}"
}

print_error() {
    echo -e "${RED}  [ERROR] $1${NC}"
}

# =============================================================================
print_header "Panguard ATR Contribution Pipeline Demo"
echo -e "  Source:  MiroFish Swarm Intelligence Simulation"
echo -e "  Target:  Panguard Threat Cloud / ATR Repository"
echo -e "  Model:   Claude Sonnet 4 (Anthropic API)"
echo ""

# =============================================================================
# Step 1: Detect or use provided simulation ID
# =============================================================================
print_step "1/6" "Locating MiroFish simulation..."

SIMULATIONS_DIR="/Users/user/Downloads/MiroFish/backend/uploads/simulations"

if [ -n "${1:-}" ]; then
    SIM_ID="$1"
    print_info "Using provided simulation ID: $SIM_ID"
else
    # Auto-detect latest simulation
    if [ -d "$SIMULATIONS_DIR" ]; then
        SIM_ID=$(ls -t "$SIMULATIONS_DIR" 2>/dev/null | head -1)
        if [ -z "$SIM_ID" ]; then
            print_error "No simulations found in $SIMULATIONS_DIR"
            exit 1
        fi
        print_info "Auto-detected latest simulation: $SIM_ID"
    else
        print_error "Simulations directory not found: $SIMULATIONS_DIR"
        exit 1
    fi
fi

SIM_DIR="$SIMULATIONS_DIR/$SIM_ID"
if [ ! -d "$SIM_DIR" ]; then
    print_error "Simulation directory not found: $SIM_DIR"
    exit 1
fi

# Show simulation metadata
if [ -f "$SIM_DIR/state.json" ]; then
    echo ""
    print_info "Simulation metadata:"
    python3 -c "
import json
with open('$SIM_DIR/state.json') as f:
    s = json.load(f)
print(f'  Title:    {s.get(\"title\", \"N/A\")}')
print(f'  Status:   {s.get(\"status\", \"N/A\")}')
print(f'  Agents:   {s.get(\"agent_count\", \"N/A\")}')
print(f'  Platform: {s.get(\"platform\", \"N/A\")}')
print(f'  Created:  {s.get(\"created_at\", \"N/A\")}')
" 2>/dev/null || print_warn "Could not parse state.json"
fi

# =============================================================================
# Step 2: Check for existing report or generate one
# =============================================================================
echo ""
print_step "2/6" "Checking for simulation report..."

REPORTS_DIR="/Users/user/Downloads/MiroFish/backend/uploads/reports"
REPORT_FILE=""

# Try to find report via API
REPORT_CHECK=$(curl -s "$MIROFISH_API/report/check/$SIM_ID" 2>/dev/null || echo "{}")
HAS_REPORT=$(echo "$REPORT_CHECK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('has_report', False))" 2>/dev/null || echo "False")

if [ "$HAS_REPORT" = "True" ]; then
    REPORT_ID=$(echo "$REPORT_CHECK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('report_id', ''))" 2>/dev/null)
    REPORT_FILE="$REPORTS_DIR/$REPORT_ID/full_report.md"
    print_info "Found existing report: $REPORT_ID"
else
    print_warn "No report found. Triggering report generation..."
    GENERATE_RESP=$(curl -s -X POST "$MIROFISH_API/report/generate" \
        -H "Content-Type: application/json" \
        -d "{\"simulation_id\": \"$SIM_ID\"}" 2>/dev/null || echo "{}")

    REPORT_ID=$(echo "$GENERATE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('report_id', ''))" 2>/dev/null || echo "")

    if [ -n "$REPORT_ID" ]; then
        print_info "Report generation started: $REPORT_ID"
        print_info "Waiting for report generation (this may take a few minutes)..."

        for i in $(seq 1 60); do
            sleep 5
            STATUS=$(curl -s "$MIROFISH_API/report/$REPORT_ID" 2>/dev/null | \
                python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status', 'unknown'))" 2>/dev/null || echo "unknown")

            if [ "$STATUS" = "completed" ]; then
                REPORT_FILE="$REPORTS_DIR/$REPORT_ID/full_report.md"
                print_info "Report generated successfully!"
                break
            elif [ "$STATUS" = "failed" ]; then
                print_error "Report generation failed"
                break
            fi
            echo -ne "\r  -> Generating... ($((i*5))s elapsed)"
        done
        echo ""
    fi
fi

# Fallback: use raw simulation data
if [ -z "$REPORT_FILE" ] || [ ! -f "$REPORT_FILE" ]; then
    print_warn "Using raw simulation data as fallback..."

    # Export simulation data to JSON for converter
    mkdir -p "$OUTPUT_DIR"
    EXPORT_FILE="$OUTPUT_DIR/sim-export-$SIM_ID.json"

    python3 -c "
import json, os, glob

sim_dir = '$SIM_DIR'
export = {'simulation_id': '$SIM_ID', 'predictions': [], 'raw_data': {}}

# Load state
state_file = os.path.join(sim_dir, 'state.json')
if os.path.exists(state_file):
    with open(state_file) as f:
        export['metadata'] = json.load(f)

# Load config
config_file = os.path.join(sim_dir, 'simulation_config.json')
if os.path.exists(config_file):
    with open(config_file) as f:
        export['config'] = json.load(f)

# Load profiles
for pfile in glob.glob(os.path.join(sim_dir, '*profiles*')):
    with open(pfile) as f:
        try:
            export['raw_data']['profiles'] = json.load(f)
        except:
            pass

with open('$EXPORT_FILE', 'w') as f:
    json.dump(export, f, indent=2, ensure_ascii=False)

print(f'Exported {len(json.dumps(export))} bytes')
" 2>/dev/null

    REPORT_FILE="$EXPORT_FILE"
    print_info "Exported to: $EXPORT_FILE"
fi

# =============================================================================
# Step 3: Convert to ATR rules
# =============================================================================
echo ""
print_step "3/6" "Converting predictions to ATR rules..."

mkdir -p "$OUTPUT_DIR/atr-rules"
mkdir -p "$OUTPUT_DIR/review-reports"

python3 "$CONVERTER" \
    --input "$REPORT_FILE" \
    --output-dir "$OUTPUT_DIR/atr-rules" \
    --dry-run 2>&1 | head -50

# =============================================================================
# Step 4: Quality review
# =============================================================================
echo ""
print_step "4/6" "Running quality review gate..."

python3 "$CONVERTER" \
    --input "$REPORT_FILE" \
    --output-dir "$OUTPUT_DIR/atr-rules" 2>&1 | head -80

# =============================================================================
# Step 5: Show generated rules
# =============================================================================
echo ""
print_step "5/6" "Generated ATR rules:"

RULE_COUNT=$(ls "$OUTPUT_DIR/atr-rules/"*.yaml 2>/dev/null | wc -l | tr -d ' ')

if [ "$RULE_COUNT" -gt 0 ]; then
    echo ""
    print_info "Total rules generated: $RULE_COUNT"
    echo ""

    for rule_file in "$OUTPUT_DIR/atr-rules/"*.yaml; do
        filename=$(basename "$rule_file")
        echo -e "${BOLD}--- $filename ---${NC}"
        head -30 "$rule_file"
        echo "  ..."
        echo ""
    done
else
    print_warn "No rules generated from this simulation."
    print_info "This can happen if the simulation hasn't produced enough attack predictions yet."
    print_info "Try running more rounds or check the report content."

    # Show what we have
    echo ""
    print_info "Available simulation data:"
    ls -la "$SIM_DIR/" 2>/dev/null | head -15
fi

# =============================================================================
# Step 6: Summary
# =============================================================================
echo ""
print_step "6/6" "Pipeline summary"
echo ""
echo -e "${BOLD}  Pipeline:${NC}"
echo "    MiroFish Simulation (Claude Sonnet 4)"
echo "        |"
echo "        v"
echo "    Prediction Report (Markdown/JSON)"
echo "        |"
echo "        v"
echo "    mirofish_to_atr.py Converter"
echo "        |"
echo "        v"
echo "    Quality Review Gate (automated)"
echo "        |"
echo "        v"
echo "    ATR Rules (YAML)"
echo "        |"
echo "        v"
echo "    Panguard Threat Cloud (contribution)"
echo ""
echo -e "${BOLD}  Results:${NC}"
echo "    Simulation:  $SIM_ID"
echo "    Rules:       $RULE_COUNT ATR rules generated"
echo "    Output:      $OUTPUT_DIR/atr-rules/"
echo ""

if [ "$RULE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}${BOLD}  Ready to submit to Threat Cloud!${NC}"
    echo ""
    echo "  To submit (when ready):"
    echo "    python3 $CONVERTER \\"
    echo "      --input $REPORT_FILE \\"
    echo "      --output-dir $OUTPUT_DIR/atr-rules \\"
    echo "      --submit-to https://threat-cloud.panguard.ai"
else
    echo -e "${YELLOW}  Simulation may still be running. Re-run this script after completion.${NC}"
fi

echo ""
print_header "Demo Complete"
