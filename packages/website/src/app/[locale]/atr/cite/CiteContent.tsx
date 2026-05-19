'use client';

import { useLocale } from 'next-intl';
import { useState } from 'react';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { STATS } from '@/lib/stats';
import { Copy, Check, ExternalLink } from 'lucide-react';

const DOI = '10.5281/zenodo.19178002';
const VERSION = STATS.atrVersion;
const YEAR = '2026';
const URL = 'https://agentthreatrule.org';
const REPO = 'https://github.com/Agent-Threat-Rule/agent-threat-rules';

const BIBTEX = `@software{atr_${YEAR},
  title  = {ATR: Agent Threat Rules — Open Detection Standard for AI Agent Threats},
  author = {{ATR Community}},
  year   = {${YEAR}},
  version = {${VERSION}},
  doi    = {${DOI}},
  url    = {${URL}},
  license = {MIT}
}`;

const APA = `ATR Community. (${YEAR}). ATR: Agent Threat Rules — Open Detection Standard for AI Agent Threats (Version ${VERSION}) [Computer software]. Zenodo. https://doi.org/${DOI}`;

const CHICAGO = `ATR Community. ${YEAR}. "ATR: Agent Threat Rules — Open Detection Standard for AI Agent Threats." Version ${VERSION}. Zenodo. https://doi.org/${DOI}.`;

const IEEE = `[1] ATR Community, "ATR: Agent Threat Rules — Open Detection Standard for AI Agent Threats," Version ${VERSION}, ${YEAR}. doi: ${DOI}.`;

const CFF = `cff-version: 1.2.0
title: "ATR: Agent Threat Rules — Open Detection Standard for AI Agent Threats"
type: software
authors:
  - name: "ATR Community"
    website: "${URL}"
repository-code: "${REPO}"
url: "${URL}"
license: MIT
version: "${VERSION}"
identifiers:
  - type: doi
    value: "${DOI}"`;

interface Block {
  id: string;
  labelEn: string;
  labelZh: string;
  content: string;
  language?: string;
}

const BLOCKS: readonly Block[] = [
  { id: 'bibtex', labelEn: 'BibTeX', labelZh: 'BibTeX', content: BIBTEX, language: 'bibtex' },
  { id: 'apa', labelEn: 'APA (7th edition)', labelZh: 'APA 第七版', content: APA },
  { id: 'chicago', labelEn: 'Chicago (author-date)', labelZh: 'Chicago 作者-年份制', content: CHICAGO },
  { id: 'ieee', labelEn: 'IEEE', labelZh: 'IEEE', content: IEEE },
  { id: 'cff', labelEn: 'Citation File Format (CFF)', labelZh: 'Citation File Format', content: CFF, language: 'yaml' },
];

export default function CiteContent() {
  const locale = useLocale();
  const isZh = locale.startsWith('zh');

  return (
    <SectionWrapper>
      <header className="mb-12 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
          {isZh ? '引用 · 學術／政策／白皮書' : 'Citation · Academic / Policy / Whitepaper'}
        </div>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          {isZh ? '如何引用 ATR' : 'How to Cite ATR'}
        </h1>
        <p className="text-lg leading-relaxed text-slate-600">
          {isZh
            ? 'ATR 在 Zenodo 註冊永久 DOI，可在學術論文、政策文件、白皮書與供應商規範中以下列格式引用。每份文件變更發行時版本會自動更新；DOI 不變。'
            : 'ATR has a persistent Zenodo DOI suitable for academic papers, policy documents, whitepapers, and vendor specifications. Version updates per release; the DOI is stable.'}
        </p>
      </header>

      <div className="mb-12 grid gap-4 sm:grid-cols-3">
        <KvBox label={isZh ? '版本' : 'Version'} value={VERSION} />
        <KvBox label={isZh ? '永久 DOI' : 'Persistent DOI'} value={DOI} href={`https://doi.org/${DOI}`} />
        <KvBox label="License" value="MIT" />
      </div>

      <SectionTitle
        title={isZh ? '引用格式' : 'Citation Formats'}
        subtitle={isZh ? '點擊右上「複製」即可貼到你的文獻管理器' : 'Click "Copy" to paste into your reference manager'}
      />

      <div className="mt-8 space-y-6">
        {BLOCKS.map((b) => (
          <CodeBlock key={b.id} block={b} isZh={isZh} />
        ))}
      </div>

      <div className="mt-16 rounded-lg border border-slate-200 bg-slate-50 p-6">
        <h3 className="mb-2 text-base font-semibold text-slate-900">
          {isZh ? '對審查者與監管者' : 'For reviewers and regulators'}
        </h3>
        <p className="text-sm leading-relaxed text-slate-700">
          {isZh
            ? '若需要規範性的版本鎖定引用 (例：政策文件採納特定 ATR 版本作為合規基準)，建議直接引用 GitHub 的 tag (例如 v'
            : 'For normative version-locked citation (e.g., policy documents adopting a specific ATR version as a compliance baseline), cite the GitHub release tag (e.g., v'}
          {VERSION}
          {isZh ? ') 或 Zenodo 的版本特定 DOI。Concept DOI 永遠指向最新版。' : ') or the version-specific Zenodo DOI. The concept DOI always resolves to the latest version.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a
            href={`https://doi.org/${DOI}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
          >
            {isZh ? 'Zenodo 頁面' : 'Zenodo record'} <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <a
            href={`${REPO}/blob/main/CITATION.cff`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-white"
          >
            CITATION.cff <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
      </div>
    </SectionWrapper>
  );
}

function CodeBlock({ block, isZh }: { block: Block; isZh: boolean }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(block.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <div className="font-mono text-xs font-medium text-slate-600">
          {isZh ? block.labelZh : block.labelEn}
        </div>
        <button
          onClick={onCopy}
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" aria-hidden /> {isZh ? '已複製' : 'Copied'}
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden /> {isZh ? '複製' : 'Copy'}
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto bg-slate-950 px-4 py-4 text-xs leading-relaxed text-slate-100">
        <code>{block.content}</code>
      </pre>
    </div>
  );
}

function KvBox({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">{value}</div>
    </>
  );
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-200 p-5 hover:border-emerald-400">
        {inner}
      </a>
    );
  return <div className="rounded-lg border border-slate-200 p-5">{inner}</div>;
}
