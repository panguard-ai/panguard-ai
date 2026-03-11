#!/usr/bin/env python3
"""
MiroFish → ATR Rule Converter
MiroFish 輸出 → ATR 規則轉換器

Reads MiroFish simulation reports and converts predicted attack patterns
into ATR (Agent Threat Rules) YAML format for submission to Panguard Threat Cloud.

Usage:
    python mirofish_to_atr.py --input report.json --output-dir ./generated-rules/
    python mirofish_to_atr.py --input-dir ./mirofish-output/ --output-dir ./generated-rules/
    python mirofish_to_atr.py --batch ./mirofish-output/ --submit-to https://threat-cloud.panguard.ai

Requirements:
    pip install pyyaml requests
"""

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    print("Error: PyYAML required. Install with: pip install pyyaml")
    sys.exit(1)


# ---------------------------------------------------------------------------
# ATR Schema Constants
# ---------------------------------------------------------------------------

VALID_CATEGORIES = [
    "prompt-injection", "tool-poisoning", "context-exfiltration",
    "agent-manipulation", "privilege-escalation", "excessive-autonomy",
    "data-poisoning", "model-abuse", "skill-compromise",
]

VALID_SEVERITIES = ["critical", "high", "medium", "low", "informational"]

VALID_ACTIONS = [
    "block_input", "block_output", "block_tool", "quarantine_session",
    "reset_context", "alert", "snapshot", "escalate", "reduce_permissions",
    "kill_agent",
]

VALID_SOURCE_TYPES = [
    "llm_io", "tool_call", "mcp_exchange", "agent_behavior",
    "multi_agent_comm", "context_window", "memory_access",
    "skill_lifecycle", "skill_permission", "skill_chain",
]

SEVERITY_TO_ACTIONS: dict[str, list[str]] = {
    "critical": ["block_input", "quarantine_session", "alert", "escalate", "kill_agent"],
    "high": ["block_input", "alert", "escalate", "snapshot"],
    "medium": ["alert", "snapshot", "reduce_permissions"],
    "low": ["alert", "snapshot"],
    "informational": ["alert"],
}

# Counter for generating unique rule IDs within a session
_rule_counter = 0


def next_rule_id(prefix: str = "ATR-PRED") -> str:
    """Generate a unique rule ID."""
    global _rule_counter
    _rule_counter += 1
    ts = datetime.now().strftime("%Y")
    return f"{prefix}-{ts}-{_rule_counter:03d}"


def compute_pattern_hash(attack_type: str, techniques: list[str]) -> str:
    """Compute a stable hash for a pattern (same as Panguard's convention)."""
    content = attack_type + ",".join(sorted(techniques))
    return hashlib.sha256(content.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# MiroFish Report Parser
# ---------------------------------------------------------------------------

def parse_mirofish_report(report_path: str) -> list[dict[str, Any]]:
    """
    Parse a MiroFish simulation report and extract attack predictions.

    MiroFish reports can be in various formats. This parser handles:
    1. JSON reports from ReportAgent
    2. Structured simulation logs
    3. Free-text reports (extracted via regex)
    """
    with open(report_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Try JSON first
    try:
        data = json.loads(content)
        return extract_from_json_report(data)
    except json.JSONDecodeError:
        pass

    # Try YAML
    try:
        data = yaml.safe_load(content)
        if isinstance(data, dict):
            return extract_from_json_report(data)
    except yaml.YAMLError:
        pass

    # Fall back to text extraction
    return extract_from_text_report(content)


def extract_from_json_report(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract attack predictions from a structured JSON/YAML report."""
    predictions: list[dict[str, Any]] = []

    # Handle MiroFish standard report format
    if "simulation_results" in data:
        for result in data["simulation_results"]:
            pred = normalize_prediction(result)
            if pred:
                predictions.append(pred)

    # Handle agent interaction logs
    if "agent_interactions" in data:
        for interaction in data["agent_interactions"]:
            if is_attack_interaction(interaction):
                pred = interaction_to_prediction(interaction)
                if pred:
                    predictions.append(pred)

    # Handle prediction section directly
    if "predictions" in data:
        for pred_raw in data["predictions"]:
            pred = normalize_prediction(pred_raw)
            if pred:
                predictions.append(pred)

    # Handle attack_patterns section
    if "attack_patterns" in data:
        for pattern in data["attack_patterns"]:
            pred = normalize_prediction(pattern)
            if pred:
                predictions.append(pred)

    return predictions


def extract_from_text_report(text: str) -> list[dict[str, Any]]:
    """Extract attack predictions from free-text reports using regex.

    Supports:
    1. English headers: "Attack: <name>" / "Technique: <name>"
    2. Markdown bold headers: **<name>** (used by MiroFish Chinese reports)
    3. Markdown section headers: ## <name>
    """
    predictions: list[dict[str, Any]] = []

    # Strategy 1: English keyword headers
    attack_blocks = re.split(
        r"(?:^|\n)(?:Attack|Technique|Threat|Vulnerability|Pattern):\s*",
        text, flags=re.IGNORECASE
    )

    for block in attack_blocks[1:]:
        lines = block.strip().split("\n")
        if not lines:
            continue
        title = lines[0].strip()
        description = "\n".join(lines[1:]).strip()
        pred = _try_build_prediction(title, description)
        if pred:
            predictions.append(pred)

    # Strategy 2: Markdown bold subsections (**title**)
    # Split on bold headers that indicate attack/defense topics
    bold_sections = re.split(r"\n\*\*([^*]{4,120})\*\*\s*\n", text)
    # bold_sections: [preamble, title1, body1, title2, body2, ...]
    for i in range(1, len(bold_sections) - 1, 2):
        title = bold_sections[i].strip()
        body = bold_sections[i + 1].strip() if i + 1 < len(bold_sections) else ""
        # Only process sections that look attack/security related
        if not _is_security_relevant(title + " " + body):
            continue
        pred = _try_build_prediction(title, body)
        if pred:
            predictions.append(pred)

    # Strategy 3: H2/H3 sections (## or ###)
    if not predictions:
        h_sections = re.split(r"\n#{2,3}\s+(.+)\n", text)
        for i in range(1, len(h_sections) - 1, 2):
            title = h_sections[i].strip()
            body = h_sections[i + 1].strip() if i + 1 < len(h_sections) else ""
            if not _is_security_relevant(title + " " + body):
                continue
            pred = _try_build_prediction(title, body)
            if pred:
                predictions.append(pred)

    # Deduplicate by title
    seen_titles: set[str] = set()
    unique: list[dict[str, Any]] = []
    for p in predictions:
        t = p["title"]
        if t not in seen_titles:
            seen_titles.add(t)
            unique.append(p)

    return unique


def _is_security_relevant(text: str) -> bool:
    """Check if text is related to security/attacks/defense."""
    keywords = [
        "attack", "inject", "poison", "exfiltrat", "bypass", "evas",
        "exploit", "vulnerab", "malicious", "defense", "detect", "rule",
        "threat", "audit", "fingerprint", "drift", "supply chain",
        # Chinese keywords
        "攻击", "注入", "投毒", "渗透", "绕过", "规避", "漏洞",
        "恶意", "防御", "检测", "规则", "威胁", "审计", "指纹",
        "漂移", "供应链", "窃取", "劫持", "篡改", "伪造",
        "技能", "MCP", "ATR", "MITRE", "AML.T",
    ]
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in keywords)


def _try_build_prediction(title: str, description: str) -> dict[str, Any] | None:
    """Try to build a prediction dict from title and description."""
    combined = title + " " + description
    category = infer_category(combined)
    severity = infer_severity(combined)
    techniques = extract_mitre_techniques(combined)
    detection_patterns = extract_detection_patterns(description)

    # Also extract detection hints from Chinese quoted blocks (> "...")
    cn_quoted = re.findall(r'>\s*"([^"]{10,200})"', description)
    if cn_quoted and not detection_patterns:
        detection_patterns = cn_quoted[:10]

    if not detection_patterns:
        return None

    return {
        "title": title,
        "description": description[:2000],
        "category": category,
        "severity": severity,
        "mitre_techniques": ensure_mitre_techniques(techniques, category),
        "detection_patterns": detection_patterns,
        "source_type": infer_source_type(category),
    }


def normalize_prediction(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Normalize a raw prediction into a standard format."""
    title = raw.get("title") or raw.get("name") or raw.get("attack_name", "")
    if not title:
        return None

    description = raw.get("description") or raw.get("details") or raw.get("summary", "")
    category = raw.get("category") or infer_category(title + " " + description)
    severity = raw.get("severity") or infer_severity(title + " " + description)

    if category not in VALID_CATEGORIES:
        category = infer_category(title + " " + description)
    if severity not in VALID_SEVERITIES:
        severity = infer_severity(title + " " + description)

    techniques = raw.get("mitre_techniques") or raw.get("techniques") or []
    if isinstance(techniques, str):
        techniques = [t.strip() for t in techniques.split(",")]

    # Extract detection patterns
    detection_patterns = raw.get("detection_patterns") or raw.get("indicators") or []
    if isinstance(detection_patterns, str):
        detection_patterns = [detection_patterns]
    if not detection_patterns:
        detection_patterns = extract_detection_patterns(description)

    return {
        "title": title,
        "description": description,
        "category": category,
        "severity": severity,
        "mitre_techniques": ensure_mitre_techniques(techniques, category),
        "detection_patterns": detection_patterns,
        "source_type": raw.get("source_type") or infer_source_type(category),
        "false_positives": raw.get("false_positives") or [],
        "confidence": raw.get("confidence", "medium"),
    }


def is_attack_interaction(interaction: dict[str, Any]) -> bool:
    """Check if an agent interaction represents an attack."""
    attack_keywords = [
        "inject", "exploit", "bypass", "exfiltrate", "poison",
        "impersonate", "hijack", "escalat", "manipulat", "malicious",
        "backdoor", "reverse shell", "payload", "credential",
    ]
    content = json.dumps(interaction).lower()
    return any(kw in content for kw in attack_keywords)


def interaction_to_prediction(interaction: dict[str, Any]) -> dict[str, Any] | None:
    """Convert an attack interaction into a prediction."""
    content = interaction.get("content") or interaction.get("message", "")
    agent_type = interaction.get("agent_type") or interaction.get("role", "")

    if not content:
        return None

    title = f"Predicted Attack: {agent_type}"
    description = content[:500]  # Truncate long content
    category = infer_category(content)
    patterns = extract_detection_patterns(content)

    if not patterns:
        return None

    return {
        "title": title,
        "description": description,
        "category": category,
        "severity": infer_severity(content),
        "mitre_techniques": extract_mitre_techniques(content),
        "detection_patterns": patterns,
        "source_type": infer_source_type(category),
    }


# ---------------------------------------------------------------------------
# Inference Helpers
# ---------------------------------------------------------------------------

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "prompt-injection": ["prompt injection", "ignore instructions", "jailbreak", "system prompt override", "injection attack"],
    "tool-poisoning": ["tool response", "mcp", "malicious response", "tool output", "ssrf", "reverse shell"],
    "context-exfiltration": ["exfiltrate", "leak", "system prompt", "api key", "credential exposure", "data leakage"],
    "agent-manipulation": ["cross-agent", "impersonat", "multi-agent", "orchestrator", "goal hijack", "message spoof"],
    "privilege-escalation": ["privilege", "escalat", "permission", "sudo", "admin access", "scope creep"],
    "excessive-autonomy": ["runaway", "infinite loop", "resource exhaust", "cascading", "rate limit"],
    "data-poisoning": ["training data", "rag poison", "knowledge base", "fine-tun", "embedding"],
    "model-abuse": ["model extract", "model theft", "watermark", "distillation attack"],
    "skill-compromise": ["typosquat", "supply chain", "skill impersonat", "behavioral drift", "package", "dependency"],
}


def infer_category(text: str) -> str:
    """Infer ATR category from text content."""
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        scores[cat] = sum(1 for kw in keywords if kw in text_lower)
    if not scores or max(scores.values()) == 0:
        return "prompt-injection"  # default
    return max(scores, key=lambda k: scores[k])


def infer_severity(text: str) -> str:
    """Infer severity from text content."""
    text_lower = text.lower()
    if any(w in text_lower for w in [
        "critical", "severe", "dangerous", "kill", "reverse shell", "credential",
        "严重", "危险", "凭证", "密钥泄露", "供应链攻击",
    ]):
        return "critical"
    if any(w in text_lower for w in [
        "high", "significant", "exploit", "exfiltrat", "bypass",
        "绕过", "窃取", "劫持", "规避", "渗透", "投毒",
    ]):
        return "high"
    if any(w in text_lower for w in [
        "medium", "moderate", "suspicious",
        "可疑", "异常", "漂移",
    ]):
        return "medium"
    return "low"


def infer_source_type(category: str) -> str:
    """Infer agent_source type from category."""
    mapping: dict[str, str] = {
        "prompt-injection": "llm_io",
        "tool-poisoning": "mcp_exchange",
        "context-exfiltration": "llm_io",
        "agent-manipulation": "multi_agent_comm",
        "privilege-escalation": "agent_behavior",
        "excessive-autonomy": "agent_behavior",
        "data-poisoning": "memory_access",
        "model-abuse": "llm_io",
        "skill-compromise": "skill_lifecycle",
    }
    return mapping.get(category, "llm_io")


def extract_mitre_techniques(text: str) -> list[str]:
    """Extract MITRE technique IDs from text."""
    patterns = [
        r"AML\.T\d{4}(?:\.\d{3})?",  # MITRE ATLAS
        r"T\d{4}(?:\.\d{3})?",  # MITRE ATT&CK
    ]
    techniques: list[str] = []
    for pattern in patterns:
        techniques.extend(re.findall(pattern, text))
    return list(set(techniques))


# Category -> default MITRE ATLAS techniques (fallback when none found in text)
CATEGORY_DEFAULT_MITRE: dict[str, list[str]] = {
    "prompt-injection": ["AML.T0051"],
    "tool-poisoning": ["AML.T0053"],
    "context-exfiltration": ["AML.T0024", "AML.T0055"],
    "agent-manipulation": ["AML.T0043", "AML.T0052.000"],
    "privilege-escalation": ["AML.T0040"],
    "excessive-autonomy": ["AML.T0046", "AML.T0047"],
    "data-poisoning": ["AML.T0020"],
    "model-abuse": ["AML.T0054"],
    "skill-compromise": ["AML.T0010", "AML.T0056"],
}


def ensure_mitre_techniques(techniques: list[str], category: str) -> list[str]:
    """Ensure at least one MITRE technique is present; fall back to category defaults."""
    if techniques:
        return techniques
    return CATEGORY_DEFAULT_MITRE.get(category, ["AML.T0051"])


def extract_detection_patterns(text: str) -> list[str]:
    """Extract regex-suitable detection patterns from text."""
    patterns: list[str] = []

    # Extract quoted strings as potential patterns
    quoted = re.findall(r'"([^"]{5,100})"', text)
    patterns.extend(quoted[:10])

    # Extract code-like patterns
    code_patterns = re.findall(r'`([^`]{5,100})`', text)
    patterns.extend(code_patterns[:10])

    # Extract patterns from "pattern:" or "indicator:" fields
    field_patterns = re.findall(
        r'(?:pattern|indicator|signature|regex|detection):\s*["\']?(.{5,100}?)["\']?\s*(?:\n|$)',
        text, re.IGNORECASE
    )
    patterns.extend(field_patterns[:10])

    # Deduplicate
    seen: set[str] = set()
    unique: list[str] = []
    for p in patterns:
        p_clean = p.strip()
        if p_clean and p_clean not in seen:
            seen.add(p_clean)
            unique.append(p_clean)

    return unique[:15]  # Max 15 patterns per rule


# ---------------------------------------------------------------------------
# ATR YAML Generator
# ---------------------------------------------------------------------------

def prediction_to_atr_yaml(prediction: dict[str, Any]) -> str:
    """Convert a normalized prediction into ATR YAML format."""
    rule_id = next_rule_id()
    today = datetime.now().strftime("%Y/%m/%d")
    category = prediction.get("category", "prompt-injection")
    severity = prediction.get("severity", "medium")
    source_type = prediction.get("source_type", "llm_io")
    techniques = prediction.get("mitre_techniques", [])
    patterns = prediction.get("detection_patterns", [])
    false_positives = prediction.get("false_positives", [])
    confidence = prediction.get("confidence", "medium")

    # Build detection field based on source type
    field_map: dict[str, str] = {
        "llm_io": "user_input",
        "mcp_exchange": "tool_response",
        "tool_call": "tool_name",
        "multi_agent_comm": "content",
        "agent_behavior": "event_data",
        "skill_lifecycle": "skill_name",
        "memory_access": "content",
        "context_window": "content",
        "skill_permission": "tool_args",
        "skill_chain": "tool_name",
    }
    detection_field = field_map.get(source_type, "content")

    # Build conditions
    conditions: list[str] = []
    for i, pattern in enumerate(patterns):
        # Escape regex special chars for safe YAML embedding
        escaped = escape_for_yaml_regex(pattern)
        conditions.append(
            f'    - field: {detection_field}\n'
            f'      operator: regex\n'
            f'      value: "(?i){escaped}"\n'
            f'      description: "MiroFish predicted pattern {i + 1}"'
        )

    if not conditions:
        conditions.append(
            f'    - field: {detection_field}\n'
            f'      operator: contains\n'
            f'      value: "PLACEHOLDER"\n'
            f'      description: "Requires manual pattern definition"'
        )

    # Build references
    refs_lines: list[str] = []
    atlas_refs = [t for t in techniques if t.startswith("AML.")]
    attack_refs = [t for t in techniques if t.startswith("T") and not t.startswith("AML.")]

    if atlas_refs:
        refs_lines.append("  mitre_atlas:")
        for t in atlas_refs:
            refs_lines.append(f'    - "{t}"')
    if attack_refs:
        refs_lines.append("  mitre_attack:")
        for t in attack_refs:
            refs_lines.append(f'    - "{t}"')

    # Build response actions
    actions = SEVERITY_TO_ACTIONS.get(severity, ["alert"])
    action_lines = [f"    - {a}" for a in actions]

    # False positives
    fp_lines = ['    - "Legitimate traffic matching predicted pattern"']
    for fp in false_positives[:5]:
        fp_lines.append(f'    - "{escape_yaml_string(fp)}"')

    # Assemble YAML
    lines = [
        f'title: "{escape_yaml_string(prediction["title"])}"',
        f'id: {rule_id}',
        f'status: draft',
        f'description: >',
        f'  MiroFish AI Prediction: {escape_yaml_string(prediction.get("description", "")[:300])}',
        f'author: "MiroFish Prediction Engine"',
        f'date: "{today}"',
        f'schema_version: "0.1"',
        f'detection_tier: pattern',
        f'maturity: test',
        f'severity: {severity}',
        f'',
    ]

    if refs_lines:
        lines.append('references:')
        lines.extend(refs_lines)
        lines.append('')

    lines.extend([
        'tags:',
        f'  category: {category}',
        f'  subcategory: mirofish-predicted',
        f'  confidence: {confidence}',
        '',
        'agent_source:',
        f'  type: {source_type}',
        '  framework:',
        '    - any',
        '  provider:',
        '    - any',
        '',
        'detection:',
        '  conditions:',
    ])
    lines.extend(conditions)
    lines.extend([
        '',
        '  condition: any',
        '  false_positives:',
    ])
    lines.extend(fp_lines)
    lines.extend([
        '',
        'response:',
        '  actions:',
    ])
    lines.extend(action_lines)
    lines.extend([
        f'  auto_response_threshold: {severity}',
        '  message_template: >',
        f'    [{rule_id}] MiroFish predicted attack pattern detected.',
        f'    Category: {category}, Severity: {severity}.',
    ])

    return "\n".join(lines)


def escape_yaml_string(s: str) -> str:
    """Escape a string for safe YAML embedding."""
    return s.replace('"', '\\"').replace("\n", " ").strip()


def escape_for_yaml_regex(s: str) -> str:
    """Escape a string for use in a YAML regex value."""
    # Remove outer quotes if present
    s = s.strip("'\"")
    # Escape YAML-problematic characters
    s = s.replace('"', '\\"')
    # Don't double-escape regex special chars - keep them as-is
    return s


# ---------------------------------------------------------------------------
# Quality Review Gate
# ---------------------------------------------------------------------------

class QualityIssue:
    """A quality issue found during review."""
    def __init__(self, rule_id: str, issue: str, severity: str = "warning"):
        self.rule_id = rule_id
        self.issue = issue
        self.severity = severity  # "error" = reject, "warning" = flag for review

    def __str__(self) -> str:
        return f"[{self.severity.upper()}] {self.rule_id}: {self.issue}"


def review_rule(rule_yaml: str) -> list[QualityIssue]:
    """
    Automated quality review for a generated ATR rule.
    Rules that fail review should NOT be submitted to Threat Cloud.
    """
    issues: list[QualityIssue] = []

    try:
        rule = yaml.safe_load(rule_yaml)
    except yaml.YAMLError as e:
        return [QualityIssue("unknown", f"Invalid YAML: {e}", "error")]

    rule_id = rule.get("id", "unknown")

    # 1. Required fields check
    required = ["title", "id", "status", "description", "severity", "tags", "detection", "response"]
    for field in required:
        if field not in rule:
            issues.append(QualityIssue(rule_id, f"Missing required field: {field}", "error"))

    # 2. Category validation
    category = rule.get("tags", {}).get("category", "")
    if category not in VALID_CATEGORIES:
        issues.append(QualityIssue(rule_id, f"Invalid category: {category}", "error"))

    # 3. Severity validation
    severity = rule.get("severity", "")
    if severity not in VALID_SEVERITIES:
        issues.append(QualityIssue(rule_id, f"Invalid severity: {severity}", "error"))

    # 4. Detection conditions check
    conditions = rule.get("detection", {}).get("conditions", [])
    if not conditions:
        issues.append(QualityIssue(rule_id, "No detection conditions defined", "error"))
    elif isinstance(conditions, list):
        for i, cond in enumerate(conditions):
            if isinstance(cond, dict):
                value = cond.get("value", "")
                # Overly broad patterns
                if value in [".", ".*", ".+", "PLACEHOLDER"]:
                    issues.append(QualityIssue(rule_id, f"Condition {i}: overly broad pattern '{value}'", "error"))
                # Too short pattern (likely to cause false positives)
                if isinstance(value, str) and len(value.replace("(?i)", "")) < 5:
                    issues.append(QualityIssue(rule_id, f"Condition {i}: pattern too short ({len(value)} chars)", "warning"))

    # 5. Response actions validation
    actions = rule.get("response", {}).get("actions", [])
    if not actions:
        issues.append(QualityIssue(rule_id, "No response actions defined", "error"))
    for action in actions:
        if action not in VALID_ACTIONS:
            issues.append(QualityIssue(rule_id, f"Invalid action: {action}", "error"))

    # 6. Dangerous action without high severity
    dangerous_actions = {"kill_agent", "quarantine_session", "block_input", "block_output"}
    has_dangerous = bool(set(actions) & dangerous_actions)
    if has_dangerous and severity in ("low", "informational"):
        issues.append(QualityIssue(rule_id, f"Dangerous actions ({set(actions) & dangerous_actions}) with low severity", "warning"))

    # 7. Description quality
    desc = rule.get("description", "")
    if isinstance(desc, str) and len(desc) < 20:
        issues.append(QualityIssue(rule_id, "Description too short (< 20 chars)", "warning"))

    # 8. MITRE reference check (warning only)
    refs = rule.get("references", {})
    if not refs or (not refs.get("mitre_atlas") and not refs.get("mitre_attack")):
        issues.append(QualityIssue(rule_id, "No MITRE technique references", "warning"))

    return issues


def review_all_rules(rules: list[str]) -> tuple[list[str], list[str], list[str]]:
    """
    Review all rules and sort into: approved, flagged (warnings only), rejected (has errors).
    Returns (approved, flagged, rejected) lists of YAML strings.
    """
    approved: list[str] = []
    flagged: list[str] = []
    rejected: list[str] = []

    for rule_yaml in rules:
        issues = review_rule(rule_yaml)
        errors = [i for i in issues if i.severity == "error"]
        warnings = [i for i in issues if i.severity == "warning"]

        if errors:
            rejected.append(rule_yaml)
            for e in errors:
                print(f"  REJECTED: {e}")
        elif warnings:
            flagged.append(rule_yaml)
            for w in warnings:
                print(f"  FLAGGED: {w}")
        else:
            approved.append(rule_yaml)

    return approved, flagged, rejected


# ---------------------------------------------------------------------------
# Threat Cloud Submission
# ---------------------------------------------------------------------------

def submit_to_threat_cloud(
    rules: list[str],
    endpoint: str,
    client_hash: str | None = None,
) -> dict[str, Any]:
    """Submit generated ATR rules to Threat Cloud as proposals."""
    try:
        import requests
    except ImportError:
        return {"error": "requests library required. Install with: pip install requests"}

    if not client_hash:
        import uuid
        client_hash = hashlib.sha256(str(uuid.getnode()).encode()).hexdigest()[:16]

    results = {"submitted": 0, "accepted": 0, "rejected": 0, "errors": []}

    for rule_yaml in rules:
        # Extract pattern info from the YAML
        try:
            rule_data = yaml.safe_load(rule_yaml)
        except yaml.YAMLError:
            results["errors"].append("Failed to parse generated YAML")
            continue

        category = rule_data.get("tags", {}).get("category", "unknown")
        techniques_raw = rule_data.get("references", {})
        techniques = []
        if isinstance(techniques_raw, dict):
            techniques = techniques_raw.get("mitre_atlas", []) + techniques_raw.get("mitre_attack", [])

        pattern_hash = compute_pattern_hash(category, techniques)

        payload = {
            "patternHash": pattern_hash,
            "clientHash": client_hash,
            "ruleContent": rule_yaml,
            "llmProvider": "mirofish",
            "llmModel": "swarm-intelligence-v1",
            "selfReviewVerdict": json.dumps({
                "approved": True,
                "source": "mirofish-prediction",
                "confidence": 0.7,
            }),
        }

        try:
            resp = requests.post(
                f"{endpoint}/api/atr-proposals",
                json=payload,
                timeout=30,
            )
            results["submitted"] += 1
            if resp.status_code == 200:
                body = resp.json()
                if body.get("accepted"):
                    results["accepted"] += 1
                else:
                    results["rejected"] += 1
                    results["errors"].append(body.get("reason", "Unknown rejection"))
            else:
                results["errors"].append(f"HTTP {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            results["errors"].append(str(e))

    return results


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert MiroFish simulation reports to ATR rules"
    )
    parser.add_argument("--input", "-i", help="Single report file to convert")
    parser.add_argument("--input-dir", "-d", help="Directory of report files")
    parser.add_argument("--output-dir", "-o", default="./generated-atr-rules",
                        help="Output directory for ATR YAML files")
    parser.add_argument("--submit-to", help="Threat Cloud endpoint URL for submission")
    parser.add_argument("--client-hash", help="Client hash for Threat Cloud (auto-generated if omitted)")
    parser.add_argument("--dry-run", action="store_true", help="Parse and show predictions without writing files")
    parser.add_argument("--no-review", action="store_true", help="Skip quality review gate (NOT recommended)")
    parser.add_argument("--include-flagged", action="store_true", help="Include flagged (warning) rules in output")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    args = parser.parse_args()

    if not args.input and not args.input_dir:
        parser.error("Either --input or --input-dir is required")

    # Collect input files
    input_files: list[str] = []
    if args.input:
        input_files.append(args.input)
    if args.input_dir:
        input_dir = Path(args.input_dir)
        for ext in ["*.json", "*.yaml", "*.yml", "*.txt", "*.md"]:
            input_files.extend(str(p) for p in input_dir.glob(ext))

    if not input_files:
        print("No input files found.")
        sys.exit(1)

    print(f"Processing {len(input_files)} report file(s)...")

    all_predictions: list[dict[str, Any]] = []
    for fpath in input_files:
        if args.verbose:
            print(f"  Parsing: {fpath}")
        predictions = parse_mirofish_report(fpath)
        all_predictions.extend(predictions)
        if args.verbose:
            print(f"    Found {len(predictions)} predictions")

    print(f"Total predictions extracted: {len(all_predictions)}")

    if not all_predictions:
        print("No attack predictions found in reports.")
        sys.exit(0)

    # Generate ATR rules
    generated_rules: list[str] = []
    for pred in all_predictions:
        rule_yaml = prediction_to_atr_yaml(pred)
        generated_rules.append(rule_yaml)

    print(f"Generated {len(generated_rules)} ATR rules")

    # Quality review gate (mandatory unless --no-review)
    if not args.no_review:
        print("\n--- Quality Review ---")
        approved, flagged, rejected = review_all_rules(generated_rules)
        print(f"  Approved: {len(approved)}")
        print(f"  Flagged (warnings): {len(flagged)}")
        print(f"  Rejected (errors): {len(rejected)}")

        # Only output approved rules (+ flagged if --include-flagged)
        output_rules = approved
        if args.include_flagged:
            output_rules = approved + flagged
            print(f"  Including flagged rules (--include-flagged)")

        if rejected:
            print(f"\n  {len(rejected)} rule(s) REJECTED and will NOT be written/submitted.")
            print(f"  Fix issues or use --no-review to skip (not recommended for Threat Cloud).")
    else:
        output_rules = generated_rules
        print("  WARNING: Quality review skipped (--no-review)")

    if args.dry_run:
        for i, rule in enumerate(output_rules):
            print(f"\n{'='*60}")
            print(f"Rule {i+1}:")
            print(f"{'='*60}")
            print(rule)
        return

    generated_rules = output_rules  # Replace with reviewed rules

    # Write to output directory
    os.makedirs(args.output_dir, exist_ok=True)
    written_files: list[str] = []
    for i, rule_yaml in enumerate(generated_rules):
        try:
            rule_data = yaml.safe_load(rule_yaml)
            rule_id = rule_data.get("id", f"unknown-{i}")
        except yaml.YAMLError:
            rule_id = f"parse-error-{i}"

        filename = f"{rule_id}.yaml"
        filepath = os.path.join(args.output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(rule_yaml)
        written_files.append(filepath)
        if args.verbose:
            print(f"  Written: {filepath}")

    print(f"Written {len(written_files)} ATR rule files to {args.output_dir}/")

    # Submit to Threat Cloud if requested
    if args.submit_to:
        print(f"\nSubmitting to Threat Cloud: {args.submit_to}")
        results = submit_to_threat_cloud(
            generated_rules, args.submit_to, args.client_hash
        )
        print(f"  Submitted: {results['submitted']}")
        print(f"  Accepted:  {results['accepted']}")
        print(f"  Rejected:  {results['rejected']}")
        if results["errors"]:
            print(f"  Errors:")
            for err in results["errors"][:10]:
                print(f"    - {err}")


if __name__ == "__main__":
    main()
