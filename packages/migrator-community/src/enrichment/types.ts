/**
 * Enrichment type definitions (community edition).
 *
 * These are pure TypeScript interfaces — the contract that the transformer
 * accepts when given an externally-produced enrichment object. The community
 * edition does NOT ship an enrichment generator (LLM call, prompt, cache);
 * those live in the proprietary @panguard/migrator enterprise package.
 *
 * Community users have two options:
 *   1. Run the transformer without enrichment — output rules will be
 *      schema-valid but lack compliance mapping, test cases, and reauthored
 *      detection conditions.
 *   2. Produce their own Enrichment objects (manually or via their own LLM
 *      pipeline) and pass them to convertSigma() / convertYara().
 *
 * MIT licensed.
 */

export type ComplianceStrength = 'primary' | 'secondary' | 'partial';

export interface EuAiActMapping {
  article: string;
  clause?: string;
  context: string;
  strength: ComplianceStrength;
}

export interface OwaspAgenticMapping {
  id: string;
  context: string;
  strength: ComplianceStrength;
}

export interface OwaspLlmMapping {
  id: string;
  context: string;
  strength: ComplianceStrength;
}

export interface NistAiRmfMapping {
  function: 'Govern' | 'Map' | 'Measure' | 'Manage';
  subcategory: string;
  context: string;
  strength: ComplianceStrength;
}

export interface Iso42001Mapping {
  clause: string;
  clause_name?: string;
  context: string;
  strength: ComplianceStrength;
}

export interface ComplianceMapping {
  eu_ai_act?: readonly EuAiActMapping[];
  owasp_agentic?: readonly OwaspAgenticMapping[];
  owasp_llm?: readonly OwaspLlmMapping[];
  nist_ai_rmf?: readonly NistAiRmfMapping[];
  iso_42001?: readonly Iso42001Mapping[];
}

export interface TestCase {
  input: string;
  description: string;
}

export interface TestCases {
  true_positives: readonly (TestCase & { expected: 'triggered' })[];
  true_negatives: readonly (TestCase & { expected: 'not_triggered' })[];
}

export interface ReauthoredCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startswith' | 'endswith' | 'regex';
  value: string;
  description?: string;
}

export interface Enrichment {
  has_agent_analogue: boolean;
  agent_analogue_note?: string;
  reauthored_conditions?: readonly ReauthoredCondition[];
  agent_source_type: string;
  category: string;
  subcategory?: string;
  compliance: ComplianceMapping;
  test_cases?: TestCases;
  false_positives?: readonly string[];
  message_template?: string;
}
