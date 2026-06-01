/**
 * Unit coverage for the compliance -> control-ref flattener. This is the
 * traceability bridge that lets scan-seeded findings inherit the same
 * framework mappings the coverage report uses, so it must agree with the
 * report generator's parseRule on identifier shape per framework.
 */

import { describe, it, expect } from 'vitest';
import { controlsFromCompliance } from '../../src/lib/atr-rules';

describe('controlsFromCompliance', () => {
  it('returns [] for missing / non-object input', () => {
    expect(controlsFromCompliance(undefined)).toEqual([]);
  });

  it('maps owasp_agentic / owasp_llm via the id field', () => {
    const out = controlsFromCompliance({
      owasp_agentic: [{ id: 'ASI04', context: 'Tool misuse', strength: 'primary' }],
      owasp_llm: [{ id: 'LLM01', context: 'Prompt injection' }],
    });
    expect(out).toContainEqual({
      framework: 'owasp-agentic',
      identifier: 'ASI04',
      context: 'Tool misuse',
      strength: 'primary',
    });
    expect(out).toContainEqual({
      framework: 'owasp-llm',
      identifier: 'LLM01',
      context: 'Prompt injection',
      strength: 'primary',
    });
  });

  it('uses the article field for EU AI Act and section for Colorado', () => {
    const out = controlsFromCompliance({
      eu_ai_act: [{ article: 'Art. 15', context: 'Cybersecurity' }],
      colorado_ai_act: [{ section: '6-1-1703', context: 'Risk management' }],
    });
    expect(out).toContainEqual({
      framework: 'eu-ai-act',
      identifier: 'Art. 15',
      context: 'Cybersecurity',
      strength: 'primary',
    });
    expect(out).toContainEqual({
      framework: 'colorado-ai-act',
      identifier: '6-1-1703',
      context: 'Risk management',
      strength: 'primary',
    });
  });

  it('addresses NIST AI RMF as function.subcategory', () => {
    const out = controlsFromCompliance({
      nist_ai_rmf: [{ function: 'GOVERN', subcategory: '1.2', context: 'Accountability' }],
    });
    expect(out).toContainEqual({
      framework: 'nist-ai-rmf',
      identifier: 'GOVERN.1.2',
      context: 'Accountability',
      strength: 'primary',
    });
  });

  it('uses the clause field for ISO 42001 and preserves a valid strength', () => {
    const out = controlsFromCompliance({
      iso_42001: [{ clause: 'A.6.2', context: 'Impact assessment', strength: 'secondary' }],
    });
    expect(out).toContainEqual({
      framework: 'iso-42001',
      identifier: 'A.6.2',
      context: 'Impact assessment',
      strength: 'secondary',
    });
  });

  it('drops entries missing an identifier or a context', () => {
    const out = controlsFromCompliance({
      eu_ai_act: [
        { article: 'Art. 15' }, // no context -> dropped
        { context: 'orphan' }, // no identifier -> dropped
        { article: 'Art. 9', context: 'Risk management' }, // kept
      ],
    });
    expect(out).toEqual([
      { framework: 'eu-ai-act', identifier: 'Art. 9', context: 'Risk management', strength: 'primary' },
    ]);
  });

  it('drops NIST entries whose identifier collapses to "."', () => {
    expect(controlsFromCompliance({ nist_ai_rmf: [{ context: 'no ids' }] })).toEqual([]);
  });

  it('normalises strength: only secondary/partial survive, else primary', () => {
    const out = controlsFromCompliance({
      owasp_llm: [
        { id: 'LLM01', context: 'a', strength: 'partial' },
        { id: 'LLM02', context: 'b', strength: 'bogus' },
        { id: 'LLM03', context: 'c' },
      ],
    });
    expect(out.find((c) => c.identifier === 'LLM01')?.strength).toBe('partial');
    expect(out.find((c) => c.identifier === 'LLM02')?.strength).toBe('primary');
    expect(out.find((c) => c.identifier === 'LLM03')?.strength).toBe('primary');
  });

  it('ignores non-array compliance values', () => {
    expect(controlsFromCompliance({ eu_ai_act: 'not-an-array' })).toEqual([]);
  });
});
