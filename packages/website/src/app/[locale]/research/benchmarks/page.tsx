import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import JsonLdBreadcrumb from '@/components/seo/JsonLdBreadcrumb';
import { Link } from '@/navigation';
import { ExternalLink } from 'lucide-react';
import { STATS } from '@/lib/stats';
import { datasetSchema, techArticleSchema } from '@/lib/schema';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const isZh = params.locale === 'zh-TW';
  return {
    title: isZh
      ? 'ATR Benchmark 結果 — Garak, SKILL.md, PINT, Wild Scan'
      : 'ATR Benchmark Results — Garak, SKILL.md, PINT, Wild Scan',
    description: isZh
      ? '419 條 ATR 規則在公開對抗式語料庫上的實測結果。Garak 97.1% recall, SKILL.md 100% recall + 97% precision, PINT 62.5% recall, Wild Scan 67,799 個 skill 中 1,096 個確認惡意。可重現方法、原始資料、Zenodo DOI。'
      : 'Public benchmark results for 419 ATR rules against adversarial corpora. Garak 97.1% recall, SKILL.md 100% recall + 97% precision, PINT 62.5% recall, Wild Scan 1,096 confirmed malicious of 67,799 skills. Reproducible methodology, raw data, Zenodo DOI.',
    alternates: buildAlternates('/research/benchmarks', params.locale),
  };
}

interface Benchmark {
  slug: string;
  name: string;
  description: string;
  zhDescription: string;
  date: string;
  source: { label: string; url: string };
  results: Array<{ label: string; value: string }>;
  reproduce: string;
  externalLink?: string;
  doi?: string;
  recordCount?: number;
}

const BENCHMARKS: Benchmark[] = [
  {
    slug: 'garak',
    name: 'Garak (NVIDIA jailbreak corpus)',
    description:
      'NVIDIA garak is the leading open-source LLM red-teaming framework. We ran ATR v2.1.2 against the full garak corpus to measure adversarial-prompt detection.',
    zhDescription:
      'NVIDIA garak 是業界領先的開源 LLM red-teaming 框架。我們用 ATR v2.1.2 對 garak 完整語料庫做對抗式 prompt 偵測測試。',
    date: '2026-04-22',
    source: { label: 'github.com/NVIDIA/garak', url: 'https://github.com/NVIDIA/garak' },
    results: [
      { label: 'Recall', value: `${STATS.benchmark.garak.recall}%` },
      { label: 'Sample size', value: `${STATS.benchmark.garak.samples} samples` },
      { label: 'Layer', value: 'Regex only (no LLM second opinion)' },
      { label: 'ATR version', value: 'v2.1.2' },
    ],
    reproduce: 'pnpm bench:garak (in agent-threat-rules repo)',
    externalLink: 'https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/benchmarks/garak.md',
    recordCount: STATS.benchmark.garak.samples,
  },
  {
    slug: 'skill-md',
    name: 'SKILL.md (PanGuard wild corpus)',
    description:
      'Manually labeled corpus of 498 AI agent skills from ClawHub, OpenClaw, and Skills.sh. Half malicious, half benign. Used to validate that ATR catches threats without false-positive bloat.',
    zhDescription:
      'ClawHub、OpenClaw、Skills.sh 的 AI agent skill,498 個樣本,人工標記。一半惡意,一半合法。用來驗證 ATR 抓得到威脅而不會誤報過多。',
    date: '2026-04-22',
    source: { label: 'PanGuard Wild Scan dataset', url: 'https://panguard.ai/research/96k-scan' },
    results: [
      { label: 'Recall', value: `${STATS.benchmark.skill.recall}%` },
      { label: 'Precision', value: `${STATS.benchmark.skill.precision}%` },
      { label: 'False positive rate', value: `${STATS.benchmark.skill.fp}%` },
      { label: 'Sample size', value: `${STATS.benchmark.skill.samples} samples` },
    ],
    reproduce: 'pnpm bench:skill (in agent-threat-rules repo)',
    externalLink: 'https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/benchmarks/skill.md',
    recordCount: STATS.benchmark.skill.samples,
  },
  {
    slug: 'pint',
    name: 'PINT (Invariant Labs adversarial corpus)',
    description:
      'Invariant Labs published an adversarial prompt corpus for prompt-injection detection benchmarking. Lower recall than Garak/SKILL.md reflects the corpus being designed for SIEM-style detection patterns — Sigma migration via PanGuard Migrator closes the gap.',
    zhDescription:
      'Invariant Labs 公開了 prompt-injection 偵測 benchmark 用的對抗式 prompt 語料庫。比 Garak/SKILL.md 召回率低,因為語料庫是針對 SIEM 風格的偵測模式設計——PanGuard Migrator 的 Sigma 轉換能補上這個缺口。',
    date: '2026-04-22',
    source: {
      label: 'github.com/invariantlabs-ai/invariant',
      url: 'https://github.com/invariantlabs-ai/invariant',
    },
    results: [
      { label: 'Recall', value: `${STATS.benchmark.pint.recall}%` },
      { label: 'Precision', value: `${STATS.benchmark.pint.precision}%` },
      { label: 'Sample size', value: `${STATS.benchmark.pint.samples} samples` },
      { label: 'Layer', value: 'Regex only' },
    ],
    reproduce: 'pnpm bench:pint (in agent-threat-rules repo)',
    externalLink: 'https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/benchmarks/pint.md',
    recordCount: STATS.benchmark.pint.samples,
  },
  {
    slug: 'wild-scan',
    name: 'Wild Scan (full ecosystem audit)',
    description:
      'Live audit of every AI agent skill we could crawl across ClawHub, OpenClaw, Skills.sh. Not a curated benchmark — actual production skills shipped by real authors. Result: 1.6% of scanned skills are confirmed malicious.',
    zhDescription:
      '對 ClawHub、OpenClaw、Skills.sh 上每一個能爬到的 AI agent skill 做實測。不是策展過的 benchmark——是真實作者上架的生產級 skill。結果:被掃描的 skill 中 1.6% 確認惡意。',
    date: '2026-04-14',
    source: {
      label: 'PanGuard Wild Scan Report',
      url: 'https://panguard.ai/research/96k-scan',
    },
    results: [
      { label: 'Entries crawled', value: STATS.ecosystem.entriesCrawled.toLocaleString() },
      { label: 'Skills scanned', value: STATS.ecosystem.skillsScanned.toLocaleString() },
      { label: 'Confirmed malicious', value: STATS.ecosystem.blacklistedSkills.toLocaleString() },
      { label: 'Triple-threat packages', value: STATS.ecosystem.tripleThreat.toString() },
    ],
    reproduce: 'scripts/wild-scan.ts (in panguard-ai monorepo)',
    doi: '10.5281/zenodo.19178002',
    recordCount: STATS.ecosystem.entriesCrawled,
  },
  {
    slug: 'hackaprompt',
    name: 'HackAPrompt cluster mining',
    description:
      'Engineering write-up from 2026-05-11. Baseline ATR v2.1.2 vs HackAPrompt 600K-corpus 5K deterministic sample. Result: 29.5% recall, 0 new false positives. The number is below closed-source ML detectors. Methodology and rule additions documented in the public engineering blog.',
    zhDescription:
      '2026-05-11 的工程紀錄。Baseline ATR v2.1.2 對 HackAPrompt 600K 語料庫的 5K 確定性樣本。結果:29.5% recall,0 個新誤報。數字低於閉源 ML 偵測器。方法論與規則更新公開於工程部落格。',
    date: '2026-05-11',
    source: {
      label: 'HackAPrompt corpus',
      url: 'https://huggingface.co/datasets/hackaprompt/hackaprompt-dataset',
    },
    results: [
      { label: 'HackAPrompt recall', value: '29.5%' },
      { label: 'Baseline recall', value: '16.0%' },
      { label: 'Sample size', value: '5,000 deterministic' },
      { label: 'New FPs introduced', value: '0' },
    ],
    reproduce: 'pnpm bench:hackaprompt',
    externalLink: 'https://panguard.ai/blog/hackaprompt-cluster-mining-29-percent-recall',
  },
];

export default async function BenchmarkHubPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const isZh = params.locale === 'zh-TW';

  const hubArticleSchema = techArticleSchema({
    headline: isZh
      ? 'ATR Benchmark 結果 — Garak, SKILL.md, PINT, Wild Scan'
      : 'ATR Benchmark Results — Garak, SKILL.md, PINT, Wild Scan',
    description: isZh
      ? '419 條 ATR 規則對抗式語料庫實測'
      : 'Public benchmark results for 419 ATR rules against adversarial corpora.',
    url: 'https://panguard.ai/research/benchmarks',
    datePublished: '2026-05-12',
    dateModified: '2026-05-12',
    proficiencyLevel: 'Expert',
  });

  const datasetSchemas = BENCHMARKS.map((b) =>
    datasetSchema({
      name: b.name,
      description: b.description,
      url: `https://panguard.ai/research/benchmarks#${b.slug}`,
      datePublished: b.date,
      ...(b.recordCount ? { recordCount: b.recordCount } : {}),
      ...(b.doi ? { doi: b.doi } : {}),
    }),
  );

  return (
    <>
      <JsonLd data={[hubArticleSchema, ...datasetSchemas]} />
      <JsonLdBreadcrumb
        items={[
          { name: isZh ? '研究' : 'Research', href: '/research' },
          { name: isZh ? 'Benchmark' : 'Benchmarks' },
        ]}
      />
      <NavBar />
      <main id="main-content" className="min-h-screen bg-surface-0">
        <section className="pt-24 pb-12 px-5 sm:px-6">
          <div className="max-w-[920px] mx-auto">
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {isZh ? 'BENCHMARK 結果' : 'BENCHMARK RESULTS'}
            </p>
            <h1 className="text-[clamp(28px,5vw,52px)] font-extrabold leading-[1.05] tracking-tight text-text-primary max-w-3xl">
              {isZh
                ? '419 條 ATR 規則的公開實測結果'
                : 'Public benchmark results for 419 ATR rules'}
            </h1>
            <p className="text-lg text-text-secondary mt-6 max-w-2xl leading-relaxed">
              {isZh
                ? '每一個 benchmark 都附上原始資料來源、可重現的方法論、以及執行的 ATR 版本。沒有 cherry-picking。'
                : 'Every benchmark below includes the raw data source, reproducible methodology, and ATR version that ran it. No cherry-picking.'}
            </p>
          </div>
        </section>

        <section className="pb-24 px-5 sm:px-6">
          <div className="max-w-[920px] mx-auto space-y-8">
            {BENCHMARKS.map((b) => (
              <section
                key={b.slug}
                id={b.slug}
                className="bg-surface-1 rounded-xl border border-border p-8"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-text-primary">{b.name}</h2>
                    <p className="text-xs text-text-muted mt-1">
                      <time dateTime={b.date}>{b.date}</time>
                    </p>
                  </div>
                  {b.doi && (
                    <a
                      href={`https://doi.org/${b.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono px-2 py-1 rounded bg-brand-sage/10 text-brand-sage border border-brand-sage/30"
                    >
                      DOI {b.doi}
                    </a>
                  )}
                </div>

                <p className="text-sm text-text-secondary leading-relaxed mb-6">
                  {isZh ? b.zhDescription : b.description}
                </p>

                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {b.results.map((r, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-border bg-surface-2"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                        {r.label}
                      </p>
                      <p className="text-base text-text-primary font-bold mt-1">{r.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <a
                    href={b.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-sage hover:underline"
                  >
                    {isZh ? '原始資料來源' : 'Source corpus'}: {b.source.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {b.externalLink && (
                    <a
                      href={b.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-brand-sage hover:underline"
                    >
                      {isZh ? '完整方法論' : 'Full methodology'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-surface-2 border border-border">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">
                    {isZh ? '重現指令' : 'Reproduce'}
                  </p>
                  <code className="text-xs font-mono text-text-primary">{b.reproduce}</code>
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="pb-24 px-5 sm:px-6">
          <div className="max-w-[920px] mx-auto p-8 rounded-xl border border-brand-sage/30 bg-brand-sage/5 text-center">
            <p className="text-sm text-text-secondary leading-relaxed max-w-xl mx-auto">
              {isZh
                ? '想要在你的語料庫上跑 ATR 並公開結果？歡迎發 PR 到 '
                : 'Want to run ATR on your corpus and publish the results? Open a PR at '}
              <a
                href="https://github.com/Agent-Threat-Rule/agent-threat-rules"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-sage hover:underline font-semibold"
              >
                Agent-Threat-Rule/agent-threat-rules
              </a>
              {isZh
                ? '。我們把你的 benchmark 加入本頁,完整署名。'
                : '. We add your benchmark to this page with full attribution.'}
            </p>
            <p className="text-xs text-text-muted mt-4 italic">
              {isZh ? '審稿:' : 'Reviewed by '}
              <Link href="/about" rel="author" className="text-brand-sage hover:underline">
                Adam Lin
              </Link>
              {' · '}
              <span>
                {isZh ? '最後審查 2026-05-12' : 'Last reviewed 2026-05-12'}
              </span>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
