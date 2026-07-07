export interface ChangelogChange {
  type: 'feature' | 'fix' | 'improvement' | 'security';
  text: string;
  textZh?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  titleZh?: string;
  description: string;
  descriptionZh?: string;
  changes: ChangelogChange[];
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '1.5.4',
    date: '2026-05-10',
    title: 'ATR v2.1.0 · Migrator GA · 100% NIST AI RMF',
    titleZh: 'ATR v2.1.0 · Migrator GA · 100% NIST AI RMF',
    description:
      'ATR upgraded to v2.1.0 with 330 detection rules and 100% NIST AI RMF mapping (1,566 mappings across 16 subcategories). Migrator Community v0.1.0 shipped on npm under MIT. Cisco AI Defense expanded to the full 330-rule pack via PR #99; Microsoft AGT now ships 287 rules + weekly auto-sync via PR #1277.',
    descriptionZh:
      'ATR 升級至 v2.1.0，內含 330 條偵測規則並完成 100% NIST AI RMF 對應(16 個子類別共 1,566 條對應)。Migrator Community v0.1.0 以 MIT 授權發布於 npm。Cisco AI Defense 透過 PR #99 擴張至完整 330 條規則包；Microsoft AGT 透過 PR #1277 內建 287 條規則並設定每週自動同步。',
    changes: [
      {
        type: 'feature',
        text: 'ATR v2.1.0: 100% NIST AI RMF coverage — every rule carries compliance.nist_ai_rmf metadata, 1,566 mappings across GV / MP / MS / MG',
        textZh:
          'ATR v2.1.0:100% NIST AI RMF 覆蓋 — 每條規則都帶有 compliance.nist_ai_rmf metadata,GV / MP / MS / MG 共 1,566 條對應',
      },
      {
        type: 'feature',
        text: 'Migrator Community v0.1.0 on npm (@panguard-ai/migrator-community, MIT) — Sigma / YARA / Snort parsers, IR, transformers, validators, basic CLI',
        textZh:
          'Migrator Community v0.1.0 上架 npm (@panguard-ai/migrator-community, MIT) — Sigma / YARA / Snort 解析器、IR、transformers、validators、基本 CLI',
      },
      {
        type: 'feature',
        text: 'Migrator Enterprise v0.1.0 production-ready — 15 source-format adapters, strict 0-FP quality pipeline, 5-framework auto-mapping, 6-tab web dashboard, audit evidence packs',
        textZh:
          'Migrator Enterprise v0.1.0 可進入 production — 15 種來源格式 adapter、嚴格 0-FP 品質 pipeline、5 大合規框架自動對應、6 分頁網頁 dashboard、稽核證據包',
      },
      {
        type: 'improvement',
        text: 'Cisco AI Defense: PR #99 expanded from 34-rule PoC to full 330-rule pack in skill-scanner production',
        textZh:
          'Cisco AI Defense:PR #99 從 34 條規則 PoC 擴張至完整 330 條規則包,進入 skill-scanner production',
      },
      {
        type: 'improvement',
        text: 'Microsoft AGT: PR #1277 expanded to 287 rules + weekly auto-sync workflow into Agent Governance Toolkit',
        textZh:
          'Microsoft AGT:PR #1277 擴張至 287 條規則 + 每週自動同步 workflow 進入 Agent Governance Toolkit',
      },
      {
        type: 'improvement',
        text: 'NVIDIA garak in-the-wild benchmark: 97.1% recall (646/666) maintained · 0.20% FP on 498-sample SKILL.md corpus',
        textZh: 'NVIDIA garak 實測基準:97.1% recall(646/666) · 498 SKILL.md 樣本上 0.20% 誤報率',
      },
      {
        type: 'fix',
        text: 'Engine: code-block + table-cell suppression now applied to array-format rules (was silently bypassed for every rule from 2026 onward)',
        textZh:
          '引擎:code-block + table-cell 抑制功能現已套用到 array 格式規則(2026 年以後新增的規則先前默默被略過)',
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-05-01',
    title: 'Migrator Community Release · Open Core',
    titleZh: 'Migrator Community 開源版 · 開放核心',
    description:
      'Released @panguard-ai/migrator-community v0.1.0 on npm under MIT license. Open-core split: community parsers, IR, and validators are free; enterprise enrichment, 5-framework compliance modules, and audit evidence remain proprietary in panguard-enterprise. Snyk / Elastic / HashiCorp open-core precedent.',
    descriptionZh:
      '在 npm 以 MIT 授權發布 @panguard-ai/migrator-community v0.1.0。開放核心拆分:社群版的解析器、IR、validator 免費開源;enterprise 加值、5 大合規框架模組與稽核證據仍保留於 panguard-enterprise 商業套件。參照 Snyk / Elastic / HashiCorp 的開放核心模式。',
    changes: [
      {
        type: 'feature',
        text: 'Migrator Community npm package (MIT) — Sigma, YARA, Snort source-format parsers and IR (intermediate representation)',
        textZh:
          'Migrator Community npm 套件(MIT)— Sigma、YARA、Snort 來源格式解析器與 IR(中介表示)',
      },
      {
        type: 'feature',
        text: 'Basic CLI for rule conversion — migrate from legacy formats to ATR YAML',
        textZh: '基本 CLI 規則轉換工具 — 將舊有格式轉換為 ATR YAML',
      },
      {
        type: 'feature',
        text: 'Enterprise edition: 5-framework compliance auto-mapping (NIST AI RMF, OWASP, MITRE ATLAS, EU AI Act, ISO/IEC 42001)',
        textZh:
          'Enterprise 版:5 大合規框架自動對應(NIST AI RMF、OWASP、MITRE ATLAS、EU AI Act、ISO/IEC 42001)',
      },
      {
        type: 'improvement',
        text: 'Crystallization pipeline — Threat Cloud findings auto-promote to ATR rule candidates with LLM review',
        textZh: '結晶 Pipeline — Threat Cloud 偵測結果透過 LLM 審閱自動晉升為 ATR 規則候選',
      },
      {
        type: 'security',
        text: 'Guard SIGHUP + fsnotify live rule reload — zero-downtime rule updates without restart',
        textZh: 'Guard SIGHUP + fsnotify 即時規則重載 — 規則更新無需重啟即可生效',
      },
    ],
  },
  {
    version: '1.4.13',
    date: '2026-04-22',
    title: 'LTS Milestone · Pricing v4 Locked',
    titleZh: 'LTS 里程碑 · Pricing v4 定案',
    description:
      'Stable LTS milestone. Pricing v4 architecture locked: Community free + unlimited, Pilot $25K/90d, Enterprise $150-500K. AI Compliance Audit Evidence module added (pga report PDF export with SHA-256 integrity hash + HMAC signing).',
    descriptionZh:
      '穩定 LTS 里程碑版本。Pricing v4 架構正式定案:Community 永久免費無使用上限、Pilot $25K/90 天、Enterprise $150-500K。新增 AI 合規稽核證據模組(pga report PDF 匯出含 SHA-256 完整性雜湊與 HMAC 簽章)。',
    changes: [
      {
        type: 'feature',
        text: 'AI Compliance Audit Evidence generator (pga report) — PDF export with SHA-256 integrity hash and HMAC signing',
        textZh: 'AI 合規稽核證據產生器(pga report)— PDF 匯出附帶 SHA-256 完整性雜湊與 HMAC 簽章',
      },
      {
        type: 'feature',
        text: 'Pricing v4 architecture — Community unlimited free tier + Pilot ($25K/90d) + Enterprise tier with ATR governance',
        textZh:
          'Pricing v4 架構 — Community 免費無上限 + Pilot ($25K/90 天) + Enterprise(含 ATR governance)',
      },
      {
        type: 'improvement',
        text: 'Customer dashboard + CLI auth + compliance reports — Phase 2 enterprise plumbing shipped',
        textZh: '客戶 dashboard + CLI 驗證 + 合規報告 — Phase 2 企業端基礎建設上線',
      },
      {
        type: 'improvement',
        text: 'TC payload fingerprint dedup + Haiku drafter — approximately 99% LLM cost reduction on Threat Cloud',
        textZh: 'TC payload 指紋去重 + Haiku 規則草稿生成 — Threat Cloud LLM 成本降低約 99%',
      },
      {
        type: 'fix',
        text: 'Scan: TC_API_KEY now passes through to ATR subprocess via env var (was being dropped silently)',
        textZh: 'Scan:TC_API_KEY 現透過環境變數傳遞至 ATR 子程序(先前會被靜默忽略)',
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-04-08',
    title: 'ATR v2.0.x · 113 Detection Rules · 9 Categories',
    titleZh: 'ATR v2.0.x · 113 條偵測規則 · 9 大類別',
    description:
      'ATR upgraded to v2.0.x with 113 detection rules across 9 threat categories. MCP benchmark: 62.7% recall / 99.7% precision on PINT 850-sample adversarial corpus. SKILL.md benchmark: 96.9% recall / 100% precision / 0% FP on real-world skill corpus. (v2.0.x-era corpus measurement; superseded by lane-based FP reporting — see /research/benchmarks)',
    descriptionZh:
      'ATR 升級至 v2.0.x,共 113 條偵測規則涵蓋 9 大威脅類別。MCP 基準測試:PINT 850 樣本對抗語料庫上 62.7% recall / 99.7% precision。SKILL.md 基準測試:真實技能語料庫上 96.9% recall / 100% precision / 0% 誤報率。(此為 v2.0.x 時代語料庫量測;誤報數據已由 lane 化報告取代 — 見 /research/benchmarks)',
    changes: [
      {
        type: 'feature',
        text: 'ATR v2.0.x rule pack: 113 rules across prompt injection, agent manipulation, skill compromise, context exfiltration, tool poisoning, privilege escalation, model abuse, excessive autonomy, data poisoning',
        textZh:
          'ATR v2.0.x 規則包:113 條規則,涵蓋 prompt injection、agent manipulation、skill compromise、context exfiltration、tool poisoning、privilege escalation、model abuse、excessive autonomy、data poisoning',
      },
      {
        type: 'feature',
        text: '7-layer security architecture context panel — homepage cards link to per-layer detail pages',
        textZh: '7 層資安架構說明面板 — 首頁卡片連結至各層詳細頁面',
      },
      {
        type: 'feature',
        text: 'Auto-provision Threat Cloud sensor on pga up — zero-config Guard-to-TC connection',
        textZh: 'pga up 自動建立 Threat Cloud sensor — Guard 對 TC 連線零設定',
      },
      {
        type: 'improvement',
        text: 'Honest 5-of-7 layer coverage messaging — L1 Discover and L7 Govern marked Coming Soon (Q2/Q3 2026)',
        textZh:
          '誠實標示 5/7 層架構覆蓋率 — L1 Discover 與 L7 Govern 標示為 Coming Soon(Q2/Q3 2026)',
      },
      {
        type: 'improvement',
        text: 'OWASP Agentic Top 10 mapping: 10/10 categories covered with 77 rule mappings',
        textZh: 'OWASP Agentic Top 10 對應:10/10 類別全覆蓋,共 77 條規則對應',
      },
      {
        type: 'security',
        text: 'TC drafter writes partner name into rule author line — provenance preserved across external red-team submissions',
        textZh: 'TC 草稿器將合作夥伴名稱寫入規則 author 欄位 — 外部 red-team 提交的來源得以保留',
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-03-22',
    title: 'Auto-Block & Auto-Guard',
    titleZh: '自動封鎖與自動守護',
    description:
      'CRITICAL skills are now auto-blocked on install. Guard auto-starts after setup. Ecosystem scan pipeline scanned 2,386 MCP skills.',
    descriptionZh:
      'CRITICAL 等級的技能在安裝時自動封鎖。Guard 守護程序在 setup 後自動啟動。生態系掃描 pipeline 已掃描 2,386 個 MCP 技能。',
    changes: [
      {
        type: 'feature',
        text: 'Auto-block: CRITICAL skills blocked immediately on detection',
        textZh: '自動封鎖:CRITICAL 等級技能偵測到即立即封鎖',
      },
      {
        type: 'feature',
        text: 'Auto-guard: Guard daemon starts automatically after panguard setup',
        textZh: '自動守護:panguard setup 完成後 Guard daemon 自動啟動',
      },
      {
        type: 'feature',
        text: 'Ecosystem scan pipeline: crawled 4,648 registry entries, scanned 2,386 npm packages',
        textZh: '生態系掃描 pipeline:爬取 4,648 個 registry 項目,掃描 2,386 個 npm 套件',
      },
      {
        type: 'feature',
        text: 'ATR eval framework with PINT benchmark for detection effectiveness',
        textZh: 'ATR eval 框架配合 PINT 基準測試,衡量偵測有效性',
      },
      {
        type: 'feature',
        text: 'OpenClaw, WorkBuddy, NemoClaw, ArkClaw native integration',
        textZh: 'OpenClaw、WorkBuddy、NemoClaw、ArkClaw 原生整合',
      },
      {
        type: 'improvement',
        text: 'Threat Cloud live metrics API (/api/metrics)',
        textZh: 'Threat Cloud 即時數據 API(/api/metrics)',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-20',
    title: 'ATR-Only Detection & Sigma/YARA Removal',
    titleZh: '專注 ATR 偵測 · 移除 Sigma/YARA',
    description:
      'Focused detection on ATR (Agent Threat Rules) only. Removed legacy Sigma and YARA rule engines. 61 ATR rules across 9 threat categories.',
    descriptionZh:
      '偵測收斂至 ATR(Agent Threat Rules)單一引擎。移除過時的 Sigma 與 YARA 規則引擎。9 大威脅類別共 61 條 ATR 規則。',
    changes: [
      {
        type: 'feature',
        text: 'ATR-only detection pipeline — purpose-built for AI agent threats',
        textZh: 'ATR 單一偵測 pipeline — 專為 AI agent 威脅而設計',
      },
      {
        type: 'improvement',
        text: 'Removed Sigma and YARA rule engines (legacy, not AI-specific)',
        textZh: '移除 Sigma 與 YARA 規則引擎(已過時,非為 AI 設計)',
      },
      {
        type: 'improvement',
        text: '61 ATR rules with 474 detection patterns across 9 categories',
        textZh: '9 大類別共 61 條 ATR 規則,474 條偵測 pattern',
      },
      {
        type: 'improvement',
        text: 'Threat intel pipeline auto-crawling 11 sources hourly',
        textZh: 'Threat intel pipeline 每小時自動爬取 11 個來源',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-19',
    title: 'Unified v1.0.0 Release',
    titleZh: '統一 v1.0.0 正式發行',
    description:
      'Unified version across all packages. First stable release with Skill Auditor, Guard, Scan, Threat Cloud, and MCP server.',
    descriptionZh:
      '所有套件版本統一。首個穩定版本,含 Skill Auditor、Guard、Scan、Threat Cloud 與 MCP server。',
    changes: [
      {
        type: 'feature',
        text: 'Unified version: all packages aligned to v1.0.0',
        textZh: '版本統一:所有套件版本對齊 v1.0.0',
      },
      {
        type: 'feature',
        text: 'Panguard Skill Auditor: 8-check security audit for MCP skills',
        textZh: 'Panguard Skill Auditor:MCP 技能 8 項安全檢核',
      },
      {
        type: 'feature',
        text: 'MCP server with 11 tools for AI-assisted security operations',
        textZh: 'MCP server 內建 11 項工具,支援 AI 輔助資安操作',
      },
      {
        type: 'feature',
        text: 'panguard.ai website with web scanner and bilingual support (EN + zh-TW)',
        textZh: 'panguard.ai 網站,具備網頁掃描器與雙語支援(EN + zh-TW)',
      },
      {
        type: 'feature',
        text: 'Threat Cloud with community consensus (3+ reports + LLM review)',
        textZh: 'Threat Cloud 社群共識機制(3 份以上回報 + LLM 審閱)',
      },
      {
        type: 'security',
        text: 'Web scanner SSRF protection with private IP blocklist',
        textZh: '網頁掃描器 SSRF 防護,內含私有 IP 黑名單',
      },
    ],
  },
];
