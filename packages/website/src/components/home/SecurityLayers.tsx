'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';

const LAYERS_EN = [
  { id: 1, name: 'Discover', desc: 'Central AI agent inventory', status: '🟡' },
  { id: 2, name: 'Audit', desc: 'Pre-deploy skill & MCP scanning (ATR rules)', status: '🟢' },
  { id: 3, name: 'Protect', desc: 'Runtime prompt/tool/output defense', status: '🟢' },
  { id: 4, name: 'Detect', desc: 'Behavioral anomaly detection', status: '🟢' },
  { id: 5, name: 'Deceive', desc: 'Honeypot traps for attacker profiling', status: '🟢' },
  { id: 6, name: 'Respond', desc: 'Auto-block, alert, playbook execution', status: '🟢' },
  { id: 7, name: 'Govern', desc: 'AIAM + compliance reporting', status: '🟡' },
];

const LAYERS_ZH = [
  { id: 1, name: '探索', desc: 'AI agent 中央資產清單', status: '🟡' },
  { id: 2, name: '稽核', desc: '部署前技能與 MCP 掃描（ATR 規則）', status: '🟢' },
  { id: 3, name: '防護', desc: 'Runtime prompt / tool / output 防禦', status: '🟢' },
  { id: 4, name: '偵測', desc: '行為異常偵測', status: '🟢' },
  { id: 5, name: '誘捕', desc: 'Honeypot 蜜罐收集攻擊樣本', status: '🟢' },
  { id: 6, name: '反應', desc: '自動阻斷、告警、劇本執行', status: '🟢' },
  { id: 7, name: '治理', desc: 'AIAM + 合規報告', status: '🟡' },
];

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
            ? '從 Discover 到 Govern 的 7 層堆疊。PanGuard 今天覆蓋 5 層(L2-L6),L1 Discover 2026 Q2 上線,L7 Govern 2026 Q3 上線。誠實標 gap，不假打勾。'
            : 'A 7-layer stack from Discover to Govern. PanGuard ships 5 layers today (L2-L6). L1 Discover lands Q2 2026, L7 Govern Q3 2026. No fake checkmarks — gaps are marked openly.'
        }
      />
      <div className="max-w-4xl mx-auto mt-14">
        <div className="space-y-3">
          {layers.map((layer, i) => (
            <FadeInUp key={layer.id} delay={i * 0.05}>
              <div className="bg-surface-2 rounded-lg border border-border p-4 flex items-center justify-between hover:border-brand-sage/50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-3xl font-extrabold text-text-muted w-12 text-center">
                    {layer.id}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{layer.name}</p>
                    <p className="text-xs text-text-muted mt-1">{layer.desc}</p>
                  </div>
                </div>
                <div className="text-xl shrink-0">{layer.status}</div>
              </div>
            </FadeInUp>
          ))}
        </div>
        <FadeInUp delay={0.4}>
          <div className="mt-8 p-4 bg-brand-sage/5 rounded-lg border border-brand-sage/20">
            <p className="text-xs text-text-muted text-center">
              {isZh
                ? '🟢 已實作 · 🟡 Gap（Phase 2/5 規劃中）'
                : '🟢 Shipped · 🟡 Gap (Phase 2/5 roadmap)'}
            </p>
          </div>
        </FadeInUp>
      </div>
    </SectionWrapper>
  );
}
