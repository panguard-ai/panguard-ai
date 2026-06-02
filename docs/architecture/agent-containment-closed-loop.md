# PanGuard Agent 防護閉環設計(v2 — 第一性原理改版)

Status: Draft v2 · Author: Adam Lin · Date: 2026-06-03
Scope: PanGuard Guard 的偵測→決策→圍堵→回流閉環,單 agent 與 multi-agent。
Sibling: `rule-production-corroboration-and-tc-hardening.md`
改版註記:v1 把偵測與攔截壓成一條 inline 管線(LLM 在熱路徑、寫檔預設 branch、過度 deception),會傷 UX。v2 改成雙路徑,北極星 = **隱形的安全**。

---

## 0. 執行摘要

- **北極星:隱形的安全。** 合法 agent 完全感覺不到 PanGuard——零延遲、零誤擋、零多餘人審;只有攻擊者撞牆。
- **雙路徑(EDR 範式)**:熱路徑只有一個 **sub-ms 確定性 gate**;貴的東西(語意 judge / taint / 行為)全在**離線大腦**,只算風險、餵迴路、**從不擋 agent**;containment 是**罕見的升級結果**,不是預設。
- **最小權限為底**:最高槓桿的防禦是「設定時就不給那個能力」,不是 runtime 攔每個動作。
- **咽喉點就是架構**:PanGuard 只能在它**控制的咽喉點**攔(MCP gateway / tool proxy / FS shim / egress proxy)。沒有咽喉點的地方,降級成 advisory。
- **護城河是迴路,不是 containment 機器**:contained 事件 → ATR rule → 全 fleet,比任何人快。Containment 是 table-stakes,做到「標準 + 隱形」即可;**工程重心放迴路**。

---

## 1. 第一性原理(先把「真」的列出來)

1. Agent 以機器速度自主動作 → 每動作人審 = 殺自主性 = 殺產品。
2. 危險是「致命三件組」的**組合**(碰私密資料 + 吃不可信內容 + 能外送),不是單一動作。
3. Agent 非確定性、行為列舉不完 → 偵測永遠不完整。
4. 善惡在內容層常同形(會跑 shell 的 skill ≈ command injection)→ 內容偵測有精度天花板。
5. 延遲是致命的 → 50 個 tool call × 每個 +秒級 LLM = 不能用。
6. 採用的最大殺手是假摩擦 → approval fatigue 是 #1 失敗模式。

**推論**:你**測不準**被注入的 agent,但你**管得住**它能做什麼。所以防禦以**能力 + 出口**為主(確定性、零摩擦),偵測為輔(離線、餵迴路、升級風險)。

---

## 2. 咽喉點(這就是架構,先定義)

PanGuard 只能攔流經它控制的咽喉點的動作。每個咽喉點決定能 gate 什麼:

| 咽喉點 | 攔得到 | 落點 |
|--------|--------|------|
| **MCP gateway / proxy** | tool call(名稱 + 參數)、tool 回應 | 主力,MVP 先做 |
| **Tool-call broker**(sealed/固定 schema) | agent 能呼叫哪些工具、參數形狀 | 設定時縮權 |
| **FS shim / COW overlay** | 檔案讀寫 | Layer 3 容器 |
| **Egress proxy** | 網路出口(host / 內容 / 量) | 擋致命三件組的「外送」腳 |
| **Inter-agent bus** | agent↔agent 訊息 | multi-agent |

沒有咽喉點的地方(例如 in-process LangChain 直接呼叫 Python 函式)→ PanGuard **攔不到**,只能靠 SDK 整合 hook 或降級成 **advisory(只觀測不攔)**。誠實寫進文件,不假裝能無所不攔。

---

## 3. 雙路徑架構(核心)

EDR 能在端點跑而不卡死,是因為**三層速度不同**:核心 hook 快又笨、雲端 brain 慢又聰明、處置罕見。照抄這個分層:

```
Layer 0  設定時：最小權限能力縮放
         └ 大多數攻擊在這裡就失敗（agent 根本沒那個能力）。零 runtime 成本。

Layer 1  inline 熱路徑（<1ms，確定性，allow-by-default）
         └ 能力檢查(policy) + 便宜 regex + egress allowlist + 讀 session 風險快取
         └ 決策：ALLOW（預設）/ DENY（明確違規，給乾淨錯誤）/ ESCALATE（風險已高才會）
         └ 無 LLM、無 await I/O、無人審。這是唯一在熱路徑的東西。

Layer 2  async 大腦（離線，從不擋 agent）
         └ #84 語意 judge + taint + 行為異常 + 跨 agent 信任
         └ 算 session risk score、餵偵測迴路、發蒸餾事件
         └ 把「session」（不是單一動作）升級風險等級

Layer 3  containment（罕見，只在 risk 過門檻才出現）
         └ write-branch / quarantine / HITL / deception / kill
         └ 只圈住嫌疑 session，對其他人零摩擦
```

**解耦關鍵原語:gate 讀風險,大腦寫風險。**
- Layer 1 的 `decide()` 只做「policy 查表 + cheap regex + 讀這個 session 目前的 risk level」→ sub-ms。
- Layer 2 非同步算出 risk,寫回 session 狀態;gate 下次讀到。
- 貴的計算**永遠不在熱路徑**。模糊的判斷**不 inline 擋**——丟給大腦,大腦升級 session 風險,而不是卡住這個動作。

這解掉了精度/UX 的矛盾:**inline 只擋鐵證(高信心明確違規);模糊的走離線,絕不卡 agent。**

---

## 4. 回流迴路 = 護城河(主角)

問:這裡哪塊是別人做不到的?Containment 機器 Cisco/微軟/AWS Cedar 都在做 = table-stakes。你獨有的是**迴路**:

```
contained/blocked 事件（蒸餾）→ TC proposal.containment_fired（佐證,調 prior 不繞 gate）
  → check-rules-safety（確定性 FP 閘門）→ 人審 → 推回全 fleet
```

ATR + TC **已經是**這條迴路。工程重心放這裡:讓每個 contained 事件**比任何人更快**變成 fleet-wide rule。Containment 做到標準 + 隱形就好。

---

## 5. 回應集 + Session 風險狀態

回應由 **session 風險等級**驅動,不是每個動作獨立重判:

| Session 風險 | 該 session 的動作預設怎麼處理 |
|------|------|
| `normal`（絕大多數) | Layer 1 gate:ALLOW / 明確違規 DENY(乾淨錯誤)。**零摩擦** |
| `elevated` | 同上 + 寫入轉 `ALLOW_BRANCH`(COW,agent 看得到自己的寫入)、高爆炸半徑動作轉 `CHALLENGE`(HITL) |
| `high` | `QUARANTINE`(隔離執行、egress 收緊、untrusted 走 Q-LLM) |
| `confirmed_malicious` | `DENY`(可選 deception)/ `KILL` + 撤銷能力 |

修正 v1 的錯:
- `ALLOW_BRANCH` **不是寫檔預設**——只在 `elevated`+ 才開,否則合法 agent 每次寫入都卡人 merge。
- `DENY` **預設給乾淨誠實的錯誤**(讓合法 agent 自我修正);**deception 只在 `confirmed_malicious`**,罕見。
- HITL **只在「不可逆 + 高爆炸半徑」**,不是每個動作。

---

## 6. 容器原語(只在 Layer 3 升級時出現)

- **Write-branch isolation**:COW overlay——agent 讀「branch 疊在 base 上」的視圖(**看得到自己的寫入**,不破壞迭代),寫入進可丟棄分支,人審後 drop/merge,branch diff = 鑑識。userspace 不需 root。**只在 elevated+ session**,不是全域。誠實限制:只抓檔案副作用,不抓網路/spawn;sophisticated agent 偵測得到。
- **Quarantine**:網路隔離 / microVM;untrusted 資料只進無工具 Q-LLM,結果以 `var_<id>` 引用。
- **Kill + 能力撤銷**:multi-agent 時只隔離單一 + 通知 peers,不殺全系統。

---

## 7. Multi-agent 層

| 威脅(OWASP Agentic) | 對策 | 在哪層 |
|------|------|------|
| T13 Rogue Agent | 每 agent 一個風險 session + 隔離;KILL 單一不殺全系統 | L1 + L3 |
| T12 跨 agent 訊息投毒 | inter-agent 訊息:**便宜的身分/能力檢查 inline**(L1);**深度 intent/授權分析 async**(L2) | L1 + L2 |
| T1 記憶投毒 | 記憶會過期、分層(session→validated→historical) | L0 + L2 |
| agent↔agent 認證 | A2A over mTLS/OAuth2 + Agent Card | L0 |
| T8 不可否認 | hash-chain chain-of-custody | L2 record |

威脅建模 scaffold:MAESTRO(7 層,multi-agent)枚舉面;映射 OWASP T1–T15 / MITRE ATLAS / NIST COSAiS overlay。

**兩個關不掉的 gap → 升級人審,不宣稱自動**:
1. 跨 agent 信任委派(業界無標準)。
2. 語意 taint / 隱性控制影響(byte-level 追不到)。

---

## 8. UX 不變式(明確承諾,可拿來驗收)

合法 agent(`normal` session,絕大多數)必須:
- **熱路徑零顯著延遲**:Layer 1 gate sub-ms(policy 查表 + regex + 讀風險快取)。
- **零誤擋**:allow-by-default;只擋高信心明確違規;模糊的走離線不卡。
- **零多餘人審**:HITL 只在不可逆 + 高爆炸半徑。
- **錯誤可行動**:DENY 給乾淨誠實訊息,不給 deception。

驗收:對一個跑 N 個動作的合法 agent,PanGuard 加的 p95 延遲 < X ms、誤擋率 = 0、人審次數 = 0。

---

## 9. 落地切分(MVP)

**先做(雙路徑最小可用)**
1. **咽喉點**:MCP gateway proxy(攔 tool call)。
2. **Layer 0**:tool allowlist + 能力 scope(設定時縮權)。
3. **Layer 1 gate**:能力檢查(deny-by-default 的 policy)+ 便宜 regex(ATR Tier A 子集)+ egress allowlist + 讀 session 風險。sub-ms。
4. **Layer 2 大腦(async)**:ATR 完整 + #84 語意 judge 跑離線 → 算 session risk + 發蒸餾事件 → 接現有 TC 迴路。
5. **Layer 3 最小**:DENY(乾淨錯誤)+ KILL。

**之後**:write-branch、quarantine、完整 FIDES taint、A2A 信任 fabric、deception。

**落點**:`packages/panguard-guard/src/containment/`(gate / analyzer / controller);TC + ATR = 迴路(已有)。

---

## 10. 介面草案(雙路徑,TypeScript)

```typescript
interface ActionContext {
  readonly agentId: string;
  readonly sessionId: string;
  readonly kind: 'tool_call' | 'command' | 'file_write' | 'network_egress' | 'agent_message';
  readonly target: string;
  readonly payload: string;
  readonly capabilities: ReadonlySet<string>;
  readonly identity: AgentIdentity;
}

interface SessionRisk {
  readonly level: 'normal' | 'elevated' | 'high' | 'confirmed_malicious';
  readonly reasons: readonly string[];
}

// === Layer 1：inline 熱路徑。必須同步且快：查表 + cheap regex + 讀 risk。 ===
// 不可 await I/O、不可呼叫 LLM、不可碰網路。
type GateDecision = 'ALLOW' | 'DENY' | 'ESCALATE';

interface InlineGate {
  decide(ctx: ActionContext, risk: SessionRisk): GateDecision;     // sync, sub-ms
  denyMessage(ctx: ActionContext): string;                          // 乾淨、可行動的錯誤
}

// === Layer 2：async 大腦。從不擋 agent，只算風險 + 餵迴路。 ===
interface RiskAnalyzer {
  analyze(session: SessionContext): Promise<SessionRisk>;           // 跑 #84 語意 + taint + 行為
}

interface ContainmentEvent {                                        // 蒸餾,進 TC 佐證
  readonly response: GateDecision | ContainmentMode;
  readonly actionClass: string;                                     // 不含原始內容
}

// === Layer 3：containment，只在 risk 過門檻才呼叫（罕見）。 ===
type ContainmentMode = 'branch' | 'quarantine' | 'hitl' | 'deceive' | 'kill';

interface ContainmentController {
  escalate(sessionId: string, mode: ContainmentMode): Promise<void>;
}

// 編排：熱路徑只碰 gate；大腦與 containment 都在旁路。
class Guard {
  constructor(
    private readonly gate: InlineGate,
    private readonly analyzer: RiskAnalyzer,
    private readonly containment: ContainmentController,
    private readonly riskStore: { get(sessionId: string): SessionRisk; set(sessionId: string, r: SessionRisk): void },
  ) {}

  // 熱路徑：同步、快。決定放行 / 擋 / 升級。
  onAction(ctx: ActionContext): GateDecision {
    const risk = this.riskStore.get(ctx.sessionId);
    const decision = this.gate.decide(ctx, risk);
    // 不在這裡跑大腦：onAction 必須維持 sub-ms。
    return decision;
  }

  // 旁路：由 session 活動非同步觸發，更新風險、餵迴路、必要時升級。
  async onSessionActivity(session: SessionContext): Promise<void> {
    const risk = await this.analyzer.analyze(session);
    this.riskStore.set(session.sessionId, risk);
    if (risk.level === 'high') await this.containment.escalate(session.sessionId, 'quarantine');
    if (risk.level === 'confirmed_malicious') await this.containment.escalate(session.sessionId, 'kill');
  }
}
```

`onAction` 是純查表 + cheap 判斷,維持 sub-ms;`onSessionActivity` 在旁路跑貴的東西。兩者透過 `riskStore` 解耦。

---

## 11. 對外論述紀律

- 講 `assume-breach + 縮小爆炸半徑 + 隱形`,不講「完整圍堵保證 / provably complete」。
- 語意層 opt-in、未經規模驗證前不當 production 數字。
- SASS 概念寫「回應狀態機/分級回應,概念啟發自一份 SASS 草稿」,不掛 IETF / multi-agent / Saki 合作。

---

## 附錄:概念來源對照

| 元件 | 來源 |
|------|------|
| 雙路徑(快 gate / 慢 brain / 罕見處置) | EDR/XDR 範式 |
| 分級回應 / Total Response Mapping(改成 session 風險驅動) | SASS 草稿(概念) |
| Write-branch isolation(改成升級才開) | SASS 草稿(概念) |
| Layer 0 最小權限 / Layer 1 能力 PDP | AWS Cedar / Bedrock AgentCore;OPA/Rego |
| Layer 2 taint / 能力 dataflow | FIDES(MS Research, arXiv 2505.23643);CaMeL(Google DeepMind, arXiv 2503.18813) |
| Q-LLM | dual-LLM(Willison);CaMeL |
| 風險升級 / circuit breaker / cost-velocity | EDR kill-switch 模式 |
| HITL durable interrupt(只在不可逆) | LangGraph `interrupt()` |
| 每 agent 隔離 / blast radius | Firecracker / Kata microVM |
| multi-agent 威脅枚舉 | MAESTRO;OWASP Agentic T1–T15;MITRE ATLAS;NIST COSAiS |
| agent↔agent | Google A2A(Linux Foundation) |
| L1/L2 內容偵測 | ATR regex + #84 語意 judge(自有) |
| 迴路 / FP gate(護城河) | TC + check-rules-safety(自有) |
