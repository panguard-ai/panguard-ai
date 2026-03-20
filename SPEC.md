# Panguard AI — AI 驅動的自適應端點防護平台

> **這份文件是給 AI Agent（Claude Code）的開發指引。**
> Agent 應從頭到尾閱讀本文件，然後依照 Phase 順序逐步完成開發。
> 每完成一個 checkpoint，在 `progress.md` 中記錄進度與問題。
> 商業模型、定價、融資等資訊請見 `PhalanxAI_Pitch_中文版.md`，本文件只講技術。

---

## 產品定位

**一行指令安裝，AI 全自動保護你的機器。有事它會告訴你，沒事你什麼都不用做。**

我們服務三種人，他們都不懂資安：

1. **個人開發者 / AI 開發者**：有 VPS，伺服器暴露公網，AI 生成 code 品質不穩定
2. **小型企業（5-50 人）**：沒有 IT 部門，員工亂點附件，被勒索軟體打中就倒閉
3. **中型企業（50-500 人）**：有 IT 沒有資安，需要合規報告

### 核心設計原則

1. **用戶不動腦**：安裝 = 一行指令。設定 = AI 自動完成。日常操作 = 零
2. **Chat 是唯一介面**：有事 AI 透過通訊軟體主動通知。個人用 LINE/Telegram，企業用 Slack/Webhook，合規場景用加密管道
3. **人話優先**：用戶永遠不會看到 Sigma / YARA / IOC / MITRE ATT&CK 這些術語
4. **資安不能中斷**：token 不夠 → 降級本地模型 → 再不夠 → 降級規則引擎。永遠有防護
5. **三層漏斗省 token**：規則引擎 90% → 本地 AI 7%（僅 Server）→ 雲端 AI 3-8%
   - Server 環境（VPS/雲端）：Layer 1 90% → Layer 2 7% → Layer 3 3%
   - 桌機/筆電環境：Layer 1 90% → Layer 3 5-8%（跳過 Layer 2，避免搶資源）
6. **越用越準**：Context Memory + 集體威脅智慧 + 快取共享

---

## 產品線

| 產品                | 功能                                       | 優先級 |
| ------------------- | ------------------------------------------ | ------ |
| **Panguard Scan**   | 60 秒資安健檢 + PDF 報告                   | P0     |
| **Panguard Guard**  | AI 即時端點監控 + 自動回應                 | P0     |
| **Panguard Chat**   | AI 資安副駕駛（Guard 的展示層 + 互動介面） | P0     |
| **Panguard Trap**   | 智慧蜜罐                                   | P1     |
| **Panguard Report** | AI 合規報告產生器                          | P1     |

**Panguard Chat 是 P0。** 沒有 Chat，Guard 對我們的 TA 來說就是一個裝了不知道在幹嘛的東西。

---

## 整體架構

```
                                    用戶
                                     │
                          ┌──────────┴──────────┐
                          │    Panguard Chat       │
                          │  通知管道分層：       │
                          │  個人: LINE/TG/Slack  │
                          │  企業: Slack/Webhook  │
                          │  合規: mTLS/SIEM整合  │
                          └──────────┬──────────┘
                                     │
                          ┌──────────┴──────────┐
                          │   Chat Agent         │
                          │  翻譯技術→人話        │
                          │  處理追問（低 token） │
                          └──────────┬──────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
   主動推送通知                  追問 Q&A                    狀態查詢
   （告警/日報）              （在已有 context               （週報/摘要）
        │                    上小範圍補充）                       │
        └────────────────────────────┼────────────────────────────┘
                                     │
                          ┌──────────┴──────────┐
                          │   Panguard Guard       │
                          │   核心分析引擎        │
                          └──────────┬──────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
     ┌────────┴────────┐   ┌────────┴────────┐   ┌────────┴────────┐
     │  Detect Agent    │   │ Analyze Agent   │   │ Respond Agent   │
     │                  │   │                 │   │                 │
     │ 監控系統事件      │   │ Dynamic         │   │ 執行回應動作    │
     │ 規則引擎比對      │   │ Reasoning       │   │ 封鎖/隔離/通知  │
     │ 三層漏斗分流      │   │ 深度調查分析    │   │ Confidence 閾值 │
     └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
              │                      │                      │
              └──────────────────────┼──────────────────────┘
                                     │
                          ┌──────────┴──────────┐
                          │   Report Agent       │
                          │   更新基線/回饋學習   │
                          │   產生報告/合規文件   │
                          └──────────┬──────────┘
                                     │
                          ┌──────────┴──────────┐
                          │  Panguard Threat Cloud│
                          │  匿名化上傳          │
                          │  快取共享            │
                          │  規則推送            │
                          └─────────────────────┘
```

---

## 五大 Agent 詳細規格

### Agent 1: Detect Agent

**職責：** 監控系統事件，比對規則，透過三層漏斗分流事件。

#### 輸入

```typescript
// 系統監控引擎持續產出的原始事件流
interface RawSystemEvent {
  source:
    | 'windows_etw'
    | 'windows_event_log'
    | 'linux_auditd'
    | 'linux_syslog'
    | 'network_monitor'
    | 'file_integrity'
    | 'process_monitor';
  timestamp: Date;
  host: string;
  raw: Record<string, unknown>; // 原始事件資料
}
```

#### 處理流程

```
RawSystemEvent 進入
        │
        ▼
┌─────────────────────────────────────────────────────┐
│ Step 1: 事件標準化                                    │
│                                                       │
│ 把不同來源的原始事件轉換成統一的 SecurityEvent 格式：   │
│ - Windows Event ID 4625 → type: 'login_failed'       │
│ - Linux auth.log failed → type: 'login_failed'       │
│ - 新外連 → type: 'outbound_connection'               │
│ - 新程序啟動 → type: 'process_created'               │
│ - 檔案變更 → type: 'file_modified'                   │
│                                                       │
│ 所有事件附加：                                         │
│ - MITRE ATT&CK 初步分類（根據事件類型）                │
│ - 嚴重度初步評估（info/low/medium/high/critical）     │
│ - 環境上下文（來自 Context Memory 的基線數據）         │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ Step 2: Context Memory 基線比對                       │
│                                                       │
│ if (learningMode) {                                   │
│   // 前 7 天：只記錄，不判斷                            │
│   baseline.record(event);                             │
│   return { action: 'log_only' };                      │
│ }                                                     │
│                                                       │
│ anomalyScore = compareToBaseline(event, baseline);    │
│ // 0.0 = 完全正常（在基線內）                          │
│ // 1.0 = 極度異常（從未見過的行為）                    │
│                                                       │
│ if (anomalyScore < 0.2) {                             │
│   return { action: 'log_only' };  // 正常行為，略過    │
│ }                                                     │
│ // anomalyScore ≥ 0.2 → 進入三層漏斗                  │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ Step 3: 三層處理漏斗                                  │
│                                                       │
│ ┌─ Layer 1: 規則引擎 ─────────────────────────────┐  │
│ │ Sigma Rule 比對（Tigma 引擎）                     │  │
│ │ YARA 特徵比對                                     │  │
│ │ 惡意 IP/IOC 黑名單比對（AbuseIPDB + ThreatFox）  │  │
│ │                                                   │  │
│ │ if (sigmaMatch.severity === 'critical') {         │  │
│ │   // 高確定性已知威脅 → 直接送 Respond Agent      │  │
│ │   return { verdict: 'malicious', confidence: 95 };│  │
│ │ }                                                 │  │
│ │ if (sigmaMatch && !ambiguous) {                   │  │
│ │   return { verdict: sigmaMatch.verdict,           │  │
│ │            confidence: sigmaMatch.confidence };   │  │
│ │ }                                                 │  │
│ │ // 規則引擎無法確定 → 往下                        │  │
│ └───────────────────────────────────────────────────┘  │
│                        │                               │
│ ┌─ 快取查詢 ──────────────────────────────────────┐   │
│ │ hash = generateThreatPatternHash(event);          │  │
│ │ cached = await threatCloud.getCachedAnalysis(hash);│  │
│ │ if (cached && cached.confidence >= 70) {          │  │
│ │   return cached.verdict;  // 集體情報快取命中      │  │
│ │ }                                                 │  │
│ └───────────────────────────────────────────────────┘  │
│                        │                               │
│ ┌─ Layer 2: 本地小模型 ──────────────────────────┐    │
│ │ model: Ollama (llama3 / phi3 / mistral)         │    │
│ │ task: 三分類（benign / suspicious / malicious）  │    │
│ │                                                 │    │
│ │ ⚠️ Layer 2 僅在 Server 環境啟用                  │    │
│ │ 桌機/筆電 → 跳過 Layer 2 → 直接到 Layer 3      │    │
│ │                                                 │    │
│ │ ⚠️ Ollama 安全加固（必做）：                      │    │
│ │ - 綁定 127.0.0.1:11434（不對外暴露）             │    │
│ │ - 設定 OLLAMA_ORIGINS=http://127.0.0.1          │    │
│ │ - 不載入用戶不需要的模型                          │    │
│ │ - 定期更新 Ollama 版本（CVE-2024-39722 等）      │    │
│ │                                                 │    │
│ │ prompt:                                         │    │
│ │ """                                             │    │
│ │ 你是資安分析師。分析以下安全事件並分類。          │    │
│ │ 只回答 JSON: {"class":"benign|suspicious|        │    │
│ │ malicious","confidence":0-100,"reason":"..."}    │    │
│ │                                                 │    │
│ │ 事件：{event.standardized}                       │    │
│ │ 環境基線：{baseline.summary}                     │    │
│ │ 異常分數：{anomalyScore}                         │    │
│ │ """                                             │    │
│ │                                                 │    │
│ │ if (result.class === 'benign' &&                │    │
│ │     result.confidence >= 80) {                  │    │
│ │   return { verdict: 'benign' };  // 本地判定安全 │    │
│ │ }                                               │    │
│ │ if (result.class === 'malicious' &&             │    │
│ │     result.confidence >= 90) {                  │    │
│ │   return { verdict: 'malicious' };  // 本地判定  │    │
│ │ }                                               │    │
│ │ // 不夠確定 → 送雲端                             │    │
│ └─────────────────────────────────────────────────┘    │
│                        │                               │
│ ┌─ Layer 3: 雲端大模型 ──────────────────────────┐    │
│ │ → 送往 Analyze Agent 進行 Dynamic Reasoning     │    │
│ └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

#### 監控項目清單（按 SwiftOnSecurity/sysmon-config 標準）

**Windows 監控（透過 ETW + Event Log）：**

| Event ID    | 類型          | 說明                | MITRE ATT&CK |
| ----------- | ------------- | ------------------- | ------------ |
| 4625        | 登入失敗      | 暴力破解偵測        | T1110        |
| 4720        | 帳號建立      | 後門帳號偵測        | T1136        |
| 4732        | 群組成員變更  | 權限提升偵測        | T1098        |
| 7045        | 服務安裝      | 持久化偵測          | T1543.003    |
| 1 (Sysmon)  | 程序建立      | 可疑程序偵測        | T1059        |
| 3 (Sysmon)  | 網路連線      | C2 通訊偵測         | T1071        |
| 11 (Sysmon) | 檔案建立      | 惡意檔案投放        | T1105        |
| 13 (Sysmon) | Registry 修改 | 持久化偵測          | T1547        |
| 22 (Sysmon) | DNS 查詢      | DNS 隧道/C2         | T1071.004    |
| 4688        | 程序建立      | PowerShell 編碼指令 | T1059.001    |
| 4657        | Registry 修改 | 登錄檔劫持          | T1112        |

**Linux 監控（透過 auditd + syslog）：**

| 來源      | 類型            | 說明           | MITRE ATT&CK |
| --------- | --------------- | -------------- | ------------ |
| auth.log  | SSH 失敗登入    | 暴力破解       | T1110        |
| auth.log  | sudo 使用       | 權限提升       | T1548        |
| auditd    | execve 系統呼叫 | 可疑程序執行   | T1059        |
| auditd    | 檔案權限變更    | chmod 777 等   | T1222        |
| syslog    | cron 變更       | 排程任務持久化 | T1053        |
| /proc/net | 新外連          | C2 通訊        | T1071        |
| inotify   | 關鍵檔案變更    | /etc/passwd 等 | T1098        |

**跨平台監控：**

| 類型       | 說明                     | 實作方式                 |
| ---------- | ------------------------ | ------------------------ |
| 網路連線   | 新外連偵測、惡意 IP 比對 | netstat 輪詢 + IP 黑名單 |
| 程序監控   | 新程序、可疑路徑/名稱    | OS API 輪詢              |
| 檔案完整性 | 關鍵系統檔案 hash 比對   | SHA256 定期掃描          |
| Port 監聽  | 新開放 Port 偵測         | netstat 輪詢             |

#### Detect Agent Checkpoint

- 能從 Windows Event Log 即時捕捉 Event ID 4625 並標準化為 SecurityEvent
- 能從 Linux auth.log 即時捕捉 SSH 失敗登入
- 三層漏斗正確分流：模擬 100 個事件，≤10% 進入 Layer 3
- Layer 3 API 失敗時自動降級到 Layer 2
- 所有事件附帶 MITRE ATT&CK 編號

---

### Agent 2: Analyze Agent

**職責：** 對 Layer 3 事件執行 Dynamic Reasoning 深度分析。這是整個系統最「聰明」的部分。

#### 只有 Layer 3 事件會到這裡

Detect Agent 的 Layer 1（規則引擎）和 Layer 2（本地模型）已經處理了 97% 的事件。只有剩下 ~3% 的灰色地帶事件——規則引擎沒有匹配、本地模型不夠確定的——才會送到 Analyze Agent。

#### Dynamic Reasoning 執行流程

```typescript
async function analyzeEvent(
  event: SecurityEvent,
  context: AnalysisContext
): Promise<ThreatVerdict> {
  // ─── Phase 1: 制定調查計畫 ───
  const investigationPlan = await cloudLLM.call({
    system: ANALYZE_SYSTEM_PROMPT,
    user: `
      ## 待分析事件
      類型：${event.type}
      時間：${event.timestamp}
      來源：${event.source}
      內容：${JSON.stringify(event.details)}
      
      ## 環境上下文
      作業系統：${context.os}
      已知正常行為：${JSON.stringify(context.baseline.summary)}
      異常分數：${event.anomalyScore}
      
      ## 相關歷史事件（最近 24 小時）
      ${JSON.stringify(context.recentRelatedEvents)}
      
      ## 已知威脅情報
      來源 IP 信譽：${context.ipReputation}
      已知 IOC 匹配：${context.iocMatches}
      
      ## 指令
      請制定調查計畫。你有以下調查工具可用：
      ${AVAILABLE_TOOLS.map((t) => `- ${t.name}: ${t.description}`).join('\n')}
      
      回傳 JSON：
      {
        "initialAssessment": "你的初步判斷",
        "investigationSteps": [
          {"tool": "工具名", "reason": "為什麼要用這個工具", "params": {...}}
        ]
      }
    `,
    maxTokens: 1000,
  });

  // ─── Phase 2: 逐步執行調查 ───
  const findings: InvestigationFinding[] = [];

  for (const step of investigationPlan.investigationSteps) {
    // 執行調查工具
    const toolResult = await executeInvestigationTool(step.tool, step.params, event);
    findings.push({ step, result: toolResult });

    // 每步結果可能觸發 replan
    if (toolResult.suspicious) {
      const additionalSteps = await cloudLLM.call({
        system: REPLAN_SYSTEM_PROMPT,
        user: `
          原始事件：${event.summary}
          已完成調查：${JSON.stringify(findings)}
          最新發現：${JSON.stringify(toolResult)}
          
          基於最新發現，是否需要額外調查步驟？
          回傳 JSON：{"additionalSteps": [...], "reason": "..."}
        `,
        maxTokens: 500,
      });
      investigationPlan.investigationSteps.push(...additionalSteps.additionalSteps);
    }
  }

  // ─── Phase 3: 綜合判決 ───
  const verdict = await cloudLLM.call({
    system: VERDICT_SYSTEM_PROMPT,
    user: `
      ## 原始事件
      ${JSON.stringify(event)}
      
      ## 所有調查發現
      ${JSON.stringify(findings)}
      
      ## 環境基線
      ${JSON.stringify(context.baseline.summary)}
      
      ## 指令
      綜合所有調查結果，給出最終判決。
      
      回傳 JSON：
      {
        "conclusion": "benign | suspicious | malicious",
        "confidence": 0-100,
        "reasoning": "完整推理過程（技術語言）",
        "humanSummary": "一句話用人話說明（給 Chat Agent 用）",
        "evidence": [{"type": "...", "detail": "..."}],
        "recommendedAction": "block_ip | quarantine_file | kill_process | disable_account | notify_only | log_only",
        "mitreTechnique": "TXXXX.XXX",
        "severity": "info | low | medium | high | critical"
      }
    `,
    maxTokens: 800,
  });

  // 寫入快取（供集體情報共享）
  await threatCloud.cacheAnalysis(generateThreatPatternHash(event), verdict);

  return verdict;
}
```

#### 調查工具集（Investigation Tools）

Analyze Agent 可使用的調查工具：

```typescript
const AVAILABLE_TOOLS: InvestigationTool[] = [
  {
    name: 'checkIPReputation',
    description: '查詢 IP 的信譽評分和歷史攻擊記錄',
    implementation: async (ip: string) => {
      // 查詢 AbuseIPDB API
      // 查詢 ThreatFox IOC
      // 查詢 Panguard Threat Cloud 的集體情報
      return { abuseScore, reportCount, categories, lastSeen, phalanxCloudData };
    },
  },
  {
    name: 'checkProcessTree',
    description: '查詢目標程序的父子程序關係和完整執行鏈',
    implementation: async (pid: number) => {
      // 取得程序樹
      // 檢查父程序是否正常（例：explorer.exe → cmd.exe 正常；svchost.exe → powershell.exe 可疑）
      return { processTree, parentChain, childProcesses, commandLine };
    },
  },
  {
    name: 'checkFileHash',
    description: '計算檔案 hash 並比對已知惡意程式資料庫',
    implementation: async (filePath: string) => {
      // SHA256 hash
      // 比對 YARA 規則
      // 比對 VirusTotal（如有 API key）
      // 比對 Panguard Threat Cloud
      return { sha256, yaraMatches, knownMalware, fileMetadata };
    },
  },
  {
    name: 'checkNetworkConnections',
    description: '查詢特定程序或 IP 的所有網路連線',
    implementation: async (params: { pid?: number; ip?: string }) => {
      return { activeConnections, dnsQueries, bytesTransferred, geoLocation };
    },
  },
  {
    name: 'checkUserActivity',
    description: '查詢特定使用者最近的活動記錄',
    implementation: async (username: string) => {
      return { recentLogins, loginLocations, privilegeChanges, recentFileAccess };
    },
  },
  {
    name: 'checkTimeAnomaly',
    description: '檢查事件時間是否異常（非上班時間、假日等）',
    implementation: async (timestamp: Date) => {
      return { isBusinessHours, isHoliday, isTypicalForThisUser, baselineComparison };
    },
  },
  {
    name: 'checkRelatedEvents',
    description: '查詢與此事件相關的其他安全事件（同 IP、同程序、同時段）',
    implementation: async (event: SecurityEvent, timeWindow: number) => {
      return { relatedEvents, correlationScore, attackChainPossibility };
    },
  },
  {
    name: 'checkBaselineDeviation',
    description: '詳細比對事件與環境基線的偏離程度',
    implementation: async (event: SecurityEvent) => {
      return { deviationDetails, normalPattern, currentPattern, deviationScore };
    },
  },
  {
    name: 'queryThreatCloud',
    description: '查詢 Phalanx 集體情報，看其他客戶是否遇過類似威脅',
    implementation: async (threatPattern: string) => {
      return { seenByOtherCustomers, frequency, firstSeen, lastSeen, commonResponse };
    },
  },
];
```

#### Analyze Agent System Prompts

```typescript
const ANALYZE_SYSTEM_PROMPT = `
你是 Panguard AI 的資安分析引擎。你的任務是對安全事件進行深度調查分析。

## 你的能力
- 你可以使用多種調查工具蒐集證據
- 你可以根據中間結果動態調整調查方向
- 你必須給出有信心分數的判決

## 你的原則
1. 寧可漏報也不要誤報。誤報會讓用戶失去信任。
2. 如果不確定，降低信心分數，讓系統通知人類確認。
3. 考慮環境上下文。在開發伺服器上 curl 下載是正常的，在會計電腦上就不正常。
4. 檢查攻擊鏈。單一事件可能無害，但如果跟其他事件組合起來就是攻擊。
5. 你的推理過程要清楚，因為會被用來向用戶解釋發生了什麼。

## 輸出格式
始終回傳有效 JSON。不要包含 markdown 程式碼區塊。
`;

const VERDICT_SYSTEM_PROMPT = `
你是 Panguard AI 的判決引擎。根據所有調查發現，給出最終判決。

## 信心分數指南
- 95-100: 確定是已知攻擊模式，有明確證據
- 85-94: 高度可疑，多個證據指向惡意行為
- 70-84: 可疑但不確定，需要人類確認
- 50-69: 輕微可疑，記錄觀察
- 0-49: 可能是正常行為

## humanSummary 寫法（給非技術用戶看的）
- 不使用任何技術術語
- 說明：發生了什麼、嚴重嗎、我做了什麼、你需要做什麼
- 範例："有人從中國嘗試登入你的伺服器 2847 次，全部被擋下。我已把這個 IP 加入黑名單。"
- 範例："你的電腦上發現一個偽裝成 Excel 的惡意程式。已在它造成損害前隔離。"
`;
```

#### Analyze Agent Checkpoint

- 給一個 SSH 暴力破解事件，能動態規劃 3+ 步調查（查 IP 信譽 → 查相關事件 → 查時間異常）
- 每步調查結果影響下一步（例：IP 信譽差 → 追加查詢該 IP 的其他連線）
- 最終判決包含信心分數和 humanSummary（人話摘要）
- 判決結果成功寫入 Threat Cloud 快取

---

### Agent 3: Respond Agent

**職責：** 根據 Analyze Agent 的判決和 Confidence Score，執行自動化回應或通知用戶。

#### 動作決策邏輯

```typescript
async function executeResponse(
  verdict: ThreatVerdict,
  config: ResponseConfig
): Promise<ResponseResult> {
  const actions: ExecutedAction[] = [];

  // ─── 根據 Confidence Score 決定模式 ───
  if (verdict.confidence >= config.autoRespondThreshold) {
    // 預設 85
    // 自動執行，事後通知
    const result = await autoRespond(verdict);
    actions.push(result);
    await chatAgent.notifyPostAction(verdict, result); // 「我已經幫你處理了」
  } else if (verdict.confidence >= config.notifyThreshold) {
    // 預設 50
    // 通知用戶，等確認
    const userResponse = await chatAgent.askForConfirmation(verdict);
    if (userResponse.confirmed) {
      const result = await autoRespond(verdict);
      actions.push(result);
    } else {
      actions.push({ type: 'user_dismissed', reason: userResponse.reason });
    }
  } else {
    // 信心不足，只記錄
    actions.push({ type: 'log_only' });
  }

  // ─── 無論哪種模式，都回饋給 Report Agent ───
  await reportAgent.recordAction(verdict, actions);

  return { verdict, actions, timestamp: new Date() };
}
```

#### 可執行的回應動作

```typescript
interface ResponseActions {
  // ─── 網路層 ───
  blockIP(ip: string, duration?: number): Promise<void>;
  // Windows: netsh advfirewall / WFP API
  // Linux: iptables -A INPUT -s {ip} -j DROP
  // 記錄到 blocklist，設定自動解除時間（預設 24hr）

  unblockIP(ip: string): Promise<void>;
  // 從 blocklist 移除，解除防火牆規則

  // ─── 程序層 ───
  killProcess(pid: number): Promise<void>;
  // 終止惡意程序
  // 記錄程序快照（名稱、路徑、命令列、父程序、網路連線）

  quarantineFile(filePath: string): Promise<void>;
  // 把檔案移到隔離區（加密 + 改副檔名）
  // 記錄原始路徑和 hash，可還原

  // ─── 帳號層 ───
  disableAccount(username: string): Promise<void>;
  // Windows: net user {username} /active:no
  // Linux: usermod -L {username}
  // 需要管理員權限，可能需要 Chat Agent 確認

  // ─── 系統層 ───
  isolateNetwork(): Promise<void>;
  // 極端情況：切斷所有外部網路（只保留跟 Phalanx Cloud 的連線）
  // 只在 Confidence ≥ 95 且偵測到主動資料外洩時執行
  // 必須有自動解除機制

  // ─── 通知層 ───
  notifyUser(message: HumanReadableMessage): Promise<void>;
  // 透過 Chat Agent 送通知

  requestConfirmation(verdict: ThreatVerdict): Promise<UserConfirmation>;
  // 透過 Chat Agent 要求用戶確認
}
```

#### 動作安全機制

```typescript
// 所有自動回應都有安全防護
const SAFETY_RULES = {
  // 不會自動封鎖的 IP（避免自鎖）
  whitelistedIPs: ['127.0.0.1', 'localhost', userConfiguredIPs],

  // 不會自動終止的程序
  protectedProcesses: ['sshd', 'systemd', 'init', 'explorer.exe', 'svchost.exe', 'phalanx-guard'],

  // 不會自動停用的帳號
  protectedAccounts: ['root', 'Administrator', currentLoggedInUser],

  // 自動封鎖 IP 的最長時間（預設 24 小時，之後自動解除或需要手動續封）
  maxAutoBlockDuration: 24 * 60 * 60 * 1000,

  // 網路隔離需要 Confidence ≥ 95 且必須是 malicious 判決
  networkIsolationMinConfidence: 95,

  // 所有動作都記錄到稽核日誌
  auditLog: true,

  // 所有動作都可還原
  rollbackEnabled: true,
};
```

#### Respond Agent Checkpoint

- 能根據 Confidence Score 正確決定自動處理 / 通知確認 / 僅記錄
- 封鎖 IP 成功（Windows netsh + Linux iptables）
- 隔離檔案成功且可還原
- 不會封鎖白名單 IP，不會終止受保護程序
- 所有動作有稽核日誌

---

### Agent 4: Report Agent

**職責：** 記錄所有事件和動作、更新 Context Memory 基線、回饋學習、產生報告。

#### Context Memory 更新邏輯

```typescript
class ContextMemoryManager {

  // ─── 學習期（前 7 天） ───
  async recordLearningPhase(event: SecurityEvent): Promise<void> {
    // 記錄所有行為模式（不判斷好壞）
    this.baseline.processes.record(event.processInfo);
    this.baseline.connections.record(event.connectionInfo);
    this.baseline.loginPatterns.record(event.loginInfo);
    this.baseline.servicePorts.record(event.portInfo);

    // 學習期採用「靜默模式」
    // AI 照常分析每個事件，但不推送即時告警
    // 只在每日摘要中彙報發現（降低 alert fatigue 風險）
    // 唯一例外：Layer 1 規則引擎 100% 匹配的已知攻擊仍即時告警
    //
    // 為什麼？
    // 學習期 baseline 還不完整，anomaly score 會有大量誤判
    // 如果一開始就狂推通知，用戶第二天就會把 Phalanx 移除

    // 每天更新一次學習進度
    this.learningProgress = this.calculateLearningProgress();
    // 學習進度透過 Chat Agent 通知用戶：
    // 「Phalanx 正在學習你的環境（第 3/7 天）。目前已記錄 1,247 個正常行為模式。」
    // 「今天分析了 312 個事件，其中 3 個需要注意（詳情見下方）。」
  }

  // ─── 防護期：基線動態更新 ───
  async updateBaseline(event: SecurityEvent, verdict: ThreatVerdict): Promise<void> {
    if (verdict.conclusion === 'benign' && verdict.confidence >= 90) {
      // 被高信心判定為安全的行為 → 更新基線（這是新的「正常」）
      this.baseline.addNormalPattern(event);
    }

    if (verdict.conclusion === 'malicious') {
      // 確認的惡意行為 → 加入異常模式庫（未來遇到直接高分）
      this.baseline.addMaliciousPattern(event);
    }

    // 用戶手動解除封鎖 = 用戶告訴我們這是誤報
    // → 降低這類事件的異常分數
    if (verdict.userOverride === 'false_positive') {
      this.baseline.recordFalsePositive(event);
    }
  }

  // ─── 基線資料結構 ───
  interface EnvironmentBaseline {
    // 正常程序模式
    processes: {
      knownGood: Map<string, ProcessPattern>;  // 程序名 → 正常執行模式
      // 例：{ "nginx": { typicalPorts: [80, 443], typicalParent: "systemd", ... } }
      knownBad: Set<string>;                   // 已確認的惡意程序 hash
      frequency: Map<string, number>;          // 程序啟動頻率
    };

    // 正常網路連線模式
    connections: {
      typicalDestinations: Map<string, ConnectionPattern>;  // 目標 IP/域名 → 正常模式
      typicalPorts: Set<number>;               // 正常外連 Port
      dailyTrafficProfile: TrafficProfile;     // 每日流量曲線
    };

    // 正常登入模式
    loginPatterns: {
      typicalHours: TimeRange[];               // 正常登入時段
      typicalSources: Set<string>;             // 正常登入來源 IP
      typicalUsers: Map<string, LoginPattern>; // 每個使用者的正常模式
    };

    // 正常服務 Port
    servicePorts: {
      expectedOpenPorts: Set<number>;          // 預期開放的 Port
      expectedServices: Map<number, string>;   // Port → 對應服務
    };

    // 元資料
    learningStartDate: Date;
    learningCompleteDate: Date | null;
    confidenceLevel: number;  // 0-1，隨時間增長
    totalEventsRecorded: number;
    lastUpdated: Date;
  }
}
```

#### 報告產生

```typescript
// Report Agent 產生的報告類型
interface ReportTypes {
  // 即時事件報告（每個威脅事件一份）
  incidentReport: {
    event: SecurityEvent;
    verdict: ThreatVerdict;
    investigation: InvestigationFinding[];
    actionsTaken: ExecutedAction[];
    timeline: TimelineEntry[];
    recommendations: string[]; // 用人話寫
  };

  // 日報摘要（每天一份，透過 Chat 推送）
  dailySummary: {
    totalEvents: number;
    threatsBlocked: number;
    suspiciousEvents: number;
    topAttackSources: { ip: string; count: number; country: string }[];
    actionsTaken: ExecutedAction[];
    estimatedDamageAvoided: number; // 估算避免的損失金額
  };

  // 週報摘要（每週一份）
  weeklySummary: dailySummary & {
    trendComparison: { thisWeek: number; lastWeek: number; change: number };
    newThreatsDiscovered: string[];
    baselineUpdates: string[];
    recommendations: string[];
  };

  // 合規報告（Business 方案，月報）
  complianceReport: {
    framework: 'tw_cyber_security_act' | 'iso27001' | 'soc2';
    period: { start: Date; end: Date };
    controlStatus: Map<string, 'pass' | 'fail' | 'partial'>;
    evidenceLog: AuditEntry[];
    recommendations: string[];
  };
}
```

#### Report Agent Checkpoint

- Context Memory 學習期 7 天後能產出完整基線
- 基線包含程序/網路/登入/Port 四類模式
- 高信心 benign 事件正確更新基線
- 用戶標記誤報後，同類事件異常分數正確下降
- 日報/週報能正確透過 Chat Agent 推送

---

### Agent 5: Chat Agent

**職責：** 用戶的唯一互動界面。把技術語言翻譯成人話，處理追問，推送通知。

#### 語氣適配系統

```typescript
interface UserProfile {
  type: 'developer' | 'boss' | 'it_admin';
  language: 'zh-TW' | 'en' | 'ja' | ...;
  notificationChannel: 'line' | 'telegram' | 'slack' | 'email';
  notificationPreferences: {
    criticalAlerts: boolean;   // 即時推送高危告警（預設 true）
    dailySummary: boolean;     // 每日摘要（預設 true）
    weeklySummary: boolean;    // 每週摘要（預設 true）
    peacefulReport: boolean;   // 無事報平安（預設 true）
  };
}

function adaptMessage(verdict: ThreatVerdict, userProfile: UserProfile): string {
  switch (userProfile.type) {
    case 'developer':
      // 講技術細節、給 CLI 指令、提供 CVE 編號
      // 「偵測到 SSH brute force（T1110），來源 103.xx.xx.xx，
      //  已加入 iptables 黑名單。建議 fail2ban 設 maxretry=3。」
      return formatForDeveloper(verdict);

    case 'boss':
      // 只講結果和影響、建議下一步、估算金額
      // 「有人嘗試入侵你的系統，已被擋下。
      //  建議：提醒員工不要用簡單密碼。」
      return formatForBoss(verdict);

    case 'it_admin':
      // 技術細節 + 管理建議 + 合規對照
      // 「SSH brute force 來自 103.xx.xx.xx，已封鎖。
      //  MITRE T1110。建議檢查所有帳號密碼強度並啟用 2FA。
      //  此事件需記錄於資通安全事件通報。」
      return formatForITAdmin(verdict);
  }
}
```

#### Chat Agent System Prompt

```typescript
const CHAT_SYSTEM_PROMPT = `
你是 Panguard AI 的資安副駕駛。你透過通訊軟體（LINE/Telegram/Slack）跟用戶溝通。

## 你的身份
- 你是用戶的「AI 保鑣」
- 你主動保護用戶，有事會告訴他，沒事不打擾
- 你用友善但專業的語氣說話

## 語言規則（最重要）
- 絕對不使用以下術語：Sigma Rule、YARA、IOC、MITRE ATT&CK、CVE（除非用戶是 developer 類型）
- 用日常語言描述威脅：「有人試圖入侵」而不是「偵測到 T1110 攻擊向量」
- 用類比幫助理解：「就像有人在嘗試所有鑰匙組合來開你家的門」
- 始終包含：發生了什麼 → 嚴重嗎 → 我做了什麼 → 你需要做什麼

## 通知格式
威脅告警：
🚨 [嚴重] / ⚠️ [注意] / 🛡️ [資訊]
一句話說明發生什麼
已執行的動作
需要用戶做的事（如果有的話）

摘要報告：
📊 [時段] 安全摘要
✅ 阻擋了多少攻擊
⚠️ 需要注意的事項
💰 估計避免的損失

## 追問處理
用戶追問時，在已有的事件分析 context 上回答。
不需要重新推理。token 成本要低（<2000 tokens）。
如果用戶問的超出已有 context，可以觸發新的調查（送回 Analyze Agent）。

## 根據 userType 調整
${USER_TYPE_INSTRUCTIONS}
`;
```

#### 通訊管道實作

```typescript
// 通知管道根據方案分層（合規考量）
//
// Starter（個人開發者）：LINE / Telegram / Slack / Email — 方便為主
// Pro（小型企業）：Slack / Email / Webhook — 企業標準
// Business（中型企業 + 合規）：Slack Enterprise / Email(TLS) / Webhook(mTLS) / SIEM 整合
//   ⚠️ Business 方案不推薦 Telegram 作為告警管道
//   因為 Telegram 預設不加密、伺服器端持有金鑰
//   不符合 ISO 27001 / 資通安全管理法的資料傳輸要求
//
// 所有方案都支援所有管道，但 Business 方案的預設設定和文件
// 會引導客戶使用企業級加密管道

// LINE
import { Client as LineClient, MessageEvent } from '@line/bot-sdk';

// Telegram
import { Telegraf } from 'telegraf';

// Slack
import { App as SlackApp } from '@slack/bolt';

// 統一通訊介面
interface MessagingChannel {
  sendMessage(userId: string, message: FormattedMessage): Promise<void>;
  sendAlert(userId: string, alert: ThreatAlert): Promise<void>;
  listenForReplies(handler: (userId: string, text: string) => Promise<string>): void;
  sendFile(userId: string, file: Buffer, filename: string): Promise<void>; // PDF 報告
}

// Webhook 管道（企業級，支援 mTLS）
interface WebhookChannel extends MessagingChannel {
  endpoint: string;
  authMethod: 'bearer_token' | 'mtls' | 'hmac_signature';
  // 企業可以將告警直接打到自己的 SIEM / ticketing system
}

// 訊息格式
interface FormattedMessage {
  text: string;
  // LINE 和 Telegram 支援 rich message
  quickReplies?: string[]; // 快速回覆按鈕：「查看詳情」「忽略」「封鎖來源」
  attachments?: { type: 'pdf' | 'image'; data: Buffer }[];
}
```

#### Chat Agent Checkpoint

- 能透過 LINE/Telegram 發送威脅告警（用人話）
- 開發者收到的通知包含技術細節；老闆收到的只有結果和建議
- 用戶追問「這是什麼？」能在 <2000 tokens 內回答
- 週報能正確產出並推送
- 用戶可以透過聊天介面確認或駁回 Respond Agent 的建議

---

## 集體威脅智慧（Threat Cloud）詳細架構

### 資料收集流程

```
每個 Panguard Guard 實例
        │
        ▼
┌─────────────────────────────┐
│ Step 1: 事件觸發收集         │
│                              │
│ 只在以下情況收集：            │
│ - Layer 3 AI 分析完成後      │
│ - 規則引擎匹配新的攻擊模式   │
│ - 用戶確認的真正威脅          │
│                              │
│ 不收集：                     │
│ - Layer 1 直接判定安全的事件  │
│ - 基線內的正常行為            │
│ - 任何包含用戶業務資料的內容  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Step 2: 匿名化處理           │
│                              │
│ 保留的（有分析價值）：         │
│ ✓ 攻擊來源 IP（公網）         │
│ ✓ 攻擊類型                   │
│ ✓ MITRE ATT&CK 技術編號     │
│ ✓ 匹配的 Sigma/YARA 規則 ID │
│ ✓ 攻擊時間戳                 │
│ ✓ 目標作業系統類型            │
│ ✓ AI 分析結果 hash           │
│ ✓ 信心分數                   │
│ ✓ 產業分類（可選提供）        │
│ ✓ 地區（國家級，非精確位置）  │
│                              │
│ 移除的（保護隱私）：           │
│ ✗ 客戶名稱/公司名            │
│ ✗ 內網 IP                    │
│ ✗ 使用者帳號名稱             │
│ ✗ 檔案內容                   │
│ ✗ 業務資料                   │
│ ✗ 精確地理位置               │
│ ✗ 主機名稱                   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Step 3: 上傳到 Threat Cloud  │
│                              │
│ HTTPS POST 到 Phalanx API    │
│ 加密傳輸 (TLS 1.3)           │
│ 用戶可一鍵關閉上傳            │
│ （config: threatCloud.enabled │
│   = true/false）              │
│                              │
│ 上傳頻率：                    │
│ - 即時上傳 critical 事件      │
│ - 每 5 分鐘批次上傳其他事件   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Panguard Threat Cloud（雲端）                          │
│                                                       │
│ ┌─ 威脅彙整引擎 ──────────────────────────────────┐  │
│ │ 1. 攻擊 IP 熱度排名（哪些 IP 在大量攻擊）        │  │
│ │ 2. 攻擊類型分布（最近流行什麼攻擊手法）           │  │
│ │ 3. 產業針對性分析（製造業被打的跟電商不同）       │  │
│ │ 4. 地區威脅趨勢（亞太 vs 歐洲 vs 北美）          │  │
│ │ 5. 新興威脅偵測（從未見過的攻擊模式）             │  │
│ └────────────────────────────────────────────────┘   │
│                                                       │
│ ┌─ AI 分析快取 ───────────────────────────────────┐  │
│ │ key: threatPatternHash（事件特徵 hash）           │  │
│ │ value: AI 分析結果（判決 + 信心 + 推理 + 建議）   │  │
│ │                                                   │  │
│ │ A 客戶的 Guard 分析了一個新威脅模式               │  │
│ │ → 分析結果存入快取                                │  │
│ │ → B 客戶的 Guard 遇到相同模式                     │  │
│ │ → 直接從快取取得結果（零 token 成本）              │  │
│ │                                                   │  │
│ │ 快取 TTL: 7 天（威脅情報時效性）                   │  │
│ │ 快取命中率追蹤（關鍵商業指標）                     │  │
│ └────────────────────────────────────────────────┘   │
│                                                       │
│ ┌─ 規則更新推送 ──────────────────────────────────┐  │
│ │ 基於彙整結果自動生成新規則：                       │  │
│ │ - 新惡意 IP → 加入 IP 黑名單                      │  │
│ │ - 新攻擊模式 → 生成 Sigma 規則                    │  │
│ │ - 新惡意程式 hash → 加入 YARA 規則                │  │
│ │                                                   │  │
│ │ 推送方式：                                         │  │
│ │ Guard 每 30 分鐘 poll 一次更新                     │  │
│ │ critical 規則透過 WebSocket 即時推送               │  │
│ └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### threatPatternHash 生成邏輯

```typescript
function generateThreatPatternHash(event: SecurityEvent): string {
  // 取事件的「特徵」而非「實例」
  // 同一類攻擊不管來自哪個 IP，hash 都一樣
  const pattern = {
    eventType: event.type, // 例：'ssh_brute_force'
    attackMethod: event.attackMethod, // 例：'password_spray'
    targetService: event.targetService, // 例：'sshd'
    targetOS: event.targetOS, // 例：'ubuntu_22'
    sigmaRulesMatched: event.sigmaRuleIds, // 匹配的規則集合
    yaraRulesMatched: event.yaraRuleIds,
    processChainPattern: event.processChain, // 程序執行鏈模式
    // 不包含：來源 IP、時間、主機名（這些每次都不同）
  };

  return sha256(JSON.stringify(sortKeys(pattern)));
}
```

### Threat Cloud Checkpoint

- 匿名化處理正確：去除內網 IP、用戶名、主機名，保留攻擊類型和來源 IP
- 上傳 API 正常運作（HTTPS + 加密）
- 快取寫入/讀取正常
- 同一威脅模式的不同客戶能共享快取
- 用戶可一鍵關閉上傳
- 快取命中率有追蹤指標

---

## 場景化安裝引導（Onboarding）

### 安裝方式

#### 快速安裝（適合個人開發者快速試用）

```bash
# 方式 1: 一行安裝（自動驗證 GPG 簽章）
curl -fsSL https://get.panguard.ai | bash

# 安裝腳本會自動：
# 1. 下載二進位檔 + GPG 簽章檔
# 2. 驗證 GPG 簽章（失敗則中止安裝）
# 3. 檢查 SHA256 checksum
# 4. 才執行安裝
```

#### 標準安裝（適合企業 / 安全意識高的用戶）

```bash
# 方式 2: 套件管理器（推薦企業使用）
# Debian/Ubuntu
curl -fsSL https://repo.panguard.ai/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/phalanx.gpg
echo "deb [signed-by=/usr/share/keyrings/phalanx.gpg] https://repo.panguard.ai/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/phalanx.list
sudo apt update && sudo apt install phalanx-guard

# RHEL/CentOS
sudo yum-config-manager --add-repo https://repo.panguard.ai/yum/phalanx.repo
sudo yum install phalanx-guard

# macOS
brew tap phalanx-ai/tap
brew install phalanx-guard

# Windows
winget install PhalanxAI.Guard
# 或 PowerShell
irm https://get.panguard.ai/win | iex
```

#### 為什麼保留 `curl | sh`

- Homebrew、Rust (rustup)、Node.js (nvm) 全都用這個方式
- 我們的腳本自帶 GPG 簽章驗證，不是盲目執行
- 但同時提供 apt/yum/brew/winget 作為標準替代方案
- 企業客戶的部署文件會推薦套件管理器方式

### 安裝腳本邏輯

```bash
#!/bin/bash
# curl -fsSL https://get.panguard.ai | bash

set -e

# 1. 偵測環境
OS=$(uname -s)
ARCH=$(uname -m)

# 2. 下載二進位 + GPG 簽章
download_binary $OS $ARCH
download_signature $OS $ARCH

# 3. 驗證 GPG 簽章（失敗則中止）
verify_gpg_signature || { echo "❌ 簽章驗證失敗，中止安裝"; exit 1; }

# 4. 驗證 SHA256 checksum
verify_checksum || { echo "❌ 校驗碼不符，中止安裝"; exit 1; }

# 5. 安裝為系統服務
if [ "$OS" = "Linux" ]; then
  install_systemd_service
elif [ "$OS" = "Darwin" ]; then
  install_launchd_service
fi

# 6. 啟動環境偵察
phalanx-guard discover

# 7. 根據偵察結果自動配置
phalanx-guard auto-configure

# 8. 開始學習期
phalanx-guard start --learning-mode

echo "✅ Panguard AI 已安裝。學習期 7 天。"
echo "📱 設定通知管道：phalanx-guard setup-notifications"
```

### auto-configure 邏輯

```typescript
async function autoConfigureFromDiscovery(discovery: DiscoveryResult): Promise<Config> {
  const config: Config = {};

  // 根據 OS 選擇監控方式
  if (discovery.os.type === 'windows') {
    config.monitor = { sources: ['etw', 'event_log', 'network', 'file_integrity'] };
  } else if (discovery.os.type === 'linux') {
    config.monitor = { sources: ['auditd', 'syslog', 'network', 'file_integrity'] };
  }

  // 根據開放 Port 選擇規則
  if (discovery.openPorts.includes(22)) {
    config.rules.push('ssh_brute_force', 'ssh_key_auth_bypass');
  }
  if (discovery.openPorts.includes(80) || discovery.openPorts.includes(443)) {
    config.rules.push('web_attack_sqli', 'web_attack_xss', 'web_attack_rfi');
  }
  if (discovery.openPorts.includes(3306)) {
    config.rules.push('mysql_brute_force', 'mysql_udf_injection');
  }

  // 根據已裝軟體調整
  if (discovery.services.includes('nginx')) {
    config.rules.push('nginx_cve_rules');
    config.monitor.sources.push('nginx_access_log');
  }
  if (discovery.services.includes('docker')) {
    config.rules.push('container_escape', 'docker_socket_exposure');
  }

  // 根據現有資安工具調整
  if (discovery.security.existingTools.includes('windows_defender')) {
    config.adapters.push('windows_defender'); // 讀取 Defender 的告警
  }

  // 本地 AI 模型選擇
  // ⚠️ Layer 2 預設只在 Server 環境啟用
  // 桌機/筆電背景跑 LLM 推論會搶 CPU/RAM，導致用戶體驗崩潰
  // 這是經過盡職調查後的設計決策
  const isServerEnvironment =
    !discovery.hardware.hasGUI && discovery.hardware.availableRAM > 16 * 1024; // 無 GUI + 16GB+ RAM

  if (isServerEnvironment && discovery.hardware.availableRAM > 16 * 1024) {
    config.localModel = 'llama3'; // VPS/Server 16GB+ RAM
  } else if (isServerEnvironment && discovery.hardware.availableRAM > 8 * 1024) {
    config.localModel = 'phi3'; // VPS/Server 8GB+ RAM
  } else {
    config.localModel = null; // 桌機/筆電/低 RAM → 跳過 Layer 2
    // Layer 1 直接到 Layer 3（雲端 AI）
    // 這會讓 Layer 3 觸發率從 ~3% 升到 ~5-8%
    // 但避免了資安軟體搞掛用戶電腦的災難
  }

  // 用戶可手動啟用 Layer 2（進階設定）
  // phalanx-guard config set localModel llama3
  // 但預設不開，因為：資安軟體讓用戶電腦變慢 = 立即被移除

  return config;
}
```

---

## 技術架構

```
phalanx-ai/
├── packages/
│   ├── core/
│   │   ├── discovery/           # 環境偵察引擎
│   │   ├── monitor/             # 系統監控引擎
│   │   │   ├── windows/         # ETW + Event Log
│   │   │   ├── linux/           # auditd + syslog
│   │   │   ├── network/         # 網路連線監控
│   │   │   ├── fim/             # 檔案完整性監控
│   │   │   └── normalizer.ts    # 事件標準化
│   │   ├── ai/
│   │   │   ├── providers/       # LLM Provider（Ollama/Claude/OpenAI）
│   │   │   ├── agents/
│   │   │   │   ├── detect/      # Detect Agent（含三層漏斗）
│   │   │   │   ├── analyze/     # Analyze Agent（Dynamic Reasoning）
│   │   │   │   ├── respond/     # Respond Agent（自動回應）
│   │   │   │   ├── report/      # Report Agent（基線更新 + 報告）
│   │   │   │   └── chat/        # Chat Agent（人話翻譯 + 互動）
│   │   │   ├── funnel/          # 三層處理漏斗
│   │   │   ├── cache/           # AI 分析結果快取
│   │   │   ├── prompts/         # 所有 Agent 的 System Prompt
│   │   │   ├── tools/           # 調查工具集（9 個工具）
│   │   │   └── memory/          # Context Memory
│   │   ├── rules/               # Sigma + YARA 規則引擎
│   │   ├── threat-cloud/        # 集體威脅智慧
│   │   │   ├── anonymizer.ts    # 匿名化處理
│   │   │   ├── uploader.ts      # 加密上傳
│   │   │   ├── cache-store.ts   # 快取存儲
│   │   │   ├── rule-pusher.ts   # 規則推送
│   │   │   └── aggregator.ts    # 威脅彙整引擎
│   │   └── i18n/
│   │
│   ├── phalanx-scan/            # P0: 免費掃描
│   ├── phalanx-guard/           # P0: AI 監控
│   ├── phalanx-chat/            # P0: AI 副駕駛
│   │   ├── channels/            # LINE / Telegram / Slack / Email
│   │   ├── onboarding/          # 場景化引導
│   │   └── templates/           # 訊息模板
│   ├── phalanx-trap/            # P1: 蜜罐
│   ├── phalanx-report/          # P1: 合規報告
│   └── panguard-web/             # 官網 + Dashboard
│
├── config/
├── tests/
├── scripts/
│   ├── install.sh               # Linux/Mac 一行安裝
│   └── install.ps1              # Windows 安裝
└── docs/
```

---

## 技術選型

> 完整清單見 [DEPENDENCIES.md](./DEPENDENCIES.md)

| 元件         | 技術                                   |
| ------------ | -------------------------------------- |
| 主語言       | TypeScript + Node.js 20+               |
| 套件管理     | pnpm monorepo                          |
| Sigma 引擎   | Tigma (npm)                            |
| 規則庫       | SigmaHQ + YARA-Forge                   |
| 本地 LLM     | ollama-js                              |
| 雲端 LLM     | @anthropic-ai/sdk + openai             |
| 通訊         | @line/bot-sdk + telegraf + @slack/bolt |
| Windows 監控 | node-ffi-napi + ETW/WFP/AMSI           |
| Linux 監控   | auditd / eBPF                          |
| 威脅情報     | AbuseIPDB + ThreatFox API              |
| 報告         | pdfkit                                 |
| Web          | React + Vite                           |
| 測試         | vitest                                 |
| i18n         | i18next                                |

---

## 開發階段

### Phase 0: 專案初始化

monorepo 骨架 + TypeScript strict + ESLint + vitest + i18n

### Phase 1: 核心引擎

1A 環境偵察 → 1B AI 引擎（三層漏斗 + 5 個 Agent） → 1C 規則引擎 → 1D 系統監控 → 1E 集體情報

### Phase 2: Panguard Scan

CLI + 場景化結果（人話） + PDF 報告

### Phase 3: Panguard Guard + Panguard Chat

Guard（一行安裝 + auto-configure + 7 天學習期）
Chat（LINE/Telegram/Slack + 人話通知 + 追問 + 安裝引導）

### Phase 4: Panguard Trap

假服務 + 攻擊者分析 + 回饋集體情報

### Phase 5: Panguard Report

合規報告（資通安全管理法 + ISO 27001 + SOC 2）

### Phase 6: 官網

場景化文案 + 線上引導

---

## 面向用戶的語言指南

```
❌ "Sigma Rule win_security_4625 matched: 5 failed login attempts from 103.xx.xx.xx"
✅ "有人正在嘗試猜你的密碼登入。來源：中國河北。已嘗試 5 次，全部失敗。我已把這個 IP 加入黑名單。"

❌ "YARA rule APT_Ransomware_Lockbit matched file hash sha256:a1b2c3..."
✅ "在王小姐的電腦上發現一個勒索病毒（LockBit 類型）。已在它加密檔案之前攔截並隔離。"

❌ "Context Memory baseline deviation: 3.7σ on outbound connections to 185.xx.xx.xx:4444"
✅ "你的伺服器正在嘗試連線到一個它從來沒連過的可疑地址。這不正常。我已阻止這個連線並在調查中。"

❌ "Process chain anomaly: explorer.exe → cmd.exe → powershell.exe -enc SQBFAFgA..."
✅ "有個程式試圖在背景執行一段加密的指令。這通常是駭客在做的事。已阻止執行。"
```

---

## 重要提醒

1. **用戶不動腦**：任何需要用戶做技術決策的設計都是錯的
2. **Chat 是 P0**：沒有 Chat，Guard 對 TA 來說就是黑盒子
3. **三層漏斗是命脈**：90% 事件必須在 Layer 1 解決
4. **人話優先**：不准出現 Sigma、YARA、IOC、MITRE 等術語（面向用戶時）
5. **資安不能中斷**：token 不夠 → 降級到本地 → 再不夠 → 降級規則引擎
6. **安全第一**：資安產品不允許安全漏洞
7. **快取命中率**：是證明商業模式的關鍵技術指標
8. **每個 Agent 有獨立 prompt**：見 `packages/core/ai/prompts/` 目錄
9. **所有自動回應有安全防護**：白名單、受保護程序、可還原
10. **匿名化是底線**：Threat Cloud 絕不收集可識別客戶身份的資料
11. **Layer 2 僅限 Server**：桌機/筆電不跑本地 LLM，避免資源搶佔導致用戶移除產品
12. **學習期靜默模式**：前 7 天不推即時告警（已知攻擊除外），只在日報中彙報，避免 alert fatigue
13. **安裝方式多元**：curl|sh 保留但加 GPG 驗證，同時支援 apt/yum/brew/winget
14. **通知管道分層**：個人用 LINE/TG，企業用 Slack/Email，合規場景用加密管道（mTLS/Webhook）
15. **Ollama 安全加固**：綁定 localhost、不對外暴露 port、定期更新版本
