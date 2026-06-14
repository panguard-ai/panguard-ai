'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';

// Business-model section. Copy locked 2026-06-14 (recast for present-continuous, industry-scale,
// non-self-congratulatory tone per founder critique). The company appears as the implementation the
// market reaches for, not the hero of an origin story. Inline EN/ZH (matches PricingPreview pattern).
// NVIDIA framed as "adopted" (docs + plugin), not "merged" — verified against ecosystem ground truth.

type FlywheelCopy = {
  readonly overline: string;
  readonly title: string;
  readonly intro: string;
  readonly steps: readonly { readonly n: string; readonly title: string; readonly body: string }[];
  readonly tierIntro: string;
};

const EN: FlywheelCopy = {
  overline: 'BUSINESS MODEL',
  title: 'The shape the agent-security market is taking',
  intro:
    'As agents move into the regulated economy, the world needs two things at once: an open language everyone can detect threats in, and signed proof that you actually did. The first is spreading for free. The second is what regulated buyers now require.',
  steps: [
    {
      n: '01',
      title: 'The standard is spreading',
      body: 'New agent attacks surface in the wild and become open ATR rules — MIT-licensed, growing roughly twice a day. Already adopted by Microsoft, Cisco, NVIDIA and MISP. The wider the agent world adopts it, the more it becomes the default way to describe an agent threat.',
    },
    {
      n: '02',
      title: 'Detection is becoming an obligation',
      body: 'Audit pressure is mounting from every side — the EU Cyber Resilience Act, semiconductor SEMI E187, financial regulators. As agents move into regulated workflows, detecting a threat is no longer enough; you have to prove to an auditor that you did. That demand lands on everyone wiring agents into their stack.',
    },
    {
      n: '03',
      title: 'Proof is becoming the product',
      body: 'A free standard tells the world what good looks like; on its own it does not prove to a regulator that you did it. That is the gap the market now reaches into — PanGuard is the commercial reference implementation that turns ATR detection into signed, audit-ready evidence, with a live rule feed that updates as new attacks surface. The standard stays free and open.',
    },
  ],
  tierIntro: 'Run the open standard for free. Move up when an auditor asks for proof.',
};

const ZH: FlywheelCopy = {
  overline: '商業模式',
  title: 'agent 資安市場正在長成的形狀',
  intro:
    '當 agent 走進受監管的經濟體，世界同時需要兩件事：一套人人都能用來偵測威脅的開放語言，以及一份你真的做到了的簽署證據。前者正在免費擴散，後者則是受監管的買家現在非要不可的東西。',
  steps: [
    {
      n: '01',
      title: '標準正在擴散',
      body: '新的 agent 攻擊在野外冒出，變成開放的 ATR 規則——MIT 授權，大約每天兩條地長。已被 Microsoft、Cisco、NVIDIA、MISP 採用。agent 世界採用得越廣，它就越成為描述 agent 威脅的預設方式。',
    },
    {
      n: '02',
      title: '偵測正在變成義務',
      body: '稽核壓力正從每個方向升高——歐盟 Cyber Resilience Act、半導體 SEMI E187、金融監理機關。當 agent 進入受監管的流程，偵測到威脅已經不夠；你還得向稽核員證明你做到了。這股需求，落在每一個把 agent 接進系統的人身上。',
    },
    {
      n: '03',
      title: '證據正在成為產品',
      body: '免費標準告訴世界「合格長什麼樣」；但它本身沒辦法向監理機關證明你真的做到了。這正是市場現在伸手去補的缺口——PanGuard 是把 ATR 的偵測變成可簽署、可送稽核證據的商業參考實作，並附上隨新攻擊出現而更新的即時規則 feed。標準始終免費且開放。',
    },
  ],
  tierIntro: '免費跑這套開放標準。當稽核員開口要證據時，再往上走。',
};

export default function FlywheelModel() {
  const locale = useLocale();
  const c = locale === 'zh-TW' ? ZH : EN;

  return (
    <SectionWrapper dark>
      <SectionTitle overline={c.overline} title={c.title} subtitle={c.intro} />

      <div className="max-w-6xl mx-auto mt-14 grid gap-6 lg:grid-cols-3">
        {c.steps.map((step, i) => (
          <FadeInUp key={step.n} delay={i * 0.08}>
            <div className="h-full bg-surface-2 rounded-xl border border-border p-6 hover:border-brand-sage/50 transition-colors">
              <span className="text-3xl font-extrabold text-brand-sage/80 tabular-nums">
                {step.n}
              </span>
              <h3 className="mt-4 text-base font-bold text-text-primary leading-snug">
                {step.title}
              </h3>
              <p className="mt-3 text-sm text-text-secondary leading-relaxed">{step.body}</p>
            </div>
          </FadeInUp>
        ))}
      </div>

      <FadeInUp delay={0.3}>
        <p className="max-w-2xl mx-auto mt-12 text-center text-sm text-text-muted leading-relaxed">
          {c.tierIntro}
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
