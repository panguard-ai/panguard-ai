/**
 * Investigation LLM Integration Tests
 * 調查 LLM 整合測試
 *
 * Tests for:
 * - Tool descriptions: validate all 8 tools have name, description, parameters
 * - LLM planner: mock LLM returns tool selections, verify correct steps created
 * - Fallback: when LLM unavailable, verify heuristic plan is used
 * - Error handling: when LLM throws, verify graceful fallback
 * - Integration: InvestigationEngine with mock LLM runs full investigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SecurityEvent } from '@panguard-ai/core';
import type { LLMProvider, AnalysisResult, ThreatClassification, TokenUsage } from '@panguard-ai/core';
import type { EnvironmentBaseline } from '../src/types.js';
import { INVESTIGATION_TOOL_DESCRIPTIONS, getToolDescription, getToolNames } from '../src/investigation/tool-descriptions.js';
import { createLLMPlanner, parseLLMResponse } from '../src/investigation/llm-planner.js';
import { InvestigationEngine } from '../src/investigation/index.js';
import { createEmptyBaseline } from '../src/memory/baseline.js';

// ---------------------------------------------------------------------------
// Test helpers / 測試輔助工具
// ---------------------------------------------------------------------------

/** Create a test security event / 建立測試安全事件 */
function makeEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
  return {
    id: 'evt-llm-001',
    timestamp: new Date('2026-03-03T14:30:00Z'),
    source: 'network',
    severity: 'high',
    category: 'brute_force',
    description: 'SSH brute force attempt',
    raw: {},
    host: 'test-host',
    metadata: {
      sourceIP: '103.0.0.1',
      remoteAddress: '103.0.0.1',
      user: 'testuser',
    },
    ...overrides,
  };
}

/** Create a mock LLM provider / 建立模擬 LLM 供應商 */
function createMockLLM(
  overrides: Partial<LLMProvider> = {}
): LLMProvider {
  return {
    providerType: 'ollama',
    model: 'test-model',
    analyze: vi.fn<(prompt: string, context?: string) => Promise<AnalysisResult>>().mockResolvedValue({
      summary: 'Mock analysis',
      severity: 'medium',
      confidence: 0.8,
      recommendations: [],
      rawResponse: JSON.stringify([
        { tool: 'checkTimeAnomaly', reason: 'Check timing' },
        { tool: 'checkIPHistory', reason: 'Check IP reputation' },
      ]),
    }),
    classify: vi.fn<(event: SecurityEvent) => Promise<ThreatClassification>>().mockResolvedValue({
      category: 'test',
      technique: 'T1000',
      severity: 'medium',
      confidence: 0.8,
      description: 'Mock classification',
    }),
    summarize: vi.fn<(events: SecurityEvent[]) => Promise<string>>().mockResolvedValue('Mock summary'),
    isAvailable: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
    getTokenUsage: vi.fn<() => TokenUsage>().mockReturnValue({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      estimatedCost: 0.001,
    }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tool Descriptions Tests / 工具描述測試
// ---------------------------------------------------------------------------

describe('INVESTIGATION_TOOL_DESCRIPTIONS', () => {
  it('should have exactly 8 tool descriptions / 應有 8 個工具描述', () => {
    expect(INVESTIGATION_TOOL_DESCRIPTIONS).toHaveLength(8);
  });

  it('should have all required tool names / 應包含所有必要的工具名稱', () => {
    const names = INVESTIGATION_TOOL_DESCRIPTIONS.map((t) => t.name);
    expect(names).toContain('checkIPHistory');
    expect(names).toContain('checkUserPrivilege');
    expect(names).toContain('checkTimeAnomaly');
    expect(names).toContain('checkGeoLocation');
    expect(names).toContain('checkRelatedEvents');
    expect(names).toContain('checkProcessTree');
    expect(names).toContain('checkFileReputation');
    expect(names).toContain('checkNetworkPattern');
  });

  it('each tool should have name, description, and parameters / 每個工具應有 name、description 和 parameters', () => {
    for (const tool of INVESTIGATION_TOOL_DESCRIPTIONS) {
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);

      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);

      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe('object');
      expect(tool.parameters.properties).toBeDefined();
      expect(Array.isArray(tool.parameters.required)).toBe(true);
    }
  });

  it('each tool description should be bilingual (en + zh-TW) / 每個工具描述應為雙語', () => {
    for (const tool of INVESTIGATION_TOOL_DESCRIPTIONS) {
      // Descriptions should contain both English and Chinese, separated by '/'
      expect(tool.description).toContain('/');
    }
  });

  it('each tool should have a "reason" parameter / 每個工具應有 "reason" 參數', () => {
    for (const tool of INVESTIGATION_TOOL_DESCRIPTIONS) {
      expect(tool.parameters.properties).toHaveProperty('reason');
      expect(tool.parameters.required).toContain('reason');
    }
  });
});

describe('getToolDescription', () => {
  it('should return tool description by name / 應根據名稱回傳工具描述', () => {
    const desc = getToolDescription('checkIPHistory');
    expect(desc).toBeDefined();
    expect(desc!.name).toBe('checkIPHistory');
  });

  it('should return undefined for unknown name / 對未知名稱應回傳 undefined', () => {
    expect(getToolDescription('unknownTool')).toBeUndefined();
  });
});

describe('getToolNames', () => {
  it('should return all 8 tool names / 應回傳所有 8 個工具名稱', () => {
    const names = getToolNames();
    expect(names).toHaveLength(8);
    expect(names).toContain('checkIPHistory');
    expect(names).toContain('checkNetworkPattern');
  });
});

// ---------------------------------------------------------------------------
// parseLLMResponse Tests / 解析 LLM 回應測試
// ---------------------------------------------------------------------------

describe('parseLLMResponse', () => {
  it('should parse valid JSON array response / 應解析有效的 JSON 陣列回應', () => {
    const response = JSON.stringify([
      { tool: 'checkTimeAnomaly', reason: 'Check timing patterns' },
      { tool: 'checkIPHistory', reason: 'Verify IP reputation' },
    ]);
    const steps = parseLLMResponse(response);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.tool).toBe('checkTimeAnomaly');
    expect(steps[0]!.reason).toBe('Check timing patterns');
    expect(steps[1]!.tool).toBe('checkIPHistory');
    expect(steps[1]!.reason).toBe('Verify IP reputation');
  });

  it('should extract JSON from surrounding text / 應從周圍文字中提取 JSON', () => {
    const response = 'Here are the tools:\n' +
      JSON.stringify([{ tool: 'checkTimeAnomaly', reason: 'Check' }]) +
      '\nDone.';
    const steps = parseLLMResponse(response);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.tool).toBe('checkTimeAnomaly');
  });

  it('should skip invalid tool names / 應跳過無效的工具名稱', () => {
    const response = JSON.stringify([
      { tool: 'checkTimeAnomaly', reason: 'Valid' },
      { tool: 'invalidTool', reason: 'Should be skipped' },
      { tool: 'checkIPHistory', reason: 'Valid too' },
    ]);
    const steps = parseLLMResponse(response);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.tool).toBe('checkTimeAnomaly');
    expect(steps[1]!.tool).toBe('checkIPHistory');
  });

  it('should skip duplicate tool names / 應跳過重複的工具名稱', () => {
    const response = JSON.stringify([
      { tool: 'checkTimeAnomaly', reason: 'First' },
      { tool: 'checkTimeAnomaly', reason: 'Duplicate' },
    ]);
    const steps = parseLLMResponse(response);
    expect(steps).toHaveLength(1);
  });

  it('should enforce MAX_STEPS limit (8) / 應強制 MAX_STEPS 限制 (8)', () => {
    const tools = [
      'checkIPHistory', 'checkUserPrivilege', 'checkTimeAnomaly',
      'checkGeoLocation', 'checkRelatedEvents', 'checkProcessTree',
      'checkFileReputation', 'checkNetworkPattern',
      // This 9th item should exceed the limit but all 8 valid tools are unique
    ];
    const response = JSON.stringify(tools.map((t) => ({ tool: t, reason: 'test' })));
    const steps = parseLLMResponse(response);
    expect(steps.length).toBeLessThanOrEqual(8);
  });

  it('should return empty array for invalid JSON / 無效 JSON 應回傳空陣列', () => {
    expect(parseLLMResponse('not json at all')).toEqual([]);
    expect(parseLLMResponse('{}')).toEqual([]);
    expect(parseLLMResponse('')).toEqual([]);
  });

  it('should return empty array when no brackets found / 無括號時應回傳空陣列', () => {
    expect(parseLLMResponse('just some text')).toEqual([]);
  });

  it('should handle items with missing reason / 應處理缺少 reason 的項目', () => {
    const response = JSON.stringify([
      { tool: 'checkTimeAnomaly' },
    ]);
    const steps = parseLLMResponse(response);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.reason).toContain('LLM selected');
  });

  it('should skip non-object items / 應跳過非物件項目', () => {
    const response = JSON.stringify([
      'invalid',
      42,
      null,
      { tool: 'checkTimeAnomaly', reason: 'Valid' },
    ]);
    const steps = parseLLMResponse(response);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.tool).toBe('checkTimeAnomaly');
  });
});

// ---------------------------------------------------------------------------
// LLM Planner Tests / LLM 規劃器測試
// ---------------------------------------------------------------------------

describe('createLLMPlanner', () => {
  it('should create investigation steps from LLM response / 應從 LLM 回應建立調查步驟', async () => {
    const mockLLM = createMockLLM();
    const planner = createLLMPlanner(mockLLM);
    const event = makeEvent();

    const steps = await planner.planInvestigation(event);

    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]!.tool).toBe('checkTimeAnomaly');
    expect(steps[1]!.tool).toBe('checkIPHistory');
    expect(mockLLM.analyze).toHaveBeenCalledTimes(1);
  });

  it('should pass event details in the prompt / 應在提示詞中傳遞事件詳情', async () => {
    const mockLLM = createMockLLM();
    const planner = createLLMPlanner(mockLLM);
    const event = makeEvent({ id: 'evt-special-123' });

    await planner.planInvestigation(event);

    const analyzeCall = (mockLLM.analyze as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string?];
    const prompt = analyzeCall[0];
    expect(prompt).toContain('evt-special-123');
    expect(prompt).toContain('network');
    expect(prompt).toContain('brute_force');
  });

  it('should include system prompt with tool descriptions / 應包含帶有工具描述的系統提示詞', async () => {
    const mockLLM = createMockLLM();
    const planner = createLLMPlanner(mockLLM);
    const event = makeEvent();

    await planner.planInvestigation(event);

    const analyzeCall = (mockLLM.analyze as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string?];
    const context = analyzeCall[1];
    expect(context).toBeDefined();
    expect(context).toContain('checkIPHistory');
    expect(context).toContain('checkTimeAnomaly');
    expect(context).toContain('security analyst');
  });

  it('should return empty array when LLM throws / 當 LLM 拋出錯誤時應回傳空陣列', async () => {
    const mockLLM = createMockLLM({
      analyze: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
    });
    const planner = createLLMPlanner(mockLLM);
    const event = makeEvent();

    const steps = await planner.planInvestigation(event);
    expect(steps).toEqual([]);
  });

  it('should return empty array when LLM returns unparseable response / 當 LLM 回傳無法解析的回應時應回傳空陣列', async () => {
    const mockLLM = createMockLLM({
      analyze: vi.fn().mockResolvedValue({
        summary: 'I cannot determine the tools',
        severity: 'medium',
        confidence: 0.5,
        recommendations: [],
        rawResponse: 'This is not JSON',
      }),
    });
    const planner = createLLMPlanner(mockLLM);
    const event = makeEvent();

    const steps = await planner.planInvestigation(event);
    expect(steps).toEqual([]);
  });

  it('should use rawResponse over summary when available / 可用時應優先使用 rawResponse', async () => {
    const mockLLM = createMockLLM({
      analyze: vi.fn().mockResolvedValue({
        summary: JSON.stringify([{ tool: 'checkGeoLocation', reason: 'From summary' }]),
        severity: 'medium',
        confidence: 0.8,
        recommendations: [],
        rawResponse: JSON.stringify([{ tool: 'checkIPHistory', reason: 'From rawResponse' }]),
      }),
    });
    const planner = createLLMPlanner(mockLLM);
    const event = makeEvent();

    const steps = await planner.planInvestigation(event);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.tool).toBe('checkIPHistory');
  });

  it('should fall back to summary when rawResponse is undefined / rawResponse 未定義時應回退至 summary', async () => {
    const mockLLM = createMockLLM({
      analyze: vi.fn().mockResolvedValue({
        summary: JSON.stringify([{ tool: 'checkGeoLocation', reason: 'From summary' }]),
        severity: 'medium',
        confidence: 0.8,
        recommendations: [],
        // rawResponse is undefined
      }),
    });
    const planner = createLLMPlanner(mockLLM);
    const event = makeEvent();

    const steps = await planner.planInvestigation(event);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.tool).toBe('checkGeoLocation');
  });
});

// ---------------------------------------------------------------------------
// InvestigationEngine LLM Integration Tests / 調查引擎 LLM 整合測試
// ---------------------------------------------------------------------------

describe('InvestigationEngine with LLM', () => {
  let baseline: EnvironmentBaseline;

  beforeEach(() => {
    baseline = createEmptyBaseline();
  });

  it('should use LLM plan when LLM is available / 當 LLM 可用時應使用 LLM 計畫', async () => {
    const mockLLM = createMockLLM({
      analyze: vi.fn().mockResolvedValue({
        summary: '',
        severity: 'medium',
        confidence: 0.8,
        recommendations: [],
        rawResponse: JSON.stringify([
          { tool: 'checkIPHistory', reason: 'LLM says check IP first' },
          { tool: 'checkGeoLocation', reason: 'LLM says check geo second' },
        ]),
      }),
    });

    const engine = new InvestigationEngine(baseline, mockLLM);
    const event = makeEvent();
    const result = await engine.investigate(event);

    // LLM chose checkIPHistory and checkGeoLocation
    // The heuristic for network events would also include checkTimeAnomaly and checkNetworkPattern
    // So we verify the LLM's choices appeared
    const toolsUsed = result.steps.map((s) => s.tool);
    expect(toolsUsed).toContain('checkIPHistory');
    expect(toolsUsed).toContain('checkGeoLocation');
    expect(mockLLM.analyze).toHaveBeenCalled();
  });

  it('should fallback to heuristic when LLM is not provided / 未提供 LLM 時應回退至啟發式方法', async () => {
    const engine = new InvestigationEngine(baseline);
    const event = makeEvent();
    const result = await engine.investigate(event);

    // Heuristic for network events always includes checkTimeAnomaly
    const toolsUsed = result.steps.map((s) => s.tool);
    expect(toolsUsed).toContain('checkTimeAnomaly');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('should fallback to heuristic when LLM throws / 當 LLM 拋出錯誤時應回退至啟發式方法', async () => {
    const mockLLM = createMockLLM({
      analyze: vi.fn().mockRejectedValue(new Error('Network error')),
    });

    const engine = new InvestigationEngine(baseline, mockLLM);
    const event = makeEvent();
    const result = await engine.investigate(event);

    // Should still complete investigation with heuristic plan
    expect(result.steps.length).toBeGreaterThan(0);
    const toolsUsed = result.steps.map((s) => s.tool);
    // Heuristic for network events always includes checkTimeAnomaly
    expect(toolsUsed).toContain('checkTimeAnomaly');
  });

  it('should fallback to heuristic when LLM returns empty plan / 當 LLM 回傳空計畫時應回退至啟發式方法', async () => {
    const mockLLM = createMockLLM({
      analyze: vi.fn().mockResolvedValue({
        summary: 'No tools selected',
        severity: 'low',
        confidence: 0.3,
        recommendations: [],
        rawResponse: '[]',
      }),
    });

    const engine = new InvestigationEngine(baseline, mockLLM);
    const event = makeEvent();
    const result = await engine.investigate(event);

    // Empty LLM plan triggers heuristic fallback
    expect(result.steps.length).toBeGreaterThan(0);
    const toolsUsed = result.steps.map((s) => s.tool);
    expect(toolsUsed).toContain('checkTimeAnomaly');
  });

  it('should execute LLM-selected tools and return results / 應執行 LLM 選擇的工具並回傳結果', async () => {
    const mockLLM = createMockLLM({
      analyze: vi.fn().mockResolvedValue({
        summary: '',
        severity: 'medium',
        confidence: 0.8,
        recommendations: [],
        rawResponse: JSON.stringify([
          { tool: 'checkTimeAnomaly', reason: 'Check timing' },
          { tool: 'checkUserPrivilege', reason: 'Check user' },
        ]),
      }),
    });

    const engine = new InvestigationEngine(baseline, mockLLM);
    const event = makeEvent();
    const result = await engine.investigate(event);

    // Each step should have a result with riskContribution
    for (const step of result.steps) {
      expect(step.result).toBeDefined();
      expect(typeof step.result!.finding).toBe('string');
      expect(typeof step.result!.riskContribution).toBe('number');
      expect(typeof step.result!.needsAdditionalInvestigation).toBe('boolean');
    }
  });

  it('should include reasoning in the result / 結果中應包含推理', async () => {
    const mockLLM = createMockLLM();
    const engine = new InvestigationEngine(baseline, mockLLM);
    const event = makeEvent();
    const result = await engine.investigate(event);

    expect(typeof result.reasoning).toBe('string');
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.reasoning).toContain('Investigation Summary');
  });

  it('createPlanWithLLM should return empty plan when no LLM provided / createPlanWithLLM 在未提供 LLM 時應回傳空計畫', async () => {
    const engine = new InvestigationEngine(baseline);
    const event = makeEvent();
    const plan = await engine.createPlanWithLLM(event);

    expect(plan.steps).toEqual([]);
    expect(plan.reasoning).toContain('No LLM provider');
  });

  it('should respect MAX_STEPS even with LLM plan / 即使使用 LLM 計畫也應遵守 MAX_STEPS', async () => {
    // LLM returns 8 tools (the max)
    const allTools = [
      'checkIPHistory', 'checkUserPrivilege', 'checkTimeAnomaly',
      'checkGeoLocation', 'checkRelatedEvents', 'checkProcessTree',
      'checkFileReputation', 'checkNetworkPattern',
    ];
    const mockLLM = createMockLLM({
      analyze: vi.fn().mockResolvedValue({
        summary: '',
        severity: 'medium',
        confidence: 0.8,
        recommendations: [],
        rawResponse: JSON.stringify(allTools.map((t) => ({ tool: t, reason: 'test' }))),
      }),
    });

    const engine = new InvestigationEngine(baseline, mockLLM);
    const event = makeEvent();
    const result = await engine.investigate(event);

    // Total steps (including follow-ups) should not exceed 8
    expect(result.steps.length).toBeLessThanOrEqual(8);
  });

  it('should handle process event with LLM / 應使用 LLM 處理程序事件', async () => {
    const mockLLM = createMockLLM({
      analyze: vi.fn().mockResolvedValue({
        summary: '',
        severity: 'medium',
        confidence: 0.8,
        recommendations: [],
        rawResponse: JSON.stringify([
          { tool: 'checkProcessTree', reason: 'Analyze process ancestry' },
          { tool: 'checkFileReputation', reason: 'Check executable' },
        ]),
      }),
    });

    const engine = new InvestigationEngine(baseline, mockLLM);
    const event = makeEvent({
      source: 'process',
      category: 'execution',
      description: 'Suspicious process started',
      metadata: {
        processName: 'suspicious.exe',
        parentProcess: 'powershell.exe',
      },
    });

    const result = await engine.investigate(event);
    const toolsUsed = result.steps.map((s) => s.tool);
    expect(toolsUsed).toContain('checkProcessTree');
    expect(toolsUsed).toContain('checkFileReputation');
  });
});
