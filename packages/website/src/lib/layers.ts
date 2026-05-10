/**
 * 7-layer Agent Security Platform data — shared across the homepage
 * SecurityLayers section and the /layers/[slug] detail pages.
 *
 * Single source of truth for:
 *   - layer name, tagline, why, proof, status
 *   - extended detail copy (what, how, try-it, attack examples)
 *   - ecosystem upstream links
 *
 * Status values must stay in sync with STATS.platform.layersShipped /
 * layersComingSoon in stats.ts. If a layer promotes from partial/gap to
 * shipped, update both files together and rewrite the relevant copy.
 */

export type LayerStatus = 'shipped' | 'partial' | 'gap';

export interface Bilingual {
  en: string;
  zh: string;
}

export interface LayerAttack {
  name: Bilingual;
  severity: 'critical' | 'high' | 'medium';
  description: Bilingual;
}

export interface LayerEcosystemLink {
  label: string;
  href: string;
  context: Bilingual;
}

export interface Layer {
  id: number;
  slug: string;
  name: Bilingual;
  tagline: Bilingual;
  status: LayerStatus;
  /** Expansion of tagline — 2-4 sentences. */
  what: Bilingual;
  /** CISO-level pain this layer solves. */
  why: Bilingual;
  /** Technical approach. Include one-line architecture cues. */
  how: Bilingual;
  /** Concrete numbers only — benchmarks, latencies, merge counts. */
  proof: Bilingual;
  /** Command or link a dev can try right now. */
  tryIt: { intro: Bilingual; command?: string; href?: string };
  /** Representative attacks this layer catches (1-3). */
  attacks: LayerAttack[];
  /** Ecosystem integrations / upstream references. */
  ecosystem: LayerEcosystemLink[];
  /** Short proof-line used in compact UIs (homepage). */
  proofShort: Bilingual;
}

export const LAYERS: readonly Layer[] = [
  {
    id: 1,
    slug: 'discover',
    name: { en: 'Discover', zh: '探索 Discover' },
    tagline: {
      en: 'Central inventory of every agent, skill, MCP tool',
      zh: '所有 agent、skill、MCP tool 的中央資產清單',
    },
    status: 'gap',
    what: {
      en: "L1 Discover answers the first question any CISO asks: what agents are running in our org, where, and with what tools attached? It aggregates inventory from every endpoint running pga up, surfaces each agent's platform, installed skills, MCP tool descriptions, and recent activity in a single searchable dashboard.",
      zh: 'L1 探索回答任何 CISO 的第一個問題:我們組織內跑著哪些 agent、在哪、帶哪些工具?它彙整每台跑 pga up 的端點 inventory,在一個可搜尋的儀表板呈現每個 agent 的平台、已裝 skill、MCP tool 描述與最近活動。',
    },
    why: {
      en: 'You cannot protect what you cannot count. F500 CISOs are being asked this week by their boards: "how many AI agents are running in our environment?" Most cannot answer. Shadow agents — agents spun up by individual engineers outside IT procurement — are already the majority by install count.',
      zh: '你沒辦法保護你數不到的東西。F500 CISO 這週被董事會問:「我們環境內跑多少 AI agent?」多數答不出來。影子 agent(工程師繞過 IT 採購自己拉起的)按安裝數算已是多數。',
    },
    how: {
      en: 'Planned architecture: Guard daemon registers with Threat Cloud on startup; TC aggregates per-tenant inventory with device_id + platform + skill hashes. CLI: `pga inventory`. Web dashboard at /admin/inventory. Q2 2026.',
      zh: '規劃架構:Guard daemon 啟動時向 Threat Cloud 註冊;TC 依租戶彙整 inventory,含 device_id + 平台 + skill hashes。CLI:`pga inventory`。Web 儀表板在 /admin/inventory。2026 Q2。',
    },
    proof: {
      en: 'Coming Q2 2026. TC already aggregates 96,233 skills scanned and 397 rules tracked across all Community sensors — the inventory dashboard builds on this existing telemetry backbone.',
      zh: '2026 Q2 上線。TC 已在所有 Community 感測器間彙整 96,233 個已掃技能與 397 條規則 — inventory 儀表板建立在這既有遙測骨幹上。',
    },
    proofShort: { en: 'Q2 2026', zh: '2026 Q2 上線' },
    tryIt: {
      intro: {
        en: 'Not live yet. Join the Team waitlist to be first when /admin/inventory ships.',
        zh: '尚未上線。加入 Team 版 waitlist,第一時間使用 /admin/inventory。',
      },
      href: '/early-access',
    },
    attacks: [
      {
        name: { en: 'Shadow agent deployment', zh: '影子 agent 部署' },
        severity: 'high',
        description: {
          en: 'Engineers install MCP skills or agent CLIs outside procurement, bypassing security review. Inventory makes this visible.',
          zh: '工程師在採購外安裝 MCP skill 或 agent CLI,繞過安全審查。Inventory 使這可見。',
        },
      },
      {
        name: {
          en: 'Unknown skill provenance',
          zh: '未知 skill 來源',
        },
        severity: 'medium',
        description: {
          en: 'Agents load skills from npm / GitHub / local paths. Without inventory the org cannot audit which skills are approved.',
          zh: 'Agent 從 npm / GitHub / local path 載入 skill。沒 inventory 組織無法稽核哪些 skill 已核可。',
        },
      },
    ],
    ecosystem: [],
  },

  {
    id: 2,
    slug: 'audit',
    name: { en: 'Audit', zh: '稽核 Audit' },
    tagline: {
      en: 'Pre-deploy scanning of skills, MCP configs, npm packages',
      zh: '部署前掃描 skill、MCP config、npm 套件',
    },
    status: 'shipped',
    what: {
      en: 'L2 Audit inspects the code and configs an agent is about to trust, before it runs. Two scan paths: MCP config JSON (claude_desktop_config.json, .cursor/mcp.json) for runtime protection rules; SKILL.md files for skill-marketplace prompt injection and tool poisoning. Same 330 ATR rules, different regex subsets per scan target.',
      zh: 'L2 稽核在 agent 執行前檢查它即將信任的程式碼與配置。兩條掃描路徑：MCP config JSON（claude_desktop_config.json、.cursor/mcp.json）跑 runtime protection rules；SKILL.md 檔跑 skill 市場的 prompt injection 與 tool poisoning。同一批 330 條 ATR 規則，依不同 scan target 套用不同的 regex 子集。',
    },
    why: {
      en: 'One malicious skill install = agent hijack. The postmark-mcp incident silently forwarded 15,000 emails/day for months before detection. Scan before you trust the code an agent is about to run.',
      zh: '一個惡意 skill 安裝 = agent 被劫持。postmark-mcp 事件安靜轉發 15,000 封 email/天數月才被發現。在 agent 執行那段程式碼前先掃過。',
    },
    how: {
      en: 'Regex-first ATR engine with optional LLM semantic layer. Rules stored as YAML with versioned lifecycle (draft → experimental → stable). Web scanner at panguard.ai/ and CLI `pga scan <url-or-path>`. Microsoft AGT + Cisco AI Defense ship these rules as their reference detection pack.',
      zh: '以 regex 為主的 ATR 引擎,可選 LLM 語意層。規則以 YAML 儲存,有版本生命週期(draft → experimental → stable)。Web scanner 在 panguard.ai/,CLI `pga scan <url-or-path>`。Microsoft AGT + Cisco AI Defense 已把這些規則當作參考偵測包。',
    },
    proof: {
      en: '330 ATR rules (MIT licensed) · 97.1% recall on NVIDIA Garak (666 adversarial prompts) · 96.9% recall / 100% precision / 0% FP on 498 real-world SKILL.md samples · 0.48% FP on 3,115 wild Skills.sh packages · Cisco AI Defense ships full pack via PR #79 + #99; Microsoft AGT ships 287 rules via PR #908 + #1277.',
      zh: '330 條 ATR 規則（MIT 授權）· NVIDIA Garak 97.1% 召回（666 個對抗 prompt）· 498 個真實 SKILL.md 樣本 96.9% 召回 / 100% 精度 / 0% FP · 3,115 個野外 Skills.sh 套件 0.48% FP · Cisco AI Defense 透過 PR #79 + #99 引入完整 330 條規則；Microsoft AGT 透過 PR #908 + #1277 引入 287 條。',
    },
    proofShort: {
      en: '330 rules · 97.1% Garak recall · 0.48% FP',
      zh: '330 條規則 · Garak 97.1% 召回 · 0.48% FP',
    },
    tryIt: {
      intro: {
        en: 'Scan any GitHub-hosted MCP skill in 60 seconds:',
        zh: '60 秒內掃描任何 GitHub 上的 MCP skill:',
      },
      command: 'pga scan github.com/modelcontextprotocol/servers',
    },
    attacks: [
      {
        name: { en: 'Direct prompt injection', zh: '直接 prompt 注入' },
        severity: 'critical',
        description: {
          en: '"Ignore previous instructions" patterns hidden in skill descriptions, tool outputs, or user inputs.',
          zh: '「忽略先前指令」的模式,藏在 skill 描述、工具輸出、或使用者輸入裡。',
        },
      },
      {
        name: { en: 'Tool poisoning via MCP response', zh: 'MCP 回應的工具投毒' },
        severity: 'critical',
        description: {
          en: 'Hidden instructions in MCP tool responses that override system prompts.',
          zh: '藏在 MCP 工具回應裡的隱藏指令,可以覆蓋系統 prompt。',
        },
      },
      {
        name: { en: 'Credential exfiltration', zh: '憑證外洩' },
        severity: 'critical',
        description: {
          en: 'Skills that read ~/.ssh/id_rsa or environment variables and POST them to external endpoints.',
          zh: 'Skill 讀取 ~/.ssh/id_rsa 或環境變數,POST 到外部端點。',
        },
      },
    ],
    ecosystem: [
      {
        label: 'Microsoft Agent Governance Toolkit #908 + #1277',
        href: 'https://github.com/microsoft/agent-governance-toolkit/pull/1277',
        context: {
          en: 'Merged: 287 ATR rules + weekly auto-sync workflow into AGT production',
          zh: '已合併：287 條 ATR 規則 + 每週自動同步 workflow 進入 AGT 生產環境',
        },
      },
      {
        label: 'Cisco AI Defense skill-scanner #79 + #99',
        href: 'https://github.com/cisco-ai-defense/skill-scanner/pull/99',
        context: {
          en: 'Merged: full 330-rule ATR pack in skill-scanner production',
          zh: '已合併：完整 330 條 ATR 規則進入 skill-scanner 生產環境',
        },
      },
      {
        label: 'NVIDIA Garak #1676',
        href: 'https://github.com/NVIDIA/garak/pull/1676',
        context: {
          en: 'PR open: ATR integrated as a first-class detector',
          zh: 'PR 審查中:ATR 成為 first-class detector',
        },
      },
    ],
  },

  {
    id: 3,
    slug: 'protect',
    name: { en: 'Protect', zh: '防護 Protect' },
    tagline: {
      en: 'Runtime prompt / tool / output defense',
      zh: 'Runtime prompt / tool / output 防禦',
    },
    status: 'shipped',
    what: {
      en: 'L3 Protect intercepts every MCP call at runtime. Guard daemon sits between the agent and the MCP server as an inline proxy — prompts, tool arguments, and tool responses all flow through ATR rules before reaching the agent. Policy engine decides allow / deny / notify in <50ms for rule-matched events.',
      zh: 'L3 防護在 runtime 攔截每個 MCP 呼叫。Guard daemon 以 inline proxy 坐在 agent 與 MCP server 之間 — prompt、tool 參數、tool 回應都會先過 ATR 規則再到 agent。Policy engine 對規則命中事件在 50ms 內決定 allow / deny / notify。',
    },
    why: {
      en: 'Even audited skills can be prompt-injected at runtime via external content (web pages, emails, docs). And skills that pass static audit can still be compromised mid-session via tool-response poisoning. Static scan is necessary; runtime enforcement is sufficient.',
      zh: '即便稽核過的 skill,runtime 仍可能透過外部內容(網頁、email、文件)被 prompt 注入。通過靜態稽核的 skill 也可能透過 tool 回應投毒在 session 途中被劫持。靜態掃描是必要;runtime 強制執行才是充分。',
    },
    how: {
      en: "panguard-mcp-proxy intercepts the stdio / SSE / WebSocket transport. ProxyEvaluator runs the same ATR rule engine used by L2 Audit, plus runtime-specific rules (shell metacharacters, credential patterns, command injection). Results stream to Guard which applies the policy engine's action.",
      zh: 'panguard-mcp-proxy 攔截 stdio / SSE / WebSocket 傳輸。ProxyEvaluator 跑 L2 Audit 用的同一 ATR 規則引擎,加上 runtime 特有規則(shell metacharacter、憑證模式、command injection)。結果 stream 到 Guard,套用 policy engine 的動作。',
    },
    proof: {
      en: 'Median 50ms latency per decision · Inline MCP proxy via @panguard-ai/panguard-mcp-proxy · ProxyEvaluator tested against 9 attack classes with confidence ≥0.90 (reverse shell, env exfiltration, privilege escalation, unauthorized tool call, shell metacharacter injection).',
      zh: '每次決策中位 50ms 延遲 · 透過 @panguard-ai/panguard-mcp-proxy inline MCP proxy · ProxyEvaluator 測試 9 種攻擊類別,信心度 ≥0.90(reverse shell、環境變數外洩、權限提升、未授權工具呼叫、shell metacharacter 注入)。',
    },
    proofShort: {
      en: '50ms median · inline MCP proxy',
      zh: '中位 50ms · inline MCP proxy',
    },
    tryIt: {
      intro: {
        en: 'Start Guard with inline protection:',
        zh: '啟動 Guard 搭配 inline 防護:',
      },
      command: 'pga up',
    },
    attacks: [
      {
        name: {
          en: 'Indirect prompt injection via external content',
          zh: '透過外部內容的間接 prompt 注入',
        },
        severity: 'critical',
        description: {
          en: 'Web pages or documents agent loads contain injection payloads (hidden JavaScript URIs, attacker-controlled markdown).',
          zh: 'Agent 載入的網頁或文件含注入 payload(隱藏的 JavaScript URI、攻擊者控制的 markdown)。',
        },
      },
      {
        name: { en: 'Tool argument injection', zh: '工具參數注入' },
        severity: 'high',
        description: {
          en: 'Attacker embeds shell metacharacters in tool arguments to escape the agent sandbox.',
          zh: '攻擊者在工具參數中嵌入 shell metacharacter 來逃脫 agent sandbox。',
        },
      },
    ],
    ecosystem: [],
  },

  {
    id: 4,
    slug: 'detect',
    name: { en: 'Detect', zh: '偵測 Detect' },
    tagline: {
      en: 'Behavioral anomaly detection with a 3-layer AI funnel',
      zh: '3 層 AI 漏斗的行為異常偵測',
    },
    status: 'shipped',
    what: {
      en: 'L4 Detect catches what rules cannot: novel attack patterns, behavioral drift, coordinated multi-step attacks. A 3-layer funnel routes ~90% of traffic to cheap rule matching, ~7% to a local LLM (Ollama / llama.cpp) for semantic analysis, and only ~3% to cloud AI for deep reasoning on ambiguous cases.',
      zh: 'L4 偵測抓規則抓不到的:新型態攻擊模式、行為漂移、多步驟協同攻擊。3 層漏斗把 ~90% 流量路由到便宜的規則比對、~7% 到本地 LLM(Ollama / llama.cpp)做語意分析、只有 ~3% 到雲端 AI 對模糊案例做深度推理。',
    },
    why: {
      en: 'Rules catch the 90% of attacks you have seen before. The other 10% need AI — but if you call a cloud LLM on every request, cost and latency explode. The funnel keeps P50 under 50ms, P99 under 5s, at 95% cheaper than naive "always call GPT" architectures.',
      zh: '規則抓到你看過的 90% 攻擊。剩下 10% 要 AI — 但每個 request 都 call 雲端 LLM,成本與延遲會爆。漏斗讓 P50 低於 50ms、P99 低於 5s,比天真的「一律 call GPT」架構便宜 95%。',
    },
    how: {
      en: 'SmartRouter in packages/panguard-guard/src/engines/smart-router.ts dispatches events by confidence. EnvironmentBaseline learns normal processes / connections / logins during the 7-day learning window, then flips to protection mode. AnalyzeAgent wraps Anthropic / OpenAI / Ollama with a unified interface; investigation engine correlates across events.',
      zh: 'packages/panguard-guard/src/engines/smart-router.ts 的 SmartRouter 依信心度分派事件。EnvironmentBaseline 在 7 天學習視窗學正常 process / 連線 / 登入,然後切到 protection mode。AnalyzeAgent 把 Anthropic / OpenAI / Ollama 包成統一介面;investigation engine 跨事件關聯。',
    },
    proof: {
      en: 'Rules (50ms) → local AI (~2s) → cloud AI (~5s) · 90 / 7 / 3 production traffic split · 7-day learning-mode baseline · Supports Claude, OpenAI, Ollama, or offline-only.',
      zh: '規則 (50ms) → 本地 AI (~2s) → 雲端 AI (~5s) · production 流量 90 / 7 / 3 分配 · 7 天 learning-mode baseline · 支援 Claude / OpenAI / Ollama / 純離線。',
    },
    proofShort: {
      en: '90/7/3 funnel · 7-day baseline',
      zh: '90/7/3 漏斗 · 7 天 baseline',
    },
    tryIt: {
      intro: {
        en: 'Add cloud AI for deeper detection (optional — local-only also works):',
        zh: '加入雲端 AI 進行更深偵測(選用 — 純本地也能跑):',
      },
      command: 'pga guard setup-ai',
    },
    attacks: [
      {
        name: { en: 'Multi-skill chain attack', zh: '多 skill 串聯攻擊' },
        severity: 'high',
        description: {
          en: 'Individually benign tool calls that combine into a malicious sequence — rules miss, behavioral detection catches.',
          zh: '單獨看無害的工具呼叫組合成惡意序列 — 規則錯過,行為偵測抓到。',
        },
      },
      {
        name: { en: 'Novel prompt injection variants', zh: '新型 prompt 注入變體' },
        severity: 'medium',
        description: {
          en: 'Adversarial prompts that evade known regex — local AI analyzes semantic intent.',
          zh: '躲過已知 regex 的對抗 prompt — 本地 AI 分析語意意圖。',
        },
      },
    ],
    ecosystem: [],
  },

  {
    id: 5,
    slug: 'deceive',
    name: { en: 'Deceive', zh: '誘捕 Deceive' },
    tagline: {
      en: 'Honeypot integrated in Guard daemon',
      zh: '蜜罐整合在 Guard daemon 內',
    },
    status: 'shipped',
    what: {
      en: 'L5 Deceive deploys decoy tools, decoy credentials, and decoy skills that appear legitimate to attackers. When an agent — compromised or not — reaches for them, we log the full session, extract the payload, and feed it back into the TC crystallization pipeline as new ATR rule candidates.',
      zh: 'L5 誘捕佈置偽裝工具、偽裝憑證、偽裝 skill,對攻擊者看起來合法。當 agent — 不管有沒有被劫持 — 去碰它們,我們記下完整 session、萃取 payload、丟回 TC 結晶 pipeline 作為新 ATR 規則候選。',
    },
    why: {
      en: "Passive defense is half the story. Honeypots convert the attacker's actions into your intelligence: tactics, tools, timing, infrastructure. You learn without leaking real data. The detections crystallize into rules that protect everyone on the TC network.",
      zh: '被動防禦只做一半。蜜罐把攻擊者的動作轉成你的情資:戰術、工具、時機、基礎設施。你學到東西,不漏真實資料。偵測結晶成規則,保護整個 TC 網路。',
    },
    how: {
      en: 'trap-bridge.ts in panguard-guard converts honeypot session events into SecurityEvent records via trapSessionToSecurityEvent(). No separate daemon — the honeypot is embedded inside the Guard event loop, which means zero additional footprint on the host and a single audit log. Detections flow into the crystallization pipeline (Threat Cloud → LLM reviewer → ATR auto-PR).',
      zh: 'panguard-guard 的 trap-bridge.ts 透過 trapSessionToSecurityEvent() 把蜜罐 session 事件轉成 SecurityEvent 記錄。沒獨立 daemon — 蜜罐嵌在 Guard event loop 內,對 host 零額外 footprint,稽核日誌唯一。偵測流入結晶 pipeline(Threat Cloud → LLM reviewer → ATR auto-PR)。',
    },
    proof: {
      en: 'packages/panguard-guard/src/bridges/trap-bridge.ts — 31 lines of integration glue, zero config for the user · Trap sessions automatically visible in Guard dashboard · Crystallized detections feed ATR auto-PR pipeline.',
      zh: 'packages/panguard-guard/src/bridges/trap-bridge.ts — 31 行整合膠水,使用者零設定 · Trap session 自動出現在 Guard 儀表板 · 結晶的偵測餵 ATR auto-PR pipeline。',
    },
    proofShort: {
      en: 'Integrated in Guard · zero-config',
      zh: '整合在 Guard · 零設定',
    },
    tryIt: {
      intro: {
        en: 'Enabled by default in Guard when pga up runs. No separate setup.',
        zh: 'pga up 跑 Guard 時預設啟用。不用分開設定。',
      },
      command: 'pga up',
    },
    attacks: [
      {
        name: { en: 'Attacker recon', zh: '攻擊者偵察' },
        severity: 'medium',
        description: {
          en: 'Compromised agent enumerates available tools and credentials — honeypot logs every probe.',
          zh: '被劫持的 agent 列舉可用工具與憑證 — 蜜罐記下每次探測。',
        },
      },
      {
        name: { en: 'Credential theft attempts', zh: '憑證竊取嘗試' },
        severity: 'high',
        description: {
          en: 'Decoy AWS keys, GitHub tokens, DB credentials — any attempted use is attacker confirmation.',
          zh: '偽裝的 AWS key、GitHub token、DB 憑證 — 任何使用嘗試都是攻擊者確認。',
        },
      },
    ],
    ecosystem: [],
  },

  {
    id: 6,
    slug: 'respond',
    name: { en: 'Respond', zh: '反應 Respond' },
    tagline: {
      en: 'Auto-block, alert, playbook execution',
      zh: '自動阻斷、告警、劇本執行',
    },
    status: 'shipped',
    what: {
      en: 'L6 Respond closes the loop without a human. On a high-confidence detection, RespondAgent picks from 11 actions — block IP, kill process, quarantine skill, revoke credentials, isolate agent session, reduce permissions, send Slack / email / Discord alert, disable account, log-only, or run a custom playbook step.',
      zh: 'L6 反應不需人就能關閉迴圈。高信心度偵測時,RespondAgent 從 11 種動作選一:封 IP、殺 process、隔離 skill、撤銷憑證、隔離 agent session、降權、送 Slack / email / Discord 告警、停用帳號、純記錄、或跑自訂劇本步驟。',
    },
    why: {
      en: 'Detection without response is noise. Agent attacks move in seconds — by the time a SOC analyst reads the alert, credentials are already exfiltrated. The loop has to close without a human for the 90th-percentile case.',
      zh: '偵測沒有反應就是噪音。Agent 攻擊是秒級 — SOC analyst 讀告警時憑證已經外洩。90 百分位的情況迴圈必須不需人就能關閉。',
    },
    how: {
      en: 'respond-agent.ts dispatches ResponseAction union type. Each action handler is independently testable. Policy engine decides action by confidence threshold (>=90% auto, 70-90% notify + wait, <70% log). Playbook engine composes multi-step responses.',
      zh: 'respond-agent.ts 派送 ResponseAction union 類型。每個動作 handler 獨立可測。Policy engine 依信心度閾值決定動作(>=90% 自動、70-90% notify + wait、<70% 純記錄)。Playbook engine 組合多步驟反應。',
    },
    proof: {
      en: '11 response actions all shipped: block_ip · kill_process · disable_account · isolate_file · block_tool · kill_agent · quarantine_session · revoke_skill · reduce_permissions · notify · log_only · Confidence-threshold policy: 90 / 70 / 0.',
      zh: '11 種反應動作全已 ship:block_ip · kill_process · disable_account · isolate_file · block_tool · kill_agent · quarantine_session · revoke_skill · reduce_permissions · notify · log_only · 信心度閾值策略:90 / 70 / 0。',
    },
    proofShort: { en: '11 actions · threshold policy', zh: '11 種動作 · 閾值策略' },
    tryIt: {
      intro: {
        en: 'Review default policy + customize per attack class:',
        zh: '檢視預設 policy 並依攻擊類別客製:',
      },
      command: 'pga config set policy.autoRespond 90',
    },
    attacks: [
      {
        name: { en: 'Active agent compromise', zh: 'Agent 正在被劫持' },
        severity: 'critical',
        description: {
          en: 'Detection confidence ≥90% → auto-kill agent session + revoke credentials + alert SOC.',
          zh: '偵測信心度 ≥90% → 自動 kill agent session + 撤銷憑證 + 告警 SOC。',
        },
      },
      {
        name: { en: 'Sustained attack IP', zh: '持續性攻擊 IP' },
        severity: 'high',
        description: {
          en: 'Multiple failed payloads from same source — auto-block at iptables / pfctl.',
          zh: '同來源多次 payload 嘗試 — iptables / pfctl 自動封鎖。',
        },
      },
    ],
    ecosystem: [],
  },

  {
    id: 7,
    slug: 'govern',
    name: { en: 'Govern', zh: '治理 Govern' },
    tagline: {
      en: 'AIAM + 4-framework compliance reporting',
      zh: 'AIAM + 4 框架合規報告',
    },
    status: 'partial',
    what: {
      en: 'L7 Govern is what compliance teams and auditors see. Today: audit log of every admin action (actor, IP, timestamp), client key registration + revocation, OWASP Agentic Top 10 mapping (10/10), NIST AI RMF mapping (100% / 1,566 mappings shipped in ATR v2.1.0), EU AI Act + ISO 42001 metadata auto-tagged via Migrator Enterprise. Q2 2026: `pga report --framework <name>` produces per-rule Markdown / PDF reports. Q3 2026: AIAM — agent identity, scope, delegation.',
      zh: 'L7 治理是合規團隊與稽核員看的東西。今天：每個 admin 動作的稽核日誌（actor、IP、時間戳）、client key 註冊 + 撤銷、OWASP Agentic Top 10 對應（10/10）、NIST AI RMF 100% 對應（1,566 個 mapping，於 ATR v2.1.0 上線）、EU AI Act + ISO 42001 metadata 由 Migrator Enterprise 自動標註。2026 Q2：`pga report --framework <name>` 產出每條規則對應的 Markdown / PDF 報告。2026 Q3：AIAM — agent 身分、scope、委派。',
    },
    why: {
      en: 'EU AI Act enforces 2026-08-02. Colorado AI Act 2026-06-01. F500 RFPs are asking for per-rule framework mapping, not just "we scan." Auditors need a path from detected event → triggered rule → controlled article. Compliance teams need SOC2 Type II attestation. We publish honest timelines and commit to them.',
      zh: 'EU AI Act 2026-08-02 強制執行。Colorado AI Act 2026-06-01。F500 RFP 要的是每條規則對應框架的 mapping,不只是「我們有掃」。稽核員要「偵測到事件 → 觸發規則 → 控制條文」的路徑。合規團隊要 SOC2 Type II 認證。我們公開誠實時程並承諾做到。',
    },
    how: {
      en: 'Today: threat-cloud/src/audit-logger.ts with audit_log SQLite migrations v2-v3. ATR v2.1.0 rules ship with `compliance.nist_ai_rmf` metadata block (1,566 mappings). Migrator Enterprise auto-tags EU AI Act articles + ISO 42001 clauses on every converted rule. Q2 2026: `pga report` reads rule YAML + TC audit log to build Markdown / PDF reports. Q3 2026: AIAM package (panguard-auth) — OAuth 2.0 device flow, JWT issue/verify, policy evaluator.',
      zh: '今天：threat-cloud/src/audit-logger.ts 加上 audit_log SQLite migration v2-v3。ATR v2.1.0 規則內建 `compliance.nist_ai_rmf` metadata 區塊（1,566 個 mapping）。Migrator Enterprise 在規則轉換時自動標註 EU AI Act 條文與 ISO 42001 條款。2026 Q2：`pga report` 讀規則 YAML + TC 稽核日誌，產 Markdown / PDF 報告。2026 Q3：AIAM package（panguard-auth）— OAuth 2.0 device flow、JWT issue/verify、policy evaluator。',
    },
    proof: {
      en: 'Today: audit-logger.ts (143 lines, fully implemented) · admin dashboard with pagination/filter · client_keys table · OWASP Agentic Top 10 mapping 10/10 categories, 77 rule links · NIST AI RMF 100% mapped (1,566 mappings, ATR v2.1.0) · Migrator Enterprise auto-tags EU AI Act + ISO 42001 · Q2 2026: pga report unifies all frameworks · Q3 2026: AIAM + SOC2 Type 1 attestation target.',
      zh: '今天：audit-logger.ts（143 行，完整實作）· admin 儀表板 pagination/filter · client_keys table · OWASP Agentic Top 10 對應 10/10 類別、77 條規則連結 · NIST AI RMF 100% 對應（1,566 個 mapping，ATR v2.1.0）· Migrator Enterprise 自動標註 EU AI Act + ISO 42001 · 2026 Q2：pga report 整合所有框架 · 2026 Q3：AIAM + SOC2 Type 1 認證目標。',
    },
    proofShort: {
      en: 'NIST AI RMF 100% · OWASP 10/10 · audit log live · pga report Q2 2026',
      zh: 'NIST AI RMF 100% · OWASP 10/10 · 稽核日誌已上線 · pga report Q2 2026',
    },
    tryIt: {
      intro: {
        en: 'Check sensor registration + audit log status today:',
        zh: '今天就檢查感測器註冊與稽核日誌狀態:',
      },
      command: 'pga sensor status',
    },
    attacks: [
      {
        name: { en: 'Unauthorized admin action', zh: '未授權 admin 動作' },
        severity: 'high',
        description: {
          en: 'Audit log captures every rule create / delete / proposal approve with actor + IP — forensic trail preserved even if admin account is compromised.',
          zh: '稽核日誌記下每次規則 create / delete / proposal approve 的 actor + IP — 即便 admin 帳號被劫持,鑑識 trail 仍保留。',
        },
      },
      {
        name: { en: 'Compliance attestation gap', zh: '合規認證缺口' },
        severity: 'medium',
        description: {
          en: 'Without per-rule framework mapping, auditors cannot validate EU AI Act Article 9 risk controls → Q2 2026 fix.',
          zh: '沒有每條規則的框架對應,稽核員無法驗證 EU AI Act Article 9 風險控制 → 2026 Q2 修。',
        },
      },
    ],
    ecosystem: [],
  },
] as const;

export function getLayerBySlug(slug: string): Layer | undefined {
  return LAYERS.find((l) => l.slug === slug);
}

export function getLayersShipped(): readonly Layer[] {
  return LAYERS.filter((l) => l.status === 'shipped');
}

export function getLayersComingSoon(): readonly Layer[] {
  return LAYERS.filter((l) => l.status === 'partial' || l.status === 'gap');
}
