/**
 * Validation schemas unit tests
 * 驗證 schema 單元測試
 */

import { describe, it, expect } from 'vitest';
import {
  validateInput,
  tryValidateInput,
  ClientIdSchema,
  ISODateSchema,
  PaginationLimitSchema,
  ReputationSchema,
  RiskLevelSchema,
  ThreatDataSchema,
  RulePublishSchema,
  ATRProposalSchema,
  ATRFeedbackSchema,
  SkillThreatSchema,
  SkillWhitelistItemSchema,
  SkillWhitelistSchema,
} from '../src/utils/validation.js';

// -- tryValidateInput --

describe('tryValidateInput', () => {
  it('returns ok:true with valid data', () => {
    const result = tryValidateInput(ClientIdSchema, 'abc-123');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('abc-123');
    }
  });

  it('returns ok:false with invalid data', () => {
    const result = tryValidateInput(ClientIdSchema, 'has spaces!');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });
});

// -- ClientIdSchema --

describe('ClientIdSchema', () => {
  it('accepts valid alphanumeric IDs', () => {
    expect(ClientIdSchema.safeParse('abc-123_DEF').success).toBe(true);
    expect(ClientIdSchema.safeParse('a').success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(ClientIdSchema.safeParse('').success).toBe(false);
  });

  it('rejects IDs with spaces or special chars', () => {
    expect(ClientIdSchema.safeParse('has space').success).toBe(false);
    expect(ClientIdSchema.safeParse('has@char').success).toBe(false);
  });

  it('rejects IDs longer than 64 chars', () => {
    expect(ClientIdSchema.safeParse('a'.repeat(65)).success).toBe(false);
  });

  it('accepts exactly 64 chars', () => {
    expect(ClientIdSchema.safeParse('a'.repeat(64)).success).toBe(true);
  });
});

// -- ISODateSchema --

describe('ISODateSchema', () => {
  it('accepts date-only format', () => {
    expect(ISODateSchema.safeParse('2024-01-15').success).toBe(true);
  });

  it('accepts date-time format', () => {
    expect(ISODateSchema.safeParse('2024-01-15T10:30:00').success).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(ISODateSchema.safeParse('yesterday').success).toBe(false);
    expect(ISODateSchema.safeParse('2024/01/15').success).toBe(false);
  });
});

// -- PaginationLimitSchema --

describe('PaginationLimitSchema', () => {
  it('coerces string to number', () => {
    expect(PaginationLimitSchema.parse('100')).toBe(100);
  });

  it('clamps to max 5000', () => {
    expect(PaginationLimitSchema.safeParse('10000').success).toBe(false);
  });

  it('defaults to 1000', () => {
    expect(PaginationLimitSchema.parse(undefined)).toBe(1000);
  });

  it('rejects zero and negative', () => {
    expect(PaginationLimitSchema.safeParse('0').success).toBe(false);
    expect(PaginationLimitSchema.safeParse('-1').success).toBe(false);
  });
});

// -- ReputationSchema --

describe('ReputationSchema', () => {
  it('coerces and accepts valid range', () => {
    expect(ReputationSchema.parse('70')).toBe(70);
    expect(ReputationSchema.parse('0')).toBe(0);
    expect(ReputationSchema.parse('100')).toBe(100);
  });

  it('defaults to 70', () => {
    expect(ReputationSchema.parse(undefined)).toBe(70);
  });

  it('rejects out of range', () => {
    expect(ReputationSchema.safeParse('101').success).toBe(false);
    expect(ReputationSchema.safeParse('-1').success).toBe(false);
  });
});

// -- RiskLevelSchema --

describe('RiskLevelSchema', () => {
  it('accepts valid risk levels', () => {
    expect(RiskLevelSchema.safeParse('LOW').success).toBe(true);
    expect(RiskLevelSchema.safeParse('MEDIUM').success).toBe(true);
    expect(RiskLevelSchema.safeParse('HIGH').success).toBe(true);
    expect(RiskLevelSchema.safeParse('CRITICAL').success).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(RiskLevelSchema.safeParse('low').success).toBe(false);
    expect(RiskLevelSchema.safeParse('unknown').success).toBe(false);
  });
});

// -- ThreatDataSchema --

describe('ThreatDataSchema', () => {
  const valid = {
    attackSourceIP: '192.168.1.100',
    attackType: 'brute_force',
    mitreTechnique: 'T1110',
    sigmaRuleMatched: 'sigma-001',
    timestamp: '2024-01-15T10:30:00Z',
    region: 'TW',
  };

  it('accepts valid threat data', () => {
    expect(ThreatDataSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts with optional industry', () => {
    expect(ThreatDataSchema.safeParse({ ...valid, industry: 'tech' }).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { attackSourceIP: _, ...missing } = valid;
    expect(ThreatDataSchema.safeParse(missing).success).toBe(false);
  });

  it('rejects empty string for required field', () => {
    expect(ThreatDataSchema.safeParse({ ...valid, region: '' }).success).toBe(false);
  });
});

// -- RulePublishSchema --

describe('RulePublishSchema', () => {
  const valid = {
    ruleId: 'rule-001',
    ruleContent: 'title: Test Rule\nstatus: stable',
    source: 'community',
  };

  it('accepts valid rule data', () => {
    expect(RulePublishSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects ruleId exceeding 256 chars', () => {
    expect(
      RulePublishSchema.safeParse({ ...valid, ruleId: 'x'.repeat(257) }).success
    ).toBe(false);
  });

  it('rejects ruleContent exceeding 64KB', () => {
    expect(
      RulePublishSchema.safeParse({ ...valid, ruleContent: 'x'.repeat(65_537) }).success
    ).toBe(false);
  });

  it('rejects missing source', () => {
    const { source: _, ...missing } = valid;
    expect(RulePublishSchema.safeParse(missing).success).toBe(false);
  });
});

// -- ATRProposalSchema --

describe('ATRProposalSchema', () => {
  const valid = {
    patternHash: 'abc123',
    ruleContent: 'rule content here',
    llmProvider: 'claude',
    llmModel: 'claude-sonnet-4-6',
    selfReviewVerdict: 'approve',
  };

  it('accepts valid proposal', () => {
    expect(ATRProposalSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing patternHash', () => {
    const { patternHash: _, ...missing } = valid;
    expect(ATRProposalSchema.safeParse(missing).success).toBe(false);
  });

  it('rejects empty llmProvider', () => {
    expect(ATRProposalSchema.safeParse({ ...valid, llmProvider: '' }).success).toBe(false);
  });
});

// -- ATRFeedbackSchema --

describe('ATRFeedbackSchema', () => {
  it('accepts valid feedback', () => {
    expect(
      ATRFeedbackSchema.safeParse({ ruleId: 'rule-001', isTruePositive: true }).success
    ).toBe(true);
    expect(
      ATRFeedbackSchema.safeParse({ ruleId: 'rule-001', isTruePositive: false }).success
    ).toBe(true);
  });

  it('rejects non-boolean isTruePositive', () => {
    expect(
      ATRFeedbackSchema.safeParse({ ruleId: 'rule-001', isTruePositive: 'yes' }).success
    ).toBe(false);
  });

  it('rejects missing ruleId', () => {
    expect(ATRFeedbackSchema.safeParse({ isTruePositive: true }).success).toBe(false);
  });
});

// -- SkillThreatSchema --

describe('SkillThreatSchema', () => {
  const valid = {
    skillHash: 'sha256-abc',
    skillName: 'evil-skill',
    riskScore: 85,
    riskLevel: 'HIGH' as const,
  };

  it('accepts valid skill threat', () => {
    expect(SkillThreatSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts with findingSummaries', () => {
    const withFindings = {
      ...valid,
      findingSummaries: [
        { id: 'f1', category: 'exec', severity: 'high', title: 'Shell command' },
      ],
    };
    expect(SkillThreatSchema.safeParse(withFindings).success).toBe(true);
  });

  it('rejects riskScore > 100', () => {
    expect(SkillThreatSchema.safeParse({ ...valid, riskScore: 101 }).success).toBe(false);
  });

  it('rejects riskScore < 0', () => {
    expect(SkillThreatSchema.safeParse({ ...valid, riskScore: -1 }).success).toBe(false);
  });

  it('rejects invalid riskLevel', () => {
    expect(SkillThreatSchema.safeParse({ ...valid, riskLevel: 'UNKNOWN' }).success).toBe(false);
  });

  it('rejects string riskScore', () => {
    expect(SkillThreatSchema.safeParse({ ...valid, riskScore: '85' }).success).toBe(false);
  });
});

// -- SkillWhitelistItemSchema --

describe('SkillWhitelistItemSchema', () => {
  it('accepts valid item', () => {
    expect(
      SkillWhitelistItemSchema.safeParse({ skillName: 'safe-skill' }).success
    ).toBe(true);
  });

  it('accepts with fingerprintHash', () => {
    expect(
      SkillWhitelistItemSchema.safeParse({
        skillName: 'safe-skill',
        fingerprintHash: 'abc123',
      }).success
    ).toBe(true);
  });

  it('rejects empty skillName', () => {
    expect(SkillWhitelistItemSchema.safeParse({ skillName: '' }).success).toBe(false);
  });

  it('rejects missing skillName', () => {
    expect(SkillWhitelistItemSchema.safeParse({}).success).toBe(false);
  });
});

// -- SkillWhitelistSchema (batch) --

describe('SkillWhitelistSchema', () => {
  it('accepts single skill via top-level fields', () => {
    expect(
      SkillWhitelistSchema.safeParse({ skillName: 'my-skill' }).success
    ).toBe(true);
  });

  it('accepts batch via skills array', () => {
    expect(
      SkillWhitelistSchema.safeParse({
        skills: [
          { skillName: 'skill-a' },
          { skillName: 'skill-b', fingerprintHash: 'hash-b' },
        ],
      }).success
    ).toBe(true);
  });
});

// -- validateInput (throws on failure) --

describe('validateInput', () => {
  it('returns validated data on success', () => {
    const result = validateInput(ClientIdSchema, 'valid-id');
    expect(result).toBe('valid-id');
  });

  it('throws on validation failure', () => {
    expect(() => validateInput(ClientIdSchema, '')).toThrow('Validation failed');
  });
});
