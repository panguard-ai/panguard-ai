/**
 * Compliance Frameworks Registry
 * 合規框架註冊表
 *
 * @module @panguard-ai/panguard-report/frameworks
 */

import type { ComplianceControl, ComplianceFramework } from '../types.js';
import { TW_CYBER_SECURITY_CONTROLS } from './tw-cyber-security.js';
import { ISO27001_CONTROLS } from './iso27001.js';
import { SOC2_CONTROLS } from './soc2.js';

/**
 * Get controls for a given compliance framework
 * 取得指定合規框架的控制項
 */
export function getFrameworkControls(framework: ComplianceFramework): ComplianceControl[] {
  switch (framework) {
    case 'tw_cyber_security_act':
      return TW_CYBER_SECURITY_CONTROLS;
    case 'iso27001':
      return ISO27001_CONTROLS;
    case 'soc2':
      return SOC2_CONTROLS;
    default:
      return [];
  }
}

/**
 * Get framework display name
 * 取得框架顯示名稱
 */
export function getFrameworkName(framework: ComplianceFramework, language: 'zh-TW' | 'en'): string {
  const names: Record<ComplianceFramework, { 'zh-TW': string; en: string }> = {
    tw_cyber_security_act: {
      'zh-TW': '資通安全管理法',
      en: 'Taiwan Cyber Security Management Act',
    },
    iso27001: {
      'zh-TW': 'ISO/IEC 27001:2022',
      en: 'ISO/IEC 27001:2022',
    },
    soc2: {
      'zh-TW': 'SOC 2 信任服務準則',
      en: 'SOC 2 Trust Services Criteria',
    },
  };
  return names[framework]?.[language] ?? framework;
}

/**
 * Get all supported frameworks
 * 取得所有支援的框架
 */
export function getSupportedFrameworks(): ComplianceFramework[] {
  return ['tw_cyber_security_act', 'iso27001', 'soc2'];
}

export { TW_CYBER_SECURITY_CONTROLS } from './tw-cyber-security.js';
export { ISO27001_CONTROLS } from './iso27001.js';
export { SOC2_CONTROLS } from './soc2.js';
