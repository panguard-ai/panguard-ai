'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { STATS } from '@/lib/stats';

// Business-model section. Copy locked 2026-06-14 (recast for present-continuous, industry-scale,
// non-self-congratulatory tone per founder critique). The company appears as the implementation the
// market reaches for, not the hero of an origin story. Inline EN/ZH (matches PricingPreview pattern).
// Adopter list = verified MERGED only (Microsoft, Cisco, MISP). NVIDIA garak PR is still open, so it
// is NOT claimed as an adopter here — shown elsewhere as "PR open" to respect self-publication != adoption.
//
// "Why now" timeline added 2026-06-16 (narrative doctrine: panguard-narrative-doctrine.md). The speed
// gap is the load-bearing argument: LLMs upgrade faster than defenses can; old rule-writing is slow;
// ATR mass-produces rules through several fast paths; the install base is the engine that closes the
// gap. Numbers stay dynamic via STATS — never hardcode a rule count (it drifts across sources).

type WhyNowBeat = {
  readonly k: string;
  readonly head: string;
  readonly body: string;
};

type FlywheelCopy = {
  readonly whyNowOverline: string;
  readonly whyNowTitle: string;
  readonly whyNowBeats: readonly WhyNowBeat[];
  readonly overline: string;
  readonly title: string;
  readonly intro: string;
  readonly steps: readonly { readonly n: string; readonly title: string; readonly body: string }[];
  readonly tierIntro: string;
};

const EN: FlywheelCopy = {
  whyNowOverline: 'WHY NOW',
  whyNowTitle: 'Models keep getting faster. Detection has to keep up.',
  whyNowBeats: [
    {
      k: 'gap',
      head: 'LLMs upgrade faster than defenses can',
      body: 'Every model release opens new ways to jailbreak, exfiltrate, and hijack an agent. The attack surface moves on the model vendors’ release cadence, not yours.',
    },
    {
      k: 'slow',
      head: 'Hand-written rules are too slow',
      body: 'The old path — a committee drafts a rule, debates it for weeks, ships it — cannot match that pace. By the time a rule lands, the attack has three new variants.',
    },
    {
      k: 'fast',
      head: 'ATR mass-produces rules through fast paths',
      body: `New CVEs, red-team PoCs, the Sigma/YARA converter, and the community flywheel all feed the same open rule base. A new rule promotes roughly every ${STATS.promotionIntervalMinutes} minutes, and the base grows daily.`,
    },
    {
      k: 'flywheel',
      head: 'More installs close the gap faster',
      body: 'Every install is a sensor. A first sighting on one machine becomes a drafted rule, reaches community consensus, and protects the whole network. The more people run it, the faster detection catches up to model speed.',
    },
  ],
  overline: 'BUSINESS MODEL',
  title: 'The shape the agent-security market is taking',
  intro:
    'As agents move into the regulated economy, the world needs two things at once: an open language everyone can detect threats in, and signed proof that you actually did. The first is spreading for free. The second is what regulated buyers now require.',
  steps: [
    {
      n: '01',
      title: 'The standard is spreading',
      body: 'New agent attacks surface in the wild and become open ATR rules — MIT-licensed, growing roughly twice a day. Already adopted by Microsoft, Cisco and MISP. The wider the agent world adopts it, the more it becomes the default way to describe an agent threat.',
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
  whyNowOverline: '為什麼是現在',
  whyNowTitle: '模型一直變快，偵測就得跟上。',
  whyNowBeats: [
    {
      k: 'gap',
      head: 'LLM 升級的速度，比防禦能補的速度快',
      body: '每一次模型改版，都多出新的越獄、外洩、劫持 agent 的路。攻擊面跟著模型廠商的發版節奏走，不是跟著你走。',
    },
    {
      k: 'slow',
      head: '手寫規則太慢',
      body: '舊做法——委員會起草一條規則、爭論幾週、才上線——追不上這個節奏。等規則上線，攻擊已經多出三個變體。',
    },
    {
      k: 'fast',
      head: 'ATR 用多條快路量產規則',
      body: `新 CVE、紅隊 PoC、Sigma/YARA 轉換器、社群飛輪——全都流進同一套開放規則庫。大約每 ${STATS.promotionIntervalMinutes} 分鐘晉升一條新規則，規則庫每天增長。`,
    },
    {
      k: 'flywheel',
      head: '裝的人越多，缺口補得越快',
      body: '每一次安裝都是一個 sensor。某一台機器上的第一次捕獲，會被草擬成規則、取得社群共識、保護整個網路。用的人越多，偵測追上模型速度的速度就越快。',
    },
  ],
  overline: '商業模式',
  title: 'agent 資安市場正在長成的形狀',
  intro:
    '當 agent 走進受監管的經濟體，世界同時需要兩件事：一套人人都能用來偵測威脅的開放語言，以及一份你真的做到了的簽署證據。前者正在免費擴散，後者則是受監管的買家現在非要不可的東西。',
  steps: [
    {
      n: '01',
      title: '標準正在擴散',
      body: '新的 agent 攻擊在野外冒出，變成開放的 ATR 規則——MIT 授權，大約每天兩條地長。已被 Microsoft、Cisco、MISP 採用。agent 世界採用得越廣，它就越成為描述 agent 威脅的預設方式。',
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
      {/* Why now: the speed gap and how the flywheel closes it */}
      <SectionTitle overline={c.whyNowOverline} title={c.whyNowTitle} />

      <div className="max-w-6xl mx-auto mt-12">
        <ol className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
          {c.whyNowBeats.map((beat, i) => (
            <FadeInUp key={beat.k} delay={i * 0.08}>
              <li className="relative h-full bg-surface-2 p-6">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-sage/80 tabular-nums">
                  {`0${i + 1}`}
                </span>
                <h3 className="mt-3 text-base font-bold leading-snug text-text-primary">
                  {beat.head}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-text-secondary">{beat.body}</p>
                {i < c.whyNowBeats.length - 1 ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 text-brand-sage/70 lg:block"
                  >
                    &rarr;
                  </span>
                ) : null}
              </li>
            </FadeInUp>
          ))}
        </ol>
      </div>

      <div className="mt-20 sm:mt-28">
        <SectionTitle overline={c.overline} title={c.title} subtitle={c.intro} />
      </div>

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
