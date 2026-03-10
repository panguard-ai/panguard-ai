/**
 * ATR Coverage Analyzer - Analyzes rule sets for coverage gaps
 * against OWASP Agentic Top 10 and MITRE ATLAS frameworks.
 * @module agent-threat-rules/coverage-analyzer
 */

import type { ATRRule, ATRCategory } from './types.js';

export interface CoverageGap {
  framework: string;
  riskId: string;
  riskName: string;
  currentRuleCount: number;
  recommendedMin: number;
}

export interface CoverageReport {
  totalRules: number;
  gaps: CoverageGap[];
  categoryDistribution: Record<string, number>;
  suggestions: string[];
}

// ---------------------------------------------------------------------------
// OWASP Agentic Top 10 (ASI01-ASI10) mapping to ATR categories
// ---------------------------------------------------------------------------

interface FrameworkItem {
  readonly id: string;
  readonly name: string;
  readonly categories: readonly ATRCategory[];
  readonly recommendedMin: number;
  /** If true, there are no direct ATR rule categories for this risk */
  readonly noDirectRules?: boolean;
}

const OWASP_AGENTIC_TOP_10: readonly FrameworkItem[] = [
  {
    id: 'ASI01',
    name: 'Prompt Injection',
    categories: ['prompt-injection'],
    recommendedMin: 3,
  },
  {
    id: 'ASI02',
    name: 'Tool/Skill Poisoning',
    categories: ['tool-poisoning'],
    recommendedMin: 2,
  },
  {
    id: 'ASI03',
    name: 'Insecure Output Handling',
    categories: ['context-exfiltration'],
    recommendedMin: 2,
  },
  {
    id: 'ASI04',
    name: 'Privilege Escalation',
    categories: ['privilege-escalation'],
    recommendedMin: 2,
  },
  {
    id: 'ASI05',
    name: 'Data Poisoning',
    categories: ['data-poisoning'],
    recommendedMin: 2,
  },
  {
    id: 'ASI06',
    name: 'Excessive Autonomy',
    categories: ['excessive-autonomy'],
    recommendedMin: 2,
  },
  {
    id: 'ASI07',
    name: 'Multi-Agent Manipulation',
    categories: ['agent-manipulation'],
    recommendedMin: 2,
  },
  {
    id: 'ASI08',
    name: 'Model Abuse',
    categories: ['model-abuse'],
    recommendedMin: 2,
  },
  {
    id: 'ASI09',
    name: 'Insufficient Logging',
    categories: [],
    recommendedMin: 1,
    noDirectRules: true,
  },
  {
    id: 'ASI10',
    name: 'Supply Chain Compromise',
    categories: ['skill-compromise'],
    recommendedMin: 2,
  },
];

// ---------------------------------------------------------------------------
// MITRE ATLAS techniques to check
// ---------------------------------------------------------------------------

const MITRE_ATLAS_TECHNIQUES: readonly FrameworkItem[] = [
  {
    id: 'AML.T0051',
    name: 'LLM Prompt Injection',
    categories: ['prompt-injection'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0051.000',
    name: 'LLM Prompt Injection: Direct',
    categories: ['prompt-injection'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0051.001',
    name: 'LLM Prompt Injection: Indirect',
    categories: ['prompt-injection'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0053',
    name: 'Data Poisoning',
    categories: ['data-poisoning'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0056',
    name: 'LLM Plugin Compromise',
    categories: ['tool-poisoning', 'skill-compromise'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0010',
    name: 'ML Supply Chain Compromise',
    categories: ['skill-compromise', 'tool-poisoning'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0020',
    name: 'Poison Training Data',
    categories: ['data-poisoning'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0018',
    name: 'Backdoor ML Model',
    categories: ['model-abuse', 'data-poisoning'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0024',
    name: 'Exfiltration via ML Inference API',
    categories: ['context-exfiltration'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0040',
    name: 'ML Model Inference API Access',
    categories: ['model-abuse'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0043',
    name: 'Craft Adversarial Data',
    categories: ['data-poisoning', 'prompt-injection'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0044',
    name: 'Full ML Model Access',
    categories: ['model-abuse'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0046',
    name: 'Evade ML Model',
    categories: ['prompt-injection', 'agent-manipulation'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0047',
    name: 'ML-Enabled Product/Service Abuse',
    categories: ['model-abuse', 'excessive-autonomy'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0050',
    name: 'Command and Control via ML Service',
    categories: ['agent-manipulation'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0052.000',
    name: 'Phishing via LLM',
    categories: ['model-abuse'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0054',
    name: 'LLM Jailbreak',
    categories: ['prompt-injection'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0055',
    name: 'Unsafe LLM Output',
    categories: ['context-exfiltration', 'model-abuse'],
    recommendedMin: 1,
  },
  {
    id: 'AML.T0057',
    name: 'LLM Data Leakage',
    categories: ['context-exfiltration'],
    recommendedMin: 1,
  },
];

// ---------------------------------------------------------------------------
// All 9 ATR categories
// ---------------------------------------------------------------------------

const ALL_ATR_CATEGORIES: readonly ATRCategory[] = [
  'prompt-injection',
  'tool-poisoning',
  'context-exfiltration',
  'agent-manipulation',
  'privilege-escalation',
  'excessive-autonomy',
  'data-poisoning',
  'model-abuse',
  'skill-compromise',
];

// ---------------------------------------------------------------------------
// CoverageAnalyzer
// ---------------------------------------------------------------------------

export class CoverageAnalyzer {
  private readonly rules: readonly ATRRule[];

  constructor(rules: readonly ATRRule[]) {
    this.rules = rules;
  }

  /**
   * Analyze the rule set for coverage gaps against OWASP Agentic Top 10,
   * MITRE ATLAS, and ATR category distribution.
   */
  analyze(): CoverageReport {
    const activeRules = this.rules.filter((r) => r.status !== 'deprecated');
    const categoryDistribution = this.buildCategoryDistribution(activeRules);
    const gaps: CoverageGap[] = [];

    // Check OWASP Agentic Top 10
    for (const item of OWASP_AGENTIC_TOP_10) {
      const count = this.countCoveringRules(activeRules, item);
      if (count < item.recommendedMin) {
        gaps.push({
          framework: 'OWASP Agentic Top 10',
          riskId: item.id,
          riskName: item.name,
          currentRuleCount: count,
          recommendedMin: item.recommendedMin,
        });
      }
    }

    // Check MITRE ATLAS techniques
    for (const item of MITRE_ATLAS_TECHNIQUES) {
      const count = this.countCoveringRules(activeRules, item);
      if (count < item.recommendedMin) {
        gaps.push({
          framework: 'MITRE ATLAS',
          riskId: item.id,
          riskName: item.name,
          currentRuleCount: count,
          recommendedMin: item.recommendedMin,
        });
      }
    }

    const suggestions = this.generateSuggestions(gaps, categoryDistribution);

    return {
      totalRules: activeRules.length,
      gaps,
      categoryDistribution,
      suggestions,
    };
  }

  /**
   * Count how many active rules cover a given framework item,
   * either by ATR category match or by explicit reference in rule metadata.
   */
  private countCoveringRules(
    activeRules: readonly ATRRule[],
    item: FrameworkItem,
  ): number {
    if (item.noDirectRules) {
      return 0;
    }

    const covering = new Set<string>();

    for (const rule of activeRules) {
      const matchesCategory = item.categories.includes(rule.tags.category);

      const matchesOwaspRef =
        rule.references?.owasp_llm?.some((ref) => ref.includes(item.id)) ?? false;
      const matchesMitreRef =
        rule.references?.mitre_atlas?.some((ref) => ref.includes(item.id)) ?? false;

      if (matchesCategory || matchesOwaspRef || matchesMitreRef) {
        covering.add(rule.id);
      }
    }

    return covering.size;
  }

  /**
   * Build a distribution count of rules per ATR category.
   */
  private buildCategoryDistribution(
    activeRules: readonly ATRRule[],
  ): Record<string, number> {
    const dist: Record<string, number> = {};

    for (const cat of ALL_ATR_CATEGORIES) {
      dist[cat] = 0;
    }

    for (const rule of activeRules) {
      const cat = rule.tags.category;
      dist[cat] = (dist[cat] ?? 0) + 1;
    }

    return dist;
  }

  /**
   * Generate human-readable suggestions based on identified gaps
   * and category distribution.
   */
  private generateSuggestions(
    gaps: readonly CoverageGap[],
    categoryDistribution: Readonly<Record<string, number>>,
  ): string[] {
    const suggestions: string[] = [];

    // Group OWASP gaps
    const owaspGaps = gaps.filter((g) => g.framework === 'OWASP Agentic Top 10');
    if (owaspGaps.length > 0) {
      const ids = owaspGaps.map((g) => g.riskId).join(', ');
      suggestions.push(
        `OWASP Agentic Top 10 coverage gaps found for: ${ids}. ` +
        `Create rules targeting these risk areas to improve coverage.`,
      );
    }

    // Group MITRE gaps
    const mitreGaps = gaps.filter((g) => g.framework === 'MITRE ATLAS');
    if (mitreGaps.length > 0) {
      const ids = mitreGaps.map((g) => g.riskId).join(', ');
      suggestions.push(
        `MITRE ATLAS technique coverage gaps found for: ${ids}. ` +
        `Add detection rules or reference mappings for these techniques.`,
      );
    }

    // Check for empty categories
    const emptyCategories = ALL_ATR_CATEGORIES.filter(
      (cat) => (categoryDistribution[cat] ?? 0) === 0,
    );
    if (emptyCategories.length > 0) {
      suggestions.push(
        `No rules found for ATR categories: ${emptyCategories.join(', ')}. ` +
        `Consider adding at least one rule per category for baseline coverage.`,
      );
    }

    // ASI09 (Insufficient Logging) always appears as a gap since no direct rules exist
    const asi09Gap = gaps.find((g) => g.riskId === 'ASI09');
    if (asi09Gap) {
      suggestions.push(
        `ASI09 (Insufficient Logging) has no direct ATR rule category. ` +
        `Consider implementing logging validation at the agent framework level ` +
        `rather than through detection rules.`,
      );
    }

    // Suggest overall improvement if many gaps
    if (gaps.length > 10) {
      suggestions.push(
        `${gaps.length} total coverage gaps detected. Prioritize OWASP Agentic Top 10 ` +
        `gaps first, then address MITRE ATLAS technique gaps.`,
      );
    }

    if (suggestions.length === 0) {
      suggestions.push('Rule coverage looks good across both OWASP and MITRE frameworks.');
    }

    return suggestions;
  }
}
