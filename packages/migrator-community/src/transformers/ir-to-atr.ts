/**
 * MigratorIR → ATR YAML object.
 *
 * Output shape is the actual ATR rule shape (see /Users/user/Downloads/agent-threat-rules/
 * rules/prompt-injection/ATR-2026-00001-direct-prompt-injection.yaml as reference):
 *
 *     detection:
 *       conditions:                # flat array
 *         - field: <name>
 *           operator: equals|contains|startswith|endswith|regex
 *           value: <string>
 *           description: <optional>
 *       condition: any | all
 *
 * Required ATR fields per validateRule (locked D1):
 *   title, id, status, description, author, date, severity, tags, agent_source,
 *   detection (with both `conditions` and `condition`), response (with non-empty actions).
 *
 * IR → ATR shape mapping decisions for W1:
 *   - IR.combinator='all' (from Sigma `selection` or `all of selection*`):
 *       flatten all patterns from all selections into one AND list. condition='all'.
 *   - IR.combinator='any' (from Sigma `1 of selection*`):
 *       only legal when EVERY selection has exactly 1 pattern (flat OR list).
 *       If any selection has >1 pattern, the semantics is OR-of-ANDs which the
 *       flat ATR conditions array can't express. Skip with warning.
 *   - Multi-value patterns (Sigma array values, OR-over-values) become a single
 *     ATR `regex` condition with alternation `(?:v1|v2|v3)` plus operator-shape
 *     anchors (^/$). This collapses N OR'd values into 1 ATR condition row.
 *   - Sigma `references` (URL list) live in `migrator_provenance.sigma_references`
 *     to avoid colliding with ATR's structured `references:` (owasp_llm, mitre, etc).
 *     validateRule doesn't touch this field.
 *   - W1 omits `test_cases` from output. Validator allows omission entirely.
 *
 * Heuristic defaults (every produced rule carries warnings flagging these as
 * needing human review):
 *   - tags.category   = 'prompt-injection'
 *   - tags.scan_target= 'runtime'
 *   - agent_source.type = 'llm_io'
 *   - status          = 'experimental' (newly migrated, not validated against benchmark yet)
 *   - response.actions = [{ type: 'log' }]
 */

import type { IRPattern, MigratorIR } from '../ir/types.js';
import type {
  ComplianceMapping,
  Enrichment,
  TestCases,
} from '../enrichment/types.js';
import { classifyAgentSource } from './agent-source-map.js';
import { classifyCategory } from './category-classifier.js';
import { allocateId } from './id-allocator.js';

// ------------------------------------------------------------------------ //

export interface AtrCondition {
  readonly field: string;
  readonly operator: 'equals' | 'contains' | 'startswith' | 'endswith' | 'regex';
  readonly value: string;
  readonly description?: string;
}

export interface AtrReferences {
  /** MITRE ATT&CK technique IDs extracted from Sigma `tags: [attack.tNNNN(.NNN)]`. */
  mitre_attack?: readonly string[];
  /** OWASP LLM Top 10 IDs (e.g., 'LLM01:2025'). Empty until LLM enrichment. */
  owasp_llm?: readonly string[];
  /** OWASP Agentic Top 10 IDs. Empty until LLM enrichment. */
  owasp_agentic?: readonly string[];
  /** External URLs (Sigma `references:`). */
  external?: readonly string[];
}

export interface AtrRuleObject {
  /** ATR schema version. Hardcoded to "0.1" for W1 — matches reference rules. */
  schema_version: '0.1';
  title: string;
  id: string;
  /** Migrated rules begin at 1; bumped only on substantive change. */
  rule_version: number;
  status: 'draft' | 'experimental' | 'stable' | 'deprecated';
  description: string;
  author: string;
  date: string;
  /** Hardcoded 'pattern' for W1 — every Sigma rule we accept is pattern-based. */
  detection_tier: 'pattern' | 'behavioral' | 'protocol';
  /** Mirrors Sigma source-rule status. Distinct from `status` (which tracks ATR review state). */
  maturity: 'experimental' | 'test' | 'stable' | 'deprecated';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  references?: AtrReferences;
  tags: {
    category: string;
    scan_target: string;
    confidence: 'high' | 'medium' | 'low';
    /** Set when LLM enrichment provides a more specific subcategory. */
    subcategory?: string;
  };
  agent_source: {
    type: string;
    framework: readonly string[];
    provider: readonly string[];
  };
  detection: { conditions: AtrCondition[]; condition: 'all' | 'any' };
  response: {
    actions: readonly string[];
    auto_response_threshold: 'critical' | 'high' | 'medium' | 'low';
    message_template?: string;
  };
  /** LLM-derived compliance mappings (eu_ai_act, owasp_*, nist_ai_rmf, iso_42001). */
  compliance?: ComplianceMapping;
  /** LLM-derived test cases (true_positives + true_negatives). */
  test_cases?: TestCases;
  migrator_provenance?: {
    source: 'sigma' | 'yara';
    source_id: string;
    sigma_status?: string;
    sigma_tags?: readonly string[];
    auto_generated: true;
    needs_human_review: readonly string[];
    /** Set to true if rule was enriched by an LLM pass. */
    llm_enriched?: boolean;
    /** False if LLM determined the source rule has no AI-agent analogue. */
    has_agent_analogue?: boolean;
    /** Brief LLM explanation of analogue gap when has_agent_analogue=false. */
    agent_analogue_note?: string;
  };
}

export interface TransformOptions {
  /** Optional set for cross-rule ID collision avoidance within a batch. */
  readonly used?: Set<string>;
  /**
   * Optional LLM enrichment to integrate. When provided, the transformer:
   *   - Replaces heuristic category/agent_source defaults with LLM-chosen values
   *   - Replaces conditions with `reauthored_conditions` (if has_agent_analogue=true)
   *   - Attaches compliance, test_cases, false_positives, message_template
   *   - Removes the corresponding entries from migrator_provenance.needs_human_review
   *   - Sets migrator_provenance.llm_enriched=true
   */
  readonly enrichment?: Enrichment;
}

export interface TransformResult {
  readonly atr: AtrRuleObject | null;
  readonly warnings: readonly string[];
}

// ------------------------------------------------------------------------ //

const REGEX_META = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(s: string): string {
  return s.replace(REGEX_META, '\\$&');
}

function buildAlternationRegex(
  values: readonly string[],
  operator: IRPattern['operator'],
  caseInsensitive: boolean
): string {
  const escaped = values.map(escapeRegex).join('|');
  let body: string;
  switch (operator) {
    case 'equals':
      body = `^(?:${escaped})$`;
      break;
    case 'contains':
      body = `(?:${escaped})`;
      break;
    case 'startswith':
      body = `^(?:${escaped})`;
      break;
    case 'endswith':
      body = `(?:${escaped})$`;
      break;
    case 'regex':
      // unusual: IR pattern with regex operator + array value — treat each value as alt branch
      body = `(?:${values.join('|')})`;
      break;
  }
  return caseInsensitive ? `(?i)${body}` : body;
}

function patternToCondition(p: IRPattern, selectionName: string): AtrCondition {
  // Array.isArray on `string | readonly string[]` doesn't narrow under strict TS;
  // use an explicit type guard via typeof to keep both branches well-typed.
  if (typeof p.value !== 'string') {
    return Object.freeze({
      field: p.field,
      operator: 'regex' as const,
      value: buildAlternationRegex(p.value, p.operator, p.caseInsensitive ?? false),
      description: `from ${selectionName} (multi-value)`,
    });
  }
  // Single-value pattern. If caseInsensitive, fold to a regex condition.
  if (p.caseInsensitive) {
    return Object.freeze({
      field: p.field,
      operator: 'regex' as const,
      value: buildAlternationRegex([p.value], p.operator, true),
      description: `from ${selectionName} (case-insensitive)`,
    });
  }
  return Object.freeze({
    field: p.field,
    operator: p.operator,
    value: p.value,
    description: `from ${selectionName}`,
  });
}

// ------------------------------------------------------------------------ //

const RE_MITRE_ATTACK = /^attack\.t\d{4}(?:\.\d{3})?$/i;

/**
 * Pull MITRE ATT&CK technique IDs out of Sigma tags. Tags like
 * `attack.t1059.001` and `attack.t1218` are machine-readable; other tags
 * (`attack.execution`, `car.2013-...`) are categorical and skipped.
 */
function extractMitreAttack(tags: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of tags) {
    if (RE_MITRE_ATTACK.test(t)) {
      // 'attack.t1059.001' → 'T1059.001'
      const tid = t.slice('attack.'.length).toUpperCase();
      out.push(tid);
    }
  }
  return out;
}

/**
 * Severity → confidence + auto_response_threshold. Both are direct mirrors
 * of Sigma `level:` semantics (critical/high are high-confidence high-action,
 * medium is medium, low/informational degrade together).
 */
function mapSeverityToConfidence(s: AtrRuleObject['severity']): 'high' | 'medium' | 'low' {
  if (s === 'critical' || s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  return 'low';
}
function mapSeverityToActionThreshold(
  s: AtrRuleObject['severity']
): AtrRuleObject['response']['auto_response_threshold'] {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  return 'low';
}

/**
 * Severity → default response action set. Mirrors Cisco-merged rule conventions:
 * critical/high get block + alert + snapshot; medium drops block; low alert-only.
 */
function defaultActions(s: AtrRuleObject['severity']): readonly string[] {
  if (s === 'critical' || s === 'high') {
    return Object.freeze(['block_input', 'alert', 'snapshot']);
  }
  if (s === 'medium') return Object.freeze(['alert', 'snapshot']);
  return Object.freeze(['alert']);
}

// ------------------------------------------------------------------------ //

export function transformToAtr(ir: MigratorIR, opts: TransformOptions = {}): TransformResult {
  const warnings: string[] = [...ir.warnings];

  // Combinator='any' is only safe when every selection has exactly one pattern.
  // Otherwise the semantics (OR-of-ANDs) cannot be expressed in ATR's flat condition list.
  if (ir.combinator === 'any') {
    const hasMultiPattern = ir.selections.some((s) => s.patterns.length > 1);
    if (hasMultiPattern) {
      return {
        atr: null,
        warnings: [
          ...warnings,
          'combinator=any with multi-pattern selection: OR-of-ANDs not expressible in flat ATR conditions (skipped)',
        ],
      };
    }
  }

  const conditions: AtrCondition[] = [];
  for (const sel of ir.selections) {
    for (const pat of sel.patterns) {
      conditions.push(patternToCondition(pat, sel.name));
    }
  }
  if (conditions.length === 0) {
    return {
      atr: null,
      warnings: [...warnings, 'no conditions produced (all selections empty)'],
    };
  }

  const enrichment = opts.enrichment;
  const cat = classifyCategory();
  const ags = classifyAgentSource();
  const needsReview: string[] = [];

  // Resolve category and agent_source.type — enrichment wins if present.
  const finalCategory = enrichment ? enrichment.category : cat.category;
  const finalAgentSourceType = enrichment ? enrichment.agent_source_type : ags.type;
  const finalSubcategory = enrichment ? enrichment.subcategory : undefined;

  if (!enrichment) {
    if (cat.needsReview) {
      warnings.push(
        "tags.category defaulted to 'prompt-injection' — needs human review for source rule's actual semantics"
      );
      needsReview.push('tags.category');
    }
    if (ags.needsReview) {
      warnings.push("agent_source.type defaulted to 'llm_io' — needs human review");
      needsReview.push('agent_source.type');
    }
  }

  // Resolve detection conditions — enrichment's reauthored_conditions wins
  // when has_agent_analogue=true.
  let finalConditions: AtrCondition[] = conditions;
  if (
    enrichment &&
    enrichment.has_agent_analogue &&
    enrichment.reauthored_conditions &&
    enrichment.reauthored_conditions.length > 0
  ) {
    finalConditions = enrichment.reauthored_conditions.map((c) =>
      Object.freeze({
        field: c.field,
        operator: c.operator,
        value: c.value,
        ...(c.description !== undefined ? { description: c.description } : {}),
      })
    );
  } else {
    // Sigma rules use endpoint field names. Without LLM reauthoring (or when
    // has_agent_analogue=false) the rule won't activate against agent events.
    needsReview.push('detection.conditions[].field (endpoint→agent-context mapping)');
    warnings.push(
      'detection field names are Sigma endpoint-OS fields, not ATR agent-context fields ' +
        '— rules will not activate against agent events without per-rule field reauthoring'
    );
  }

  // Mark gaps that LLM enrichment didn't fill.
  if (!enrichment) {
    needsReview.push('compliance block (eu_ai_act, owasp_*, nist_ai_rmf, iso_42001)');
    needsReview.push('test_cases (true_positives + true_negatives)');
  }
  if (enrichment && !enrichment.has_agent_analogue) {
    needsReview.push(
      'detection.conditions[].field (LLM determined no agent analogue exists; ' +
        'rule kept with original endpoint fields and will not activate against agent events)'
    );
  }

  const mitre = extractMitreAttack(ir.tags);
  const externalRefs = ir.references;
  const owaspLlm = enrichment?.compliance.owasp_llm?.map((e) => e.id);
  const owaspAgentic = enrichment?.compliance.owasp_agentic?.map((e) => e.id);
  const refs: AtrReferences = {
    ...(mitre.length > 0 ? { mitre_attack: mitre } : {}),
    ...(externalRefs.length > 0 ? { external: externalRefs } : {}),
    ...(owaspLlm && owaspLlm.length > 0 ? { owasp_llm: owaspLlm } : {}),
    ...(owaspAgentic && owaspAgentic.length > 0 ? { owasp_agentic: owaspAgentic } : {}),
  };

  const atr: AtrRuleObject = {
    schema_version: '0.1',
    title: ir.title,
    id: allocateId(ir.sourceId, opts.used),
    rule_version: 1,
    status: 'experimental',
    description: ir.description,
    author: ir.author,
    date: ir.date,
    detection_tier: 'pattern',
    maturity: ir.maturity,
    severity: ir.severity,
    ...(Object.keys(refs).length > 0 ? { references: refs } : {}),
    tags: {
      category: finalCategory,
      scan_target: 'runtime',
      confidence: mapSeverityToConfidence(ir.severity),
      ...(finalSubcategory !== undefined ? { subcategory: finalSubcategory } : {}),
    },
    agent_source: {
      type: finalAgentSourceType,
      framework: ['any'],
      provider: ['any'],
    },
    detection: { conditions: finalConditions, condition: ir.combinator },
    response: {
      actions: defaultActions(ir.severity),
      auto_response_threshold: mapSeverityToActionThreshold(ir.severity),
      ...(enrichment?.message_template !== undefined
        ? { message_template: enrichment.message_template }
        : {}),
    },
    ...(enrichment?.compliance ? { compliance: enrichment.compliance } : {}),
    ...(enrichment?.test_cases ? { test_cases: enrichment.test_cases } : {}),
    migrator_provenance: {
      source: ir.source,
      source_id: ir.sourceId,
      auto_generated: true,
      needs_human_review: Object.freeze(needsReview),
      ...(ir.tags.length > 0 ? { sigma_tags: ir.tags } : {}),
      ...(enrichment
        ? {
            llm_enriched: true,
            has_agent_analogue: enrichment.has_agent_analogue,
            agent_analogue_note: enrichment.agent_analogue_note,
          }
        : {}),
    },
  };

  return { atr, warnings };
}
