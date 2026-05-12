/**
 * PanGuard AI Comparison Pages
 *
 * Honest "X vs Y" content. Comparison pages earn 3-4x citation rate in
 * LLM answers because users search "ATR vs Sigma" before adopting.
 *
 * Voice rule: never bash competitors. Say where each is genuinely better.
 * The credibility this earns is worth more than the cheap dunk.
 */

export interface CompareRow {
  feature: string;
  atr: string;
  other: string;
  // 'atr' / 'other' / 'tie' / 'context' (context = depends on use case)
  winner: 'atr' | 'other' | 'tie' | 'context';
}

export interface ComparisonEntry {
  slug: string;
  // Both parts in English (proper nouns)
  atrLabel: string;
  otherLabel: string;
  // Page title localized
  title: { en: string; zh: string };
  oneLiner: { en: string; zh: string };
  // Two-paragraph framing
  framing: { en: string[]; zh: string[] };
  rows: CompareRow[];
  // When to choose ATR
  chooseAtr: { en: string; zh: string };
  // When to choose the other
  chooseOther: { en: string; zh: string };
  // Honest verdict
  bottomLine: { en: string; zh: string };
  references: Array<{ label: string; url: string }>;
  lastReviewed: string;
}

export const COMPARE: ComparisonEntry[] = [
  {
    slug: 'atr-vs-sigma',
    atrLabel: 'ATR (Agent Threat Rules)',
    otherLabel: 'Sigma',
    title: {
      en: 'ATR vs Sigma — open detection rule standards compared',
      zh: 'ATR vs Sigma — 開放偵測規則標準比較',
    },
    oneLiner: {
      en: 'Sigma rules detect threats in log events. ATR rules detect threats in AI agent behavior. They solve different problems and are designed to coexist — Sigma in SIEM, ATR in agent runtime. PanGuard Migrator converts Sigma to ATR for organizations bridging both.',
      zh: 'Sigma 規則偵測 log 事件中的威脅。ATR 規則偵測 AI agent 行為中的威脅。兩者解決不同問題,設計上互相共存——Sigma 在 SIEM,ATR 在 agent runtime。PanGuard Migrator 為跨兩個世界的組織把 Sigma 轉成 ATR。',
    },
    framing: {
      en: [
        'Sigma is the open detection standard for SIEM (Security Information and Event Management). Rules describe log patterns — Windows Event ID 4625 with logon type 3 and source IP outside the allowlist — and SIEM engines (Splunk, ELK, Microsoft Sentinel) load and evaluate them. Sigma is a decade old, has thousands of community rules, and is the de-facto language for detection engineering.',
        'ATR is the open detection standard for AI agents. Rules describe agent-context patterns — `tool_call.arguments` containing a base64-encoded reverse shell, `model_output` containing markdown image references with credential parameters, `agent_event.event_type` of unauthorized_file_read — and ATR engines (PanGuard Guard, Microsoft AGT, Cisco AI Defense skill-scanner) load and evaluate them. ATR is two years old, has 419 rules, and is becoming the de-facto language for AI agent detection.',
      ],
      zh: [
        'Sigma 是 SIEM（Security Information and Event Management）的開放偵測標準。規則描述 log 模式——Windows Event ID 4625 加上 logon type 3 加上來源 IP 在 allowlist 之外——SIEM 引擎（Splunk、ELK、Microsoft Sentinel）載入並執行。Sigma 已經十年,有數千條社群規則,是偵測工程的事實標準語言。',
        'ATR 是 AI agent 的開放偵測標準。規則描述 agent-context 模式——`tool_call.arguments` 包含 base64 編碼的 reverse shell、`model_output` 包含夾帶憑證參數的 markdown 圖片參照、`agent_event.event_type` 為 unauthorized_file_read——ATR 引擎（PanGuard Guard、Microsoft AGT、Cisco AI Defense skill-scanner）載入並執行。ATR 兩年歷史,419 條規則,正在成為 AI agent 偵測的事實標準語言。',
      ],
    },
    rows: [
      { feature: 'Detection target', atr: 'Agent behavior + tool calls + model output', other: 'Log events + system telemetry', winner: 'context' },
      { feature: 'Maturity', atr: '2 years, 419 rules', other: '10+ years, thousands of community rules', winner: 'other' },
      { feature: 'Prompt injection detection', atr: 'Native (115 rules)', other: 'Not designed for it', winner: 'atr' },
      { feature: 'Tool call monitoring', atr: 'Native (22 rules)', other: 'Not designed for it', winner: 'atr' },
      { feature: 'SIEM integration', atr: 'Via SARIF export', other: 'Native (all major SIEMs)', winner: 'other' },
      { feature: 'Vendor adoption', atr: 'Microsoft AGT, Cisco AI Defense, MISP, OWASP A-S-R-H', other: 'Splunk, Elastic, Microsoft Sentinel, Sumo Logic, every SIEM', winner: 'other' },
      { feature: 'License', atr: 'MIT', other: 'DRL (Detection Rule License)', winner: 'tie' },
      { feature: 'YAML format', atr: 'Yes', other: 'Yes', winner: 'tie' },
      { feature: 'OWASP Agentic Top 10 mapping', atr: '10/10 native', other: 'No mapping', winner: 'atr' },
      { feature: 'OWASP LLM Top 10 mapping', atr: 'Native', other: 'No mapping', winner: 'atr' },
      { feature: 'Migration path', atr: 'PanGuard Migrator converts Sigma → ATR', other: '—', winner: 'context' },
    ],
    chooseAtr: {
      en: 'You are protecting AI agent workloads — Claude Code, Cursor, OpenClaw, MCP servers, custom in-house agents. The threats are prompt injection, tool poisoning, indirect injection through retrieved content, agent supply-chain attacks. Sigma cannot see these because they happen in semantic space, not in syslog.',
      zh: '你在保護 AI agent workload——Claude Code、Cursor、OpenClaw、MCP server、自建 in-house agent。威脅是 prompt injection、tool poisoning、透過 retrieved 內容的 indirect injection、agent 供應鏈攻擊。Sigma 看不到這些,因為它們發生在語意空間,不在 syslog 裡。',
    },
    chooseOther: {
      en: 'You are protecting infrastructure — servers, endpoints, network. The threats are credential stuffing, lateral movement, malware, ransomware. Sigma is the right tool because the threats produce log events and SIEM is where you already have detection-engineering infrastructure.',
      zh: '你在保護基礎設施——伺服器、endpoint、網路。威脅是 credential stuffing、橫向移動、惡意軟體、勒索軟體。Sigma 是對的工具,因為威脅會產生 log 事件,而 SIEM 是你既有的偵測工程基礎設施所在。',
    },
    bottomLine: {
      en: 'Use both. Run Sigma in your SIEM for infrastructure. Run ATR in your agent runtime for AI agent workloads. If you have legacy Sigma detection engineering investment and you are starting on AI agent security, PanGuard Migrator converts your Sigma corpus to ATR with five-framework compliance metadata in one CLI invocation.',
      zh: '兩個都用。SIEM 跑 Sigma 保護基礎設施。Agent runtime 跑 ATR 保護 AI agent workload。如果你既有 Sigma 偵測工程投資,正在開始 AI agent 安全,PanGuard Migrator 一個 CLI 指令就能把你的 Sigma 規則庫轉成 ATR,還附五大框架合規 metadata。',
    },
    references: [
      { label: 'Sigma project on GitHub', url: 'https://github.com/SigmaHQ/sigma' },
      { label: 'ATR on GitHub', url: 'https://github.com/Agent-Threat-Rule/agent-threat-rules' },
      { label: 'PanGuard Migrator', url: 'https://panguard.ai/migrator' },
    ],
    lastReviewed: '2026-05-12',
  },
  {
    slug: 'atr-vs-garak',
    atrLabel: 'ATR (Agent Threat Rules)',
    otherLabel: 'NVIDIA garak',
    title: {
      en: 'ATR vs garak — detection rules vs adversarial testing',
      zh: 'ATR vs garak — 偵測規則 vs 對抗式測試',
    },
    oneLiner: {
      en: 'garak generates adversarial prompts to probe LLM weaknesses pre-deployment. ATR detects malicious patterns in agent runtime traffic. garak finds vulnerabilities in models; ATR catches exploits against agents. Both are needed. ATR rules pass garak\'s test corpus at 97.1% recall.',
      zh: 'garak 產生對抗式 prompt,在部署前探測 LLM 弱點。ATR 在 agent runtime 偵測流量中的惡意模式。garak 找模型漏洞;ATR 抓針對 agent 的 exploit。兩者都需要。ATR 規則在 garak 的測試語料庫上召回率 97.1%。',
    },
    framing: {
      en: [
        'NVIDIA garak is the leading open-source LLM red-teaming framework. It runs probes — encoding tricks, persona attacks, jailbreaks, output poisoning — against a target LLM and reports which attacks succeeded. garak is for pre-deployment validation: "before we ship this model, what attacks work against it." It does not run in production traffic.',
        'ATR is the runtime detection layer. Once an LLM is deployed in an agent, ATR rules inspect every prompt, every tool call, every retrieved document, every model output for known attack patterns. ATR runs at sub-millisecond per rule and blocks or alerts in real time. The two tools complement each other: garak finds what the model is vulnerable to, ATR catches when attackers actually try it.',
      ],
      zh: [
        'NVIDIA garak 是業界領先的開源 LLM red-teaming 框架。它對目標 LLM 跑 probe——encoding 詭計、persona 攻擊、jailbreak、output poisoning——然後回報哪些攻擊成功。garak 是 pre-deployment 驗證:「在我們 ship 這個模型之前,哪些攻擊能對它生效?」它不在生產流量中跑。',
        'ATR 是 runtime 偵測層。一旦 LLM 被部署到 agent 裡,ATR 規則檢查每一個 prompt、每一個工具呼叫、每一個 retrieved 文件、每一個模型輸出,看有沒有已知攻擊模式。ATR 以亞毫秒級延遲執行,可以即時 block 或 alert。兩個工具互補:garak 找出模型的弱點,ATR 在攻擊者真的嘗試時抓住。',
      ],
    },
    rows: [
      { feature: 'When it runs', atr: 'Runtime (every request)', other: 'Pre-deployment (lab testing)', winner: 'context' },
      { feature: 'What it produces', atr: 'Block / alert / quarantine verdicts', other: 'Test report (success rate per probe)', winner: 'context' },
      { feature: 'Sample size', atr: '419 detection rules', other: 'Hundreds of probe types', winner: 'tie' },
      { feature: 'Garak benchmark recall', atr: '97.1% on 666-sample corpus', other: '—', winner: 'atr' },
      { feature: 'Integration', atr: 'PanGuard Guard, Microsoft AGT, Cisco AI Defense', other: 'CLI tool, GitHub Actions', winner: 'tie' },
      { feature: 'Maintainer', atr: 'PanGuard AI + community', other: 'NVIDIA', winner: 'tie' },
      { feature: 'License', atr: 'MIT', other: 'Apache 2.0', winner: 'tie' },
    ],
    chooseAtr: {
      en: 'You need real-time detection in production. You are running AI agents that interact with users, tools, and external content. You need to block exploits before they execute, not discover them in post-mortem.',
      zh: '你需要生產環境的即時偵測。你跑的 AI agent 會跟使用者、工具、外部內容互動。你需要在 exploit 執行前就 block 它,不是事後做 post-mortem 才發現。',
    },
    chooseOther: {
      en: 'You are evaluating an LLM before deployment. You need to know what attacks succeed against your model so you can patch, retrain, or harden the system prompt. You want a research-grade test suite with reproducible probes.',
      zh: '你在部署前評估 LLM。你想知道哪些攻擊對你的模型有效,好讓你 patch、retrain、或強化 system prompt。你想要研究級的測試套件,有可重現的 probe。',
    },
    bottomLine: {
      en: 'Use both. Run garak in CI before any model change ships. Run ATR in production against every request. garak finds what to fix; ATR catches what was missed. ATR\'s public benchmark against garak\'s corpus (97.1% recall on 666 samples) measures that overlap honestly.',
      zh: '兩個都用。Model 變更要 ship 之前,在 CI 跑 garak。生產環境對每個 request 跑 ATR。garak 找出該修什麼;ATR 抓住漏掉的。ATR 對 garak 語料庫的公開 benchmark（666 個樣本 97.1% 召回率）誠實地量化這個重疊。',
    },
    references: [
      { label: 'NVIDIA garak on GitHub', url: 'https://github.com/NVIDIA/garak' },
      { label: 'ATR Garak benchmark results', url: 'https://panguard.ai/research/benchmarks' },
    ],
    lastReviewed: '2026-05-12',
  },
  {
    slug: 'atr-vs-pyrit',
    atrLabel: 'ATR (Agent Threat Rules)',
    otherLabel: 'Microsoft PyRIT',
    title: {
      en: 'ATR vs PyRIT — runtime detection vs Python red-team toolkit',
      zh: 'ATR vs PyRIT — runtime 偵測 vs Python red-team 工具包',
    },
    oneLiner: {
      en: 'Microsoft PyRIT is a Python red-team toolkit for orchestrating attacks against LLMs. ATR is a YAML rule standard for detecting attacks against AI agents at runtime. PyRIT is for the attacker side of the dial; ATR is for the defender side.',
      zh: 'Microsoft PyRIT 是 Python red-team 工具包,用來組織針對 LLM 的攻擊。ATR 是 YAML 規則標準,用來在 runtime 偵測對 AI agent 的攻擊。PyRIT 是「攻擊」那一側;ATR 是「防守」那一側。',
    },
    framing: {
      en: [
        'PyRIT (Python Risk Identification Toolkit) is Microsoft\'s open-source framework for automating red-team operations against generative AI systems. It orchestrates campaigns, manages target models, evaluates responses, and supports both single-turn and multi-turn attack scenarios. Roman Lutz and the Microsoft team maintain it as part of Microsoft\'s broader AI security tooling.',
        'ATR is the rule standard a defender deploys in production to catch what PyRIT would test for. PyRIT generates the attack; ATR detects the attack pattern when it arrives. The two are designed to compose: red teams use PyRIT to validate that ATR rules cover the threat space; defenders deploy ATR to block the attack patterns PyRIT can exercise.',
      ],
      zh: [
        'PyRIT (Python Risk Identification Toolkit) 是 Microsoft 的開源框架,自動化針對生成式 AI 系統的 red-team 作戰。它組織 campaign、管理目標模型、評估回應,支援單輪與多輪攻擊。Roman Lutz 與 Microsoft 團隊維護它,是 Microsoft 整體 AI 安全工具的一部分。',
        'ATR 是防守方在生產環境部署的規則標準,用來抓住 PyRIT 會測試的攻擊。PyRIT 產生攻擊;ATR 在攻擊模式抵達時偵測。兩者設計上是組合的:red team 用 PyRIT 驗證 ATR 規則涵蓋威脅空間;防守方部署 ATR 來 block PyRIT 能演練的攻擊模式。',
      ],
    },
    rows: [
      { feature: 'Role', atr: 'Defender (runtime detection)', other: 'Red team (attack orchestration)', winner: 'context' },
      { feature: 'Format', atr: 'YAML rules', other: 'Python framework + API', winner: 'context' },
      { feature: 'Maintainer', atr: 'PanGuard AI + community', other: 'Microsoft', winner: 'tie' },
      { feature: 'License', atr: 'MIT', other: 'MIT', winner: 'tie' },
      { feature: 'Multi-turn attacks', atr: 'Detection via agent_event chains', other: 'Native orchestration', winner: 'context' },
      { feature: 'Integration with each other', atr: 'PyRIT campaigns can target ATR runtime to measure coverage', other: 'ATR rules can be tested in PyRIT campaigns', winner: 'tie' },
    ],
    chooseAtr: {
      en: 'You are operating an AI agent in production and need to detect exploits in real time. ATR runs at sub-millisecond per rule and integrates with PanGuard Guard, Microsoft AGT, Cisco AI Defense, and any runtime that can evaluate YAML.',
      zh: '你在生產環境跑 AI agent,需要即時偵測 exploit。ATR 以亞毫秒級每規則執行,可整合到 PanGuard Guard、Microsoft AGT、Cisco AI Defense、以及任何能評估 YAML 的 runtime。',
    },
    chooseOther: {
      en: 'You are running a red-team program against an AI system. You need to author attack campaigns, manage targets, and measure success rates. PyRIT is the Python-native framework Microsoft uses internally and it is the most mature open-source option.',
      zh: '你在跑針對 AI 系統的 red-team 計畫。你需要寫攻擊 campaign、管理目標、量化成功率。PyRIT 是 Microsoft 內部用的 Python-native 框架,也是最成熟的開源選項。',
    },
    bottomLine: {
      en: 'Use both. Red team uses PyRIT to author and execute campaigns. Defenders deploy ATR to block what those campaigns would exploit. Active ecosystem cooperation exists — PanGuard has filed draft PRs to PyRIT and we treat coverage gaps surfaced by PyRIT as ATR rule backlog items.',
      zh: '兩個都用。Red team 用 PyRIT 寫並執行 campaign。防守方部署 ATR 來 block 這些 campaign 會 exploit 的東西。已有 active 的生態系合作——PanGuard 對 PyRIT 提了 draft PR,我們把 PyRIT 發現的覆蓋空缺當作 ATR 規則 backlog。',
    },
    references: [
      { label: 'Microsoft PyRIT on GitHub', url: 'https://github.com/microsoft/PyRIT' },
      { label: 'ATR on GitHub', url: 'https://github.com/Agent-Threat-Rule/agent-threat-rules' },
    ],
    lastReviewed: '2026-05-12',
  },
  {
    slug: 'atr-vs-owasp-agentic-top-10',
    atrLabel: 'ATR (Agent Threat Rules)',
    otherLabel: 'OWASP Agentic Top 10',
    title: {
      en: 'ATR vs OWASP Agentic Top 10 — executable rules vs taxonomy',
      zh: 'ATR vs OWASP Agentic Top 10 — 可執行規則 vs 分類框架',
    },
    oneLiner: {
      en: 'OWASP Agentic Top 10 is a taxonomy of the most critical agentic AI security risks. ATR is a set of executable detection rules. The two are complementary: OWASP defines the categories, ATR detects the actual attack patterns inside each category. ATR ships with native OWASP Agentic Top 10 mapping covering all 10 of 10 categories.',
      zh: 'OWASP Agentic Top 10 是 agentic AI 最關鍵安全風險的分類。ATR 是一組可執行的偵測規則。兩者互補:OWASP 定義類別,ATR 偵測每個類別裡的實際攻擊模式。ATR 內建 OWASP Agentic Top 10 對應,涵蓋全部 10 個類別。',
    },
    framing: {
      en: [
        'OWASP Agentic Top 10 (released 2026) defines ten categories of risk specific to AI agents: ASI01 Agent Goal Hijack, ASI02 Tool Misuse, ASI03 Identity & Privilege Abuse, ASI04 Agentic Supply Chain, ASI05 Unexpected Code Execution, ASI06 Memory & Context Poisoning, ASI07 Insecure Inter-Agent Communication, ASI08 Cascading Failures, ASI09 Human-Agent Trust Exploitation, ASI10 Rogue Agents. It is a checklist of what to worry about, with brief examples per category.',
        'ATR is the executable detection layer. Each ATR rule lists which OWASP Agentic IDs it covers. A SOC using OWASP as a checklist can deploy ATR and immediately get detection coverage for every category — 10 of 10 categories with at least one rule, 77 total category-rule mappings across the corpus.',
      ],
      zh: [
        'OWASP Agentic Top 10（2026 發布）定義了 AI agent 特有的十類風險:ASI01 Agent 目標劫持、ASI02 工具濫用、ASI03 身份與權限濫用、ASI04 Agent 供應鏈、ASI05 非預期程式碼執行、ASI06 記憶體與上下文污染、ASI07 不安全的 Agent 間通訊、ASI08 連鎖故障、ASI09 人機信任濫用、ASI10 失控 Agent。這是「該擔心什麼」的 checklist,每類有簡短的範例。',
        'ATR 是可執行的偵測層。每條 ATR 規則列出它涵蓋哪些 OWASP Agentic ID。一個用 OWASP 當 checklist 的 SOC,部署 ATR 後就立刻獲得每個類別的偵測覆蓋——10 個類別都至少有一條規則,規則庫共有 77 個類別-規則對應。',
      ],
    },
    rows: [
      { feature: 'Format', atr: 'YAML rules (machine-readable)', other: 'PDF + markdown (human-readable)', winner: 'context' },
      { feature: 'Use', atr: 'Deploy to detection engine', other: 'Audit checklist + threat model', winner: 'context' },
      { feature: 'OWASP Agentic Top 10 coverage', atr: '10/10 categories with 77 mappings', other: '10/10 (it IS the 10/10)', winner: 'tie' },
      { feature: 'Real-time detection', atr: 'Yes', other: 'Not designed for it', winner: 'atr' },
      { feature: 'Vendor neutrality', atr: 'MIT, multi-vendor adoption', other: 'OWASP Foundation (neutral)', winner: 'tie' },
      { feature: 'Examples per category', atr: '5-115 rules per category', other: '1-3 examples per category', winner: 'atr' },
    ],
    chooseAtr: {
      en: 'You need actual detection, not just a checklist. You want to operationalize OWASP Agentic Top 10 — turn it from a PDF into rules running in production. ATR is the executable form.',
      zh: '你需要真正的偵測,不只是 checklist。你想把 OWASP Agentic Top 10 operationalize——把它從 PDF 變成生產環境中執行的規則。ATR 是可執行的形式。',
    },
    chooseOther: {
      en: 'You need a vendor-neutral framework for risk assessment, audit, or threat modeling. You want the OWASP brand for compliance conversations. OWASP Agentic Top 10 is the taxonomy you cite in policy documents.',
      zh: '你需要廠商中立的框架做風險評估、稽核、威脅建模。你要 OWASP 品牌用於合規對話。OWASP Agentic Top 10 是政策文件中引用的分類。',
    },
    bottomLine: {
      en: 'Cite OWASP, deploy ATR. PanGuard contributed the rule pack to OWASP A-S-R-H (Agentic Security Resource Hub) PR #74, merged 2026-05-11 — the implementation reference for the OWASP Agentic Top 10 taxonomy is ATR.',
      zh: '引用 OWASP,部署 ATR。PanGuard 對 OWASP A-S-R-H (Agentic Security Resource Hub) PR #74 貢獻了規則包,2026-05-11 合併——OWASP Agentic Top 10 分類的實作參考就是 ATR。',
    },
    references: [
      { label: 'OWASP Agentic Top 10 (2026)', url: 'https://genai.owasp.org/agentic-top-10/' },
      { label: 'ATR OWASP mapping', url: 'https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/OWASP-MAPPING.md' },
      { label: 'OWASP A-S-R-H PR #74', url: 'https://github.com/precize/Agentic-AI-Top10-Vulnerability/pull/74' },
    ],
    lastReviewed: '2026-05-12',
  },
  {
    slug: 'atr-vs-cisco-defenseclaw',
    atrLabel: 'ATR + PanGuard AI',
    otherLabel: 'Cisco DefenseClaw',
    title: {
      en: 'PanGuard AI vs Cisco DefenseClaw — open standard vs enterprise platform',
      zh: 'PanGuard AI vs Cisco DefenseClaw — 開放標準 vs 企業平台',
    },
    oneLiner: {
      en: 'Cisco DefenseClaw is a full enterprise AI security platform. PanGuard AI is the open standard plus commercial platform — same scope, different starting point. Cisco AI Defense actually ships ATR rules in production (PR #99, 419 rules merged into skill-scanner) so there is no peer competition at the rule layer.',
      zh: 'Cisco DefenseClaw 是完整企業 AI 安全平台。PanGuard AI 是開放標準加商業平台——範圍相同,起點不同。Cisco AI Defense 在生產環境實際使用 ATR 規則（PR #99,419 條規則合併進 skill-scanner）,所以規則層沒有 peer 競爭。',
    },
    framing: {
      en: [
        'Cisco DefenseClaw (positioned at RSA 2026) is a packaged enterprise AI security platform — runtime, dashboard, integrations, SLA, the works. It is sold to F500-grade buyers as a single product with Cisco\'s sales motion behind it. The differentiator is enterprise infrastructure integration and Cisco\'s existing customer relationships.',
        'PanGuard AI takes a different approach: ship the open rule standard (ATR) first, build the commercial platform on top. ATR is MIT-licensed and adopted by Cisco itself — Cisco AI Defense\'s skill-scanner runs all 419 ATR rules in production via PR #99 (merged 2026-04-22). So this is not really a competition at the rule layer. The competition is at the platform layer: who has the better runtime, compliance evidence, and migration tooling.',
      ],
      zh: [
        'Cisco DefenseClaw (RSA 2026 推出) 是打包好的企業 AI 安全平台——runtime、dashboard、整合、SLA,一應俱全。賣給 F500 級買家的單一產品,背後有 Cisco 的銷售動能。差異化點是企業基礎設施整合與 Cisco 既有客戶關係。',
        'PanGuard AI 採不同路徑:先 ship 開放規則標準（ATR）,再在上面建商業平台。ATR 是 MIT 授權,Cisco 自己也採用——Cisco AI Defense 的 skill-scanner 透過 PR #99（2026-04-22 合併）在生產環境跑全部 419 條 ATR 規則。所以這在規則層其實不算競爭。競爭在平台層:誰有更好的 runtime、合規 evidence、migration 工具。',
      ],
    },
    rows: [
      { feature: 'Rule standard', atr: 'ATR (open, MIT, 419 rules) — Cisco runs these too', other: 'Same — Cisco ships ATR', winner: 'tie' },
      { feature: 'Runtime engine', atr: 'PanGuard Guard (open + commercial)', other: 'Cisco DefenseClaw (commercial)', winner: 'context' },
      { feature: 'Enterprise integration', atr: 'Growing — early-stage', other: 'Mature — Cisco infra stack', winner: 'other' },
      { feature: 'Migration tooling', atr: 'PanGuard Migrator (Community + Enterprise)', other: 'Not a focus', winner: 'atr' },
      { feature: 'Compliance evidence packs', atr: '5 frameworks (EU AI Act, OWASP Agentic, OWASP LLM, NIST AI RMF, ISO/IEC 42001)', other: 'Mainly SOC 2 + NIST', winner: 'atr' },
      { feature: 'Pricing', atr: 'Community $0, Pilot $25K, Enterprise $150-500K, Sovereign $5-20M', other: 'Enterprise contracts, custom pricing', winner: 'context' },
      { feature: 'Open source posture', atr: 'Open standard, open Community CLI, open Migrator Community', other: 'Closed commercial product', winner: 'atr' },
      { feature: 'Sovereign deployment', atr: 'Sovereign tier explicit ($5-20M/nation, airgap, Cisco/AMD/NVIDIA JV pre-integrated)', other: 'Custom enterprise engagements', winner: 'context' },
    ],
    chooseAtr: {
      en: 'You want the open standard and you want to own the rule set yourself. You need migration tooling to bridge from Sigma/YARA legacy detection engineering. You need explicit 5-framework compliance evidence packs. You want a Sovereign tier for nation-scale deployments. You want to avoid vendor lock-in at the rule layer.',
      zh: '你要開放標準,你想自己擁有規則集。你需要 migration 工具從 Sigma/YARA 既有偵測工程過渡。你需要明確的 5 框架合規 evidence pack。你想要 Sovereign tier 做國家級部署。你想避免規則層被 vendor lock-in。',
    },
    chooseOther: {
      en: 'You are a Cisco shop. Cisco is in your DR, in your SD-WAN, in your XDR. DefenseClaw plugs into the existing Cisco infrastructure and your procurement, support, and SLA relationships are already with Cisco. The enterprise integration cost is near zero.',
      zh: '你是 Cisco 用戶。Cisco 在你的 DR、SD-WAN、XDR。DefenseClaw 接到既有的 Cisco 基礎設施,你的採購、支援、SLA 關係已經在 Cisco。企業整合成本近乎零。',
    },
    bottomLine: {
      en: 'These are not actually competitors at the layer that matters. Both organizations are shipping the same ATR rule set in production. The choice is between Cisco\'s commercial bundle (heavyweight, integrated, expensive) and PanGuard\'s open-plus-commercial model (lightweight, vendor-neutral, scales from $0 to $20M). If you are already a Cisco customer, the integration advantage probably wins. Everyone else benefits more from PanGuard\'s open posture.',
      zh: '在關鍵的那一層,這兩家其實不算對手。兩家組織都在生產環境跑同一套 ATR 規則。選擇在於 Cisco 的商業 bundle（重量級、整合、貴）vs PanGuard 的開放+商業模式（輕量、廠商中立、從 $0 規模到 $20M）。如果你已經是 Cisco 客戶,整合優勢大概會贏。其他人從 PanGuard 的開放姿態獲益更多。',
    },
    references: [
      { label: 'Cisco AI Defense', url: 'https://www.cisco.com/site/us/en/products/security/ai-defense/' },
      { label: 'Cisco skill-scanner PR #99 (ATR adoption)', url: 'https://github.com/cisco-ai-defense/skill-scanner/pull/99' },
      { label: 'PanGuard AI', url: 'https://panguard.ai' },
    ],
    lastReviewed: '2026-05-12',
  },
];

export function getComparison(slug: string): ComparisonEntry | undefined {
  return COMPARE.find((c) => c.slug === slug);
}
