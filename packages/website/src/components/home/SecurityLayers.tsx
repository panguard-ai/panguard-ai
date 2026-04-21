'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';

type LayerStatus = 'shipped' | 'partial' | 'gap';

interface LayerCopy {
  id: number;
  name: string;
  tagline: string;
  why: string;
  proof: string;
  status: LayerStatus;
}

const LAYERS_EN: readonly LayerCopy[] = [
  {
    id: 1,
    name: 'Discover',
    tagline: 'Central inventory of every agent, skill, MCP tool',
    why: 'You cannot protect what you cannot count. F500 CISOs ask: how many agents are running in our org right now?',
    proof: 'Q2 2026 — inventory dashboard + pga inventory CLI',
    status: 'gap',
  },
  {
    id: 2,
    name: 'Audit',
    tagline: 'Pre-deploy scanning of skills, MCP configs, npm packages',
    why: 'One malicious skill install = agent hijack. Scan before you trust the code an agent is about to run.',
    proof: '311 ATR rules · 97.1% Garak recall · 0.48% FP on 3,115 wild samples',
    status: 'shipped',
  },
  {
    id: 3,
    name: 'Protect',
    tagline: 'Runtime prompt / tool / output defense',
    why: 'Even audited skills can be prompt-injected at runtime. Guard daemon intercepts at the MCP proxy layer.',
    proof: '11 response actions · 50ms median latency · inline MCP proxy',
    status: 'shipped',
  },
  {
    id: 4,
    name: 'Detect',
    tagline: 'Behavioral anomaly detection with a 3-layer AI funnel',
    why: 'Rules catch 90% cheaply. The other 10% need AI — but not for every request (cost + latency explode).',
    proof: 'Rules (50ms) → local AI (~2s) → cloud AI (~5s), 90/7/3 traffic split',
    status: 'shipped',
  },
  {
    id: 5,
    name: 'Deceive',
    tagline: 'Honeypot integrated in Guard daemon',
    why: 'Passive defense is half the story. Deploy decoy tools that attackers take — you learn their tactics without leaking real data.',
    proof:
      'trap-bridge.ts converts honeypot sessions into security events · no separate process to run',
    status: 'shipped',
  },
  {
    id: 6,
    name: 'Respond',
    tagline: 'Auto-block, alert, playbook execution',
    why: 'Detection without response is noise. Agent attacks move in seconds — the loop has to close without a human.',
    proof:
      'block_ip · kill_process · revoke_skill · notify + 7 more — all shipped in respond-agent.ts',
    status: 'shipped',
  },
  {
    id: 7,
    name: 'Govern',
    tagline: 'AIAM + 4-framework compliance reporting',
    why: 'EU AI Act enforces 2026-08. Colorado 2026-06. Auditors want per-rule mapping to frameworks, not just a "we scan" claim.',
    proof: 'Audit log live today. Compliance reports + AIAM arrive Q2/Q3 2026.',
    status: 'partial',
  },
];

const LAYERS_ZH: readonly LayerCopy[] = [
  {
    id: 1,
    name: '探索 Discover',
    tagline: '所有 agent、skill、MCP tool 的中央資產清單',
    why: '你沒辦法保護你數不到的東西。F500 CISO 會問:我們公司此刻跑多少 agent?',
    proof: '2026 Q2 上線 — inventory dashboard + pga inventory CLI',
    status: 'gap',
  },
  {
    id: 2,
    name: '稽核 Audit',
    tagline: '部署前掃描 skill、MCP config、npm 套件',
    why: '一個惡意 skill 安裝 = agent 被劫持。在 agent 執行那段程式碼前先掃過。',
    proof: '311 條 ATR 規則 · Garak 97.1% 召回 · 3,115 野外樣本 0.48% FP',
    status: 'shipped',
  },
  {
    id: 3,
    name: '防護 Protect',
    tagline: 'Runtime prompt / tool / output 防禦',
    why: '即便稽核過的 skill,runtime 仍可能被 prompt injection。Guard daemon 在 MCP proxy 層攔截。',
    proof: '11 種反應動作 · 中位 50ms 延遲 · inline MCP proxy',
    status: 'shipped',
  },
  {
    id: 4,
    name: '偵測 Detect',
    tagline: '3 層 AI 漏斗的行為異常偵測',
    why: '規則便宜抓 90%,剩下 10% 要 AI — 但不是每個 request 都 call AI(成本 + 延遲會爆)。',
    proof: '規則 (50ms) → 本地 AI (~2s) → 雲端 AI (~5s),90/7/3 流量分配',
    status: 'shipped',
  },
  {
    id: 5,
    name: '誘捕 Deceive',
    tagline: '蜜罐整合在 Guard daemon 內',
    why: '被動防禦只做一半。佈置誘餌工具讓攻擊者上鉤 — 你學到他們的戰術,不漏真實資料。',
    proof: 'trap-bridge.ts 把蜜罐 session 轉成 security event · 不用跑獨立 process',
    status: 'shipped',
  },
  {
    id: 6,
    name: '反應 Respond',
    tagline: '自動阻斷、告警、劇本執行',
    why: '偵測沒有反應就是噪音。Agent 攻擊是秒級,迴圈必須不需人就能關閉。',
    proof: 'block_ip · kill_process · revoke_skill · notify 等 11 種 — respond-agent.ts 都已 ship',
    status: 'shipped',
  },
  {
    id: 7,
    name: '治理 Govern',
    tagline: 'AIAM + 4 框架合規報告',
    why: 'EU AI Act 2026-08 強制執行。Colorado 2026-06。稽核員要的是每條規則對應到框架,不只是「我們有掃」。',
    proof: '稽核日誌今天已上線。合規報告 + AIAM 2026 Q2/Q3 上線。',
    status: 'partial',
  },
];

function StatusBadge({ status, isZh }: { status: LayerStatus; isZh: boolean }) {
  if (status === 'shipped') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-brand-sage bg-brand-sage/10 border border-brand-sage/30 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-sage" />
        {isZh ? '已出貨' : 'Shipped'}
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        {isZh ? '部分' : 'Partial'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-text-muted bg-surface-3 border border-border rounded-full px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
      {isZh ? '缺口' : 'Gap'}
    </span>
  );
}

export default function SecurityLayers() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';
  const layers = isZh ? LAYERS_ZH : LAYERS_EN;

  return (
    <SectionWrapper>
      <SectionTitle
        overline={isZh ? '7 層代理安全架構' : '7-LAYER AGENT SECURITY'}
        title={isZh ? 'AI agent 防禦不是單點產品' : 'Agent defense is not a single product'}
        subtitle={
          isZh
            ? '5 層今天已上線(L2 稽核 / L3 防護 / L4 偵測 / L5 誘捕 / L6 反應)。L1 探索 2026 Q2 補,L7 治理 Q2/Q3 補完。我們標 gap,不假打勾。'
            : '5 layers ship today (L2 Audit / L3 Protect / L4 Detect / L5 Deceive / L6 Respond). L1 Discover lands Q2 2026, L7 Govern Q2/Q3 2026. We mark the gaps openly — no fake checkmarks.'
        }
      />
      <div className="max-w-4xl mx-auto mt-14">
        <div className="space-y-3">
          {layers.map((layer, i) => (
            <FadeInUp key={layer.id} delay={i * 0.04}>
              <div
                className={`bg-surface-2 rounded-lg border p-5 transition-colors ${
                  layer.status === 'shipped'
                    ? 'border-border hover:border-brand-sage/50'
                    : layer.status === 'partial'
                      ? 'border-amber-400/20 hover:border-amber-400/40'
                      : 'border-border/50 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl font-extrabold text-text-muted w-10 text-center tabular-nums shrink-0">
                    {layer.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h3 className="text-base font-semibold text-text-primary">{layer.name}</h3>
                      <StatusBadge status={layer.status} isZh={isZh} />
                    </div>
                    <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                      {layer.tagline}
                    </p>
                    <p className="text-xs text-text-muted mt-2.5 leading-relaxed">{layer.why}</p>
                    <p className="text-[11px] font-mono text-brand-sage/80 mt-2.5 break-words">
                      {layer.proof}
                    </p>
                  </div>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
        <FadeInUp delay={0.5}>
          <div className="mt-8 p-4 bg-brand-sage/5 rounded-lg border border-brand-sage/20 text-center">
            <p className="text-xs text-text-secondary">
              {isZh ? (
                <>
                  每個 PanGuard 免費 Community 安裝都自動成為威脅雲感測器 ·{' '}
                  <code className="font-mono text-brand-sage">
                    npm install -g @panguard-ai/panguard
                  </code>{' '}
                  · 匿名遙測可隨時停用
                </>
              ) : (
                <>
                  Every free Community install auto-registers as a Threat Cloud sensor ·{' '}
                  <code className="font-mono text-brand-sage">
                    npm install -g @panguard-ai/panguard
                  </code>{' '}
                  · Anonymous telemetry is opt-out anytime
                </>
              )}
            </p>
          </div>
        </FadeInUp>
      </div>
    </SectionWrapper>
  );
}
