/**
 * Investigation Tool Descriptions for LLM Function Calling
 * 調查工具描述 - 供 LLM 函式呼叫使用
 *
 * Defines JSON Schema descriptions for all 8 investigation tools,
 * compatible with OpenAI/Claude function calling format.
 * 定義所有 8 個調查工具的 JSON Schema 描述，
 * 相容於 OpenAI/Claude 函式呼叫格式。
 *
 * @module @panguard-ai/panguard-guard/investigation/tool-descriptions
 */

/**
 * Tool description for LLM function calling
 * LLM 函式呼叫的工具描述
 */
export interface ToolDescription {
  /** Tool name matching InvestigationTool type / 工具名稱（對應 InvestigationTool 類型） */
  name: string;
  /** Bilingual description of the tool / 工具的雙語描述 */
  description: string;
  /** JSON Schema for the tool's parameters / 工具參數的 JSON Schema */
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

/**
 * All 8 investigation tool descriptions for LLM function calling
 * 所有 8 個調查工具描述，供 LLM 函式呼叫使用
 *
 * Each tool includes:
 * - name: matches the InvestigationTool type literal
 * - description: bilingual (zh-TW/en) explanation of purpose and when to use
 * - parameters: JSON Schema describing expected inputs
 *
 * 每個工具包含：
 * - name: 對應 InvestigationTool 類型字面量
 * - description: 雙語（zh-TW/en）說明用途及何時使用
 * - parameters: 描述預期輸入的 JSON Schema
 */
export const INVESTIGATION_TOOL_DESCRIPTIONS: readonly ToolDescription[] = [
  {
    name: 'checkIPHistory',
    description:
      'Check if an IP address has appeared in threat intelligence feeds or previous security events. ' +
      'Use when the event contains a source IP or remote address, especially for network-originated events. ' +
      '/ 檢查 IP 位址是否出現在威脅情報來源或先前的安全事件中。' +
      '當事件包含來源 IP 或遠端位址時使用，特別是網路來源事件。',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'Why this tool should be run for the current event ' +
            '/ 為什麼應該對目前事件執行此工具',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'checkUserPrivilege',
    description:
      'Check if a user has elevated privileges (root/admin) or is an unknown user not in the baseline. ' +
      'Use when the event involves authentication, authorization, or any user-attributed activity. ' +
      '/ 檢查使用者是否擁有提升的權限（root/admin）或是基線中不存在的未知使用者。' +
      '當事件涉及認證、授權或任何使用者相關活動時使用。',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'Why this tool should be run for the current event ' +
            '/ 為什麼應該對目前事件執行此工具',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'checkTimeAnomaly',
    description:
      'Check if the event occurred during unusual hours compared to the environment baseline. ' +
      'Business hours are 06:00-22:00. Activities outside this window are flagged unless the user has a known night pattern. ' +
      'Use for any suspicious event to determine if timing is abnormal. ' +
      '/ 檢查事件是否發生在相較於環境基線的異常時段。' +
      '營業時間為 06:00-22:00。除非使用者有已知的夜間模式，否則此視窗外的活動會被標記。' +
      '用於任何可疑事件以判斷時間是否異常。',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'Why this tool should be run for the current event ' +
            '/ 為什麼應該對目前事件執行此工具',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'checkGeoLocation',
    description:
      'Check the geographic origin of a network connection by verifying the IP against baseline known connections. ' +
      'New IPs not in the baseline are flagged. Use when there is a source IP or remote address to verify. ' +
      '/ 透過比對基線已知連線來檢查網路連線的地理來源。' +
      '不在基線中的新 IP 會被標記。當有來源 IP 或遠端位址需要驗證時使用。',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'Why this tool should be run for the current event ' +
            '/ 為什麼應該對目前事件執行此工具',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'checkRelatedEvents',
    description:
      'Find correlated events within a 10-minute sliding time window. ' +
      'Correlates by source IP, username, process name, and event category. ' +
      'Use when you suspect the event is part of a larger attack pattern or campaign. ' +
      '/ 在 10 分鐘滑動時間視窗內尋找關聯事件。' +
      '按來源 IP、使用者名稱、程序名稱和事件類別進行關聯。' +
      '當懷疑事件是更大攻擊模式或活動的一部分時使用。',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'Why this tool should be run for the current event ' +
            '/ 為什麼應該對目前事件執行此工具',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'checkProcessTree',
    description:
      'Analyze the process ancestry chain for suspicious patterns. ' +
      'Checks if the process is known in the baseline and whether it has a suspicious parent process ' +
      '(e.g., cmd.exe, powershell.exe, bash, python). ' +
      'Use when the event is process-related or involves executable activity. ' +
      '/ 分析程序祖先鏈以尋找可疑模式。' +
      '檢查程序是否在基線中已知，以及是否有可疑的父程序' +
      '（例如 cmd.exe、powershell.exe、bash、python）。' +
      '當事件與程序相關或涉及可執行活動時使用。',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'Why this tool should be run for the current event ' +
            '/ 為什麼應該對目前事件執行此工具',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'checkFileReputation',
    description:
      'Check file hash and path against known malware signatures and suspicious patterns. ' +
      'Flags files in temporary directories (/tmp/, Temp) and files with suspicious extensions ' +
      '(.ps1, .vbs, .bat, .cmd, .scr, .pif, .hta). ' +
      'Use when the event involves file operations or process execution from a file path. ' +
      '/ 檢查檔案雜湊和路徑是否符合已知惡意軟體特徵和可疑模式。' +
      '標記在暫存目錄（/tmp/、Temp）中的檔案和有可疑副檔名的檔案' +
      '（.ps1、.vbs、.bat、.cmd、.scr、.pif、.hta）。' +
      '當事件涉及檔案操作或從檔案路徑執行程序時使用。',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'Why this tool should be run for the current event ' +
            '/ 為什麼應該對目前事件執行此工具',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'checkNetworkPattern',
    description:
      'Analyze network traffic patterns for anomalies by comparing against baseline connections. ' +
      'Flags new connections not in the baseline and connections to suspicious ports ' +
      '(4444, 5555, 8888, 1337, 31337, 6666, 6667, 9001). ' +
      'Use when the event involves network communication or outbound connections. ' +
      '/ 透過與基線連線比較來分析網路流量模式的異常。' +
      '標記不在基線中的新連線和連向可疑埠的連線' +
      '（4444、5555、8888、1337、31337、6666、6667、9001）。' +
      '當事件涉及網路通訊或外部連線時使用。',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'Why this tool should be run for the current event ' +
            '/ 為什麼應該對目前事件執行此工具',
        },
      },
      required: ['reason'],
    },
  },
] as const;

/**
 * Get tool description by name / 根據名稱取得工具描述
 *
 * @param name - Tool name / 工具名稱
 * @returns Tool description or undefined / 工具描述或 undefined
 */
export function getToolDescription(name: string): ToolDescription | undefined {
  return INVESTIGATION_TOOL_DESCRIPTIONS.find((t) => t.name === name);
}

/**
 * Get all tool names / 取得所有工具名稱
 *
 * @returns Array of tool names / 工具名稱陣列
 */
export function getToolNames(): string[] {
  return INVESTIGATION_TOOL_DESCRIPTIONS.map((t) => t.name);
}
