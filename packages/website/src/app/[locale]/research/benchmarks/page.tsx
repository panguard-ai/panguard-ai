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
      ? `${STATS.totalRulesDisplay} 條 ATR 規則在公開對抗式語料庫上的實測結果。recall 為 hunt lane（預設）數字：garak 實戰越獄集 ${STATS.benchmark.garak.recall}%（部分 closed-book）、SKILL.md ${STATS.benchmark.skill.recall}%（樣本內）、自建 PINT 格式語料庫 ${STATS.benchmark.pint.recall}%。附可重現方法、原始資料與 Zenodo DOI。benign gate 誤報率已撤回，等待重新量測。`
      : `Public benchmark results for ${STATS.totalRulesDisplay} ATR rules against adversarial corpora. Recall figures are hunt-lane (the default): ${STATS.benchmark.garak.recall}% on garak's in-the-wild jailbreaks (partly closed-book), ${STATS.benchmark.skill.recall}% on SKILL.md (in-sample), ${STATS.benchmark.pint.recall}% on a self-built PINT-format corpus. Reproducible methodology, raw data, Zenodo DOI. Benign-gate false-positive rates are withdrawn pending re-measurement.`,
    alternates: buildAlternates('/research/benchmarks', params.locale),
  };
}

interface Benchmark {
  slug: string;
  name: string;
  zhName: string;
  description: string;
  zhDescription: string;
  date: string;
  source: { label: string; url: string };
  results: Array<{ label: string; zhLabel: string; value: string; zhValue?: string }>;
  reproduce: string;
  externalLink?: string;
  doi?: string;
  recordCount?: number;
}

const BENCHMARKS: Benchmark[] = [
  {
    slug: 'garak',
    name: 'Garak (NVIDIA jailbreak corpus)',
    zhName: 'Garak（NVIDIA 越獄語料庫）',
    description:
      'NVIDIA garak is an open-source LLM red-teaming framework. We ran ATR v4.1.5 against its in-the-wild jailbreak set. The figure is hunt-lane (the default, all rules); the enforce lane, used when blocking is on, catches far fewer. It is partly closed-book: some ATR rules were written from this corpus, so it is not an out-of-sample result.',
    zhDescription:
      'NVIDIA garak 是開源的 LLM red-teaming 框架。我們用 ATR v4.1.5 跑它的實戰越獄集。數字是 hunt lane（預設，載入全部規則）；開啟 blocking 時用的 enforce lane 抓到的少很多。這個數字部分是 closed-book：有些 ATR 規則就是從這份語料寫出來的，所以不是樣本外結果。',
    date: '2026-10-14',
    source: { label: 'github.com/NVIDIA/garak', url: 'https://github.com/NVIDIA/garak' },
    results: [
      { label: 'Recall', zhLabel: '召回率', value: `${STATS.benchmark.garak.recall}%` },
      {
        label: 'Sample size',
        zhLabel: '樣本數',
        value: `${STATS.benchmark.garak.samples} samples`,
        zhValue: `${STATS.benchmark.garak.samples} 個樣本`,
      },
      {
        label: 'Layer',
        zhLabel: '層級',
        value: 'Regex only (no LLM second opinion)',
        zhValue: '僅 Regex（無 LLM 二次判讀）',
      },
      { label: 'Lane', zhLabel: 'Lane', value: 'hunt (default)', zhValue: 'hunt（預設）' },
      { label: 'ATR version', zhLabel: 'ATR 版本', value: 'v4.1.5' },
    ],
    reproduce: 'pnpm bench:garak (in agent-threat-rules repo)',
    externalLink:
      'https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/benchmarks/garak.md',
    recordCount: STATS.benchmark.garak.samples,
  },
  {
    slug: 'skill-md',
    name: 'SKILL.md (PanGuard wild corpus)',
    zhName: 'SKILL.md（PanGuard 野外語料庫）',
    description:
      'Labeled corpus of 498 AI agent skills from ClawHub, OpenClaw, and Skills.sh: 32 malicious, 466 benign. The benign samples are also the set ATR rules are tuned against, so this is an in-sample check, and its precision and false-positive figures are not cited. Recall is hunt-lane.',
    zhDescription:
      'ClawHub、OpenClaw、Skills.sh 的 AI agent skill 共 498 個:32 個惡意、466 個良性。良性樣本同時是 ATR 規則調校用的那一組，所以這是樣本內檢查，precision 與誤報率不對外引用。recall 是 hunt lane 數字。',
    date: '2026-10-14',
    source: { label: 'PanGuard Wild Scan dataset', url: 'https://panguard.ai/research/96k-scan' },
    results: [
      {
        label: 'Recall (hunt lane, in-sample)',
        zhLabel: '召回率（hunt lane，樣本內）',
        value: `${STATS.benchmark.skill.recall}%`,
      },
      {
        label: 'Sample size',
        zhLabel: '樣本數',
        value: `${STATS.benchmark.skill.samples} samples`,
        zhValue: `${STATS.benchmark.skill.samples} 個樣本`,
      },
    ],
    reproduce: 'pnpm bench:skill (in agent-threat-rules repo)',
    externalLink:
      'https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/benchmarks/skill.md',
    recordCount: STATS.benchmark.skill.samples,
  },
  {
    slug: 'pint',
    name: 'PINT (self-built PINT-format corpus)',
    zhName: 'PINT（自建 PINT 格式語料庫）',
    description:
      'A self-built 850-sample corpus in PINT format, assembled from the deepset prompt-injections dataset plus Lakera Gandalf. This is NOT Lakera official PINT benchmark and is not attributable to any third party. Lower recall than Garak/SKILL.md reflects the corpus mixing in SIEM-style detection patterns — Sigma migration via PanGuard Migrator closes the gap.',
    zhDescription:
      '自建的 850 樣本 PINT 格式語料庫，由 deepset prompt-injections 資料集加上 Lakera Gandalf 組成。這不是 Lakera 官方 PINT benchmark，也不歸屬於任何第三方。比 Garak/SKILL.md 召回率低，因為語料庫混入了 SIEM 風格的偵測模式——PanGuard Migrator 的 Sigma 轉換能補上這個缺口。',
    date: '2026-04-22',
    source: {
      label: 'self-built corpus (deepset + Lakera Gandalf)',
      url: 'https://panguard.ai/research/benchmarks#pint',
    },
    results: [
      { label: 'Recall', zhLabel: '召回率', value: `${STATS.benchmark.pint.recall}%` },
      {
        label: 'Precision (PINT-format corpus, self-built)',
        zhLabel: '精確率（PINT 格式語料庫，自建）',
        value: `${STATS.benchmark.pint.precision}%`,
      },
      {
        label: 'Sample size',
        zhLabel: '樣本數',
        value: `${STATS.benchmark.pint.samples} samples`,
        zhValue: `${STATS.benchmark.pint.samples} 個樣本`,
      },
      {
        label: 'Layer',
        zhLabel: '層級',
        value: 'Layer 1 — regex only',
        zhValue: 'Layer 1 — 僅 regex',
      },
    ],
    reproduce: 'pnpm bench:pint (in agent-threat-rules repo)',
    externalLink:
      'https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/benchmarks/pint.md',
    recordCount: STATS.benchmark.pint.samples,
  },
  {
    slug: 'wild-scan',
    name: 'Wild Scan (full ecosystem audit)',
    zhName: 'Wild Scan（完整生態系稽核）',
    description:
      'Live audit of every AI agent skill we could crawl across ClawHub, OpenClaw, Skills.sh. Not a curated benchmark — actual production skills shipped by real authors. Result: 1,302 flagged out of 96,096 scanned, 552 confirmed malware after manual review.',
    zhDescription:
      '對 ClawHub、OpenClaw、Skills.sh 上每一個能爬到的 AI agent skill 做實測。不是策展過的 benchmark——是真實作者上架的生產級 skill。結果：96,096 個被掃描的 skill 中 1,302 個被標記，人工複審後 552 個確認為惡意程式。',
    date: '2026-04-14',
    source: {
      label: 'PanGuard Wild Scan Report',
      url: 'https://panguard.ai/research/96k-scan',
    },
    results: [
      {
        label: 'Skills scanned',
        zhLabel: '掃描 skill 數',
        value: STATS.wildScan.skillsScanned.toLocaleString(),
      },
      { label: 'Flagged', zhLabel: '被標記', value: STATS.wildScan.flagged.toLocaleString() },
      {
        label: 'Confirmed malware',
        zhLabel: '確認惡意',
        value: STATS.wildScan.confirmedMalware.toLocaleString(),
      },
      {
        label: 'Triple-threat packages',
        zhLabel: '三重威脅套件',
        value: STATS.ecosystem.tripleThreat.toString(),
      },
      {
        label: 'Postinstall scripts',
        zhLabel: 'Postinstall 腳本',
        value: STATS.ecosystem.postinstallScripts.toString(),
      },
    ],
    reproduce: 'scripts/wild-scan.ts (in panguard-ai monorepo)',
    doi: '10.5281/zenodo.19178002',
    recordCount: 96_096,
  },
  {
    slug: 'hackaprompt',
    name: 'HackAPrompt cluster mining',
    zhName: 'HackAPrompt 叢集探勘',
    description: `ATR run against the HackAPrompt EMNLP 2023 competition corpus (4,780 deterministic samples). Result: ${STATS.benchmark.hackaprompt.recall}% recall, 0 new false positives. The number is honest and below closed-source ML detector claims. Methodology and rule additions documented in the public engineering blog.`,
    zhDescription: `ATR 對 HackAPrompt EMNLP 2023 競賽語料庫（4,780 個確定性樣本）的實測。結果：${STATS.benchmark.hackaprompt.recall}% recall，0 個新誤報。數字誠實，低於閉源 ML 偵測器的宣稱。方法論與規則更新公開於工程部落格。`,
    date: '2026-05-11',
    source: {
      label: 'HackAPrompt corpus',
      url: 'https://huggingface.co/datasets/hackaprompt/hackaprompt-dataset',
    },
    results: [
      {
        label: 'HackAPrompt recall',
        zhLabel: 'HackAPrompt 召回率',
        value: `${STATS.benchmark.hackaprompt.recall}%`,
      },
      {
        label: 'Baseline recall',
        zhLabel: '基線召回率',
        value: `${STATS.benchmark.hackaprompt.baselineRecall}%`,
      },
      {
        label: 'Sample size',
        zhLabel: '樣本數',
        value: `${STATS.benchmark.hackaprompt.samples.toLocaleString()} deterministic`,
        zhValue: `${STATS.benchmark.hackaprompt.samples.toLocaleString()} 個確定性樣本`,
      },
      { label: 'New FPs introduced', zhLabel: '新增誤報', value: '0' },
    ],
    reproduce: 'pnpm bench:hackaprompt',
    externalLink: 'https://panguard.ai/blog/hackaprompt-cluster-mining',
  },
];

export default async function BenchmarkHubPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const isZh = params.locale === 'zh-TW';

  const hubArticleSchema = techArticleSchema({
    headline: isZh
      ? 'ATR Benchmark 結果 — Garak, SKILL.md, PINT, Wild Scan'
      : 'ATR Benchmark Results — Garak, SKILL.md, PINT, Wild Scan',
    description: isZh
      ? `${STATS.totalRulesDisplay} 條 ATR 規則對抗式語料庫實測`
      : `Public benchmark results for ${STATS.totalRulesDisplay} ATR rules against adversarial corpora.`,
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
    })
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
                ? `${STATS.totalRulesDisplay} 條 ATR 規則的公開實測結果`
                : `Public benchmark results for ${STATS.totalRulesDisplay} ATR rules`}
            </h1>
            <p className="text-lg text-text-secondary mt-6 max-w-2xl leading-relaxed">
              {isZh
                ? '每一個 benchmark 都附上原始資料來源、可重現的方法論、以及執行的 ATR 版本。沒有 cherry-picking。'
                : 'Every benchmark below includes the raw data source, reproducible methodology, and ATR version that ran it. No cherry-picking.'}
            </p>
            <p className="text-sm text-text-muted mt-4 max-w-2xl leading-relaxed">
              {isZh
                ? `所有 precision / FP 數字皆為單一語料庫的 Layer 1 量測，不是全引擎宣稱。recall 都是 hunt lane（預設）數字。我們以前引用的分 lane benign gate 誤報率已於 2026-09-19 撤回，等待重新量測；沒有單一的全引擎 FP 數字。`
                : `All precision / FP figures are per-corpus Layer 1 measurements, not engine-wide claims. Recall figures are hunt-lane (the default). The lane-based benign-gate false-positive rates we used to quote were withdrawn on 2026-09-19 pending re-measurement; there is no single engine-wide FP number.`}
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
                    <h2 className="text-xl font-bold text-text-primary">
                      {isZh ? b.zhName : b.name}
                    </h2>
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

                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  {b.results.map((r, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-surface-2">
                      <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                        {isZh ? r.zhLabel : r.label}
                      </p>
                      <p className="text-base text-text-primary font-bold mt-1">
                        {isZh && r.zhValue ? r.zhValue : r.value}
                      </p>
                    </div>
                  ))}
                </div>

                {b.results.some((r) => /precision|false positive/i.test(r.label)) && (
                  <div className="mb-6 p-3 rounded-lg border border-brand-sage/30 bg-brand-sage/5">
                    <p className="text-[10px] uppercase tracking-wider text-brand-sage font-semibold mb-1">
                      {isZh ? '數字口徑' : 'How to read these numbers'}
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {isZh
                        ? `Precision / FP 為此語料庫的 Layer 1（確定性規則）量測，非全引擎數字。分 lane 的 benign gate 誤報率已撤回，等待重新量測。`
                        : `Precision / FP here are Layer 1 (deterministic-rule) measurements on this specific corpus, not an engine-wide figure. The lane-based benign-gate false-positive rates were withdrawn pending re-measurement.`}
                    </p>
                  </div>
                )}

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
                ? '。我們把你的 benchmark 加入本頁，完整署名。'
                : '. We add your benchmark to this page with full attribution.'}
            </p>
            <p className="text-xs text-text-muted mt-4 italic">
              {isZh ? '審稿：' : 'Reviewed by '}
              <Link href="/about" rel="author" className="text-brand-sage hover:underline">
                Adam Lin
              </Link>
              {' · '}
              <span>{isZh ? '最後審查 2026-05-12' : 'Last reviewed 2026-05-12'}</span>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
