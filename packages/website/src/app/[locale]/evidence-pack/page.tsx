/**
 * Sample Evidence Pack landing page — public artifact for CISO prospects.
 *
 * Direct link sent to CISO / compliance buyer prospects (Birdman, Tang,
 * HUMAIN, Sage, NEXUS). They can open this on a phone and see:
 *  - 3 framework-mapped compliance PDFs (ISO 27001 / SOC 2 / Taiwan CSA)
 *  - JSON + HTML variants
 *  - manifest.json with SHA-256 + HMAC for tamper detection
 *  - The "0% LLM in detection path" claim made auditable
 *
 * No-LLM stack proof point: the entire pack is rendered from ATR rule
 * YAML metadata + assessor output — no model API call anywhere.
 */

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/navigation';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Check, Download, ShieldCheck, FileText, Code, Lock } from 'lucide-react';
import manifest from '../../../../public/samples/evidence-pack-2026-05/manifest.json';

export const metadata: Metadata = {
  title: 'Sample Compliance Evidence Pack | PanGuard AI',
  description:
    'Open a real PanGuard compliance evidence pack — ISO 27001, SOC 2, Taiwan CSA — with SHA-256 + HMAC integrity proofs. Synthetic data, real format.',
  robots: { index: false, follow: true },
};

const SAMPLE_BASE = '/samples/evidence-pack-2026-05';

interface ManifestFile {
  file: string;
  size_bytes: number;
  sha256: string;
  hmac_sha256: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fileIcon(name: string) {
  if (name.endsWith('.pdf')) return <FileText className="w-4 h-4 text-brand-emerald" />;
  if (name.endsWith('.json')) return <Code className="w-4 h-4 text-brand-sage" />;
  if (name.endsWith('.html')) return <FileText className="w-4 h-4 text-brand-sage" />;
  return <FileText className="w-4 h-4 text-text-muted" />;
}

export default async function EvidencePackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isZh = locale === 'zh-TW';
  const files = manifest.files as ManifestFile[];

  return (
    <div className="bg-surface-0 text-text-primary min-h-screen">
      <SectionWrapper>
        <FadeInUp>
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 bg-brand-sage/10 border border-brand-sage/30 rounded-full px-4 py-1.5 text-xs font-semibold text-brand-sage uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isZh ? '樣本 · 可驗證 · 同產線' : 'Sample · Verifiable · Same pipeline'}
            </span>
            <h1 className="mt-6 text-3xl sm:text-5xl font-bold tracking-tight">
              {isZh ? '合規證據包樣本' : 'Sample Compliance Evidence Pack'}
            </h1>
            <p className="mt-4 text-base text-text-secondary leading-relaxed">
              {isZh
                ? '這份檔案是 PanGuard Pilot / Enterprise 客戶每季拿到的東西。下方所有 PDF / JSON / HTML 是 panguard-report 在 server 端直接從 ATR 規則 metadata + 即時資產評估渲染的——沒有任何 LLM call。'
                : 'This is the artifact every PanGuard Pilot / Enterprise customer receives quarterly. Every PDF / JSON / HTML below is rendered server-side by panguard-report directly from ATR rule metadata plus live asset assessment — zero LLM calls.'}
            </p>
            <p className="mt-3 text-xs text-text-muted leading-relaxed">
              {isZh
                ? `組織欄位「Acme Corp (Sample)」為合成資料，僅供示範。生產環境的 evidence pack 會綁定真實客戶 workspace ID + HMAC 簽章。`
                : `The "Acme Corp (Sample)" organisation field is synthetic demo data. Production evidence packs bind a real customer workspace ID + HMAC signature.`}
            </p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.15}>
          <div className="mt-12 max-w-4xl mx-auto">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
              {isZh ? '包內檔案' : 'Pack contents'}
            </p>
            <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-[11px] uppercase tracking-wider font-semibold text-text-muted">
                  <tr>
                    <th className="text-left px-4 py-3">{isZh ? '檔案' : 'File'}</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">
                      {isZh ? '大小' : 'Size'}
                    </th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">SHA-256</th>
                    <th className="text-right px-4 py-3">{isZh ? '下載' : 'Download'}</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.file} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs flex items-center gap-2">
                        {fileIcon(f.file)}
                        {f.file}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary hidden sm:table-cell">
                        {formatBytes(f.size_bytes)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <code className="text-[10px] text-text-muted font-mono break-all">
                          {f.sha256.slice(0, 16)}…{f.sha256.slice(-8)}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`${SAMPLE_BASE}/${f.file}`}
                          download
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-sage hover:text-brand-sage-light"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {isZh ? '下載' : 'Download'}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              {isZh ? '驗證指令:' : 'Verify integrity:'}{' '}
              <code className="bg-surface-2 border border-border rounded px-1.5 py-0.5 text-[11px] text-text-secondary">
                {manifest.verification_command ?? 'shasum -a 256 RPT-*'}
              </code>{' '}
              {isZh
                ? '— 與下方 manifest.json 的 sha256 欄位比對。'
                : '— compare against the sha256 field in manifest.json below.'}
            </p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.25}>
          <div className="mt-12 max-w-4xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              label={isZh ? 'ATR 規則數' : 'ATR rules'}
              value={String(manifest.atr_rule_count)}
              caption={isZh ? '純 deterministic' : 'fully deterministic'}
            />
            <Stat
              label={isZh ? 'Garak recall' : 'Garak recall'}
              value={`${manifest.detection_recall_pct}%`}
              caption={isZh ? '498 SKILL.md 樣本' : '498 SKILL.md samples'}
            />
            <Stat
              label={isZh ? 'False positive' : 'False positive'}
              value={`${manifest.detection_fp_rate_pct}%`}
              caption={isZh ? '同一基準上' : 'on the same benchmark'}
            />
            <Stat
              label={isZh ? '偵測層 LLM 使用' : 'LLM in detection'}
              value="0%"
              caption={isZh ? '無 BYO key 需求' : 'no BYO key required'}
            />
          </div>
        </FadeInUp>

        <FadeInUp delay={0.35}>
          <div className="mt-12 max-w-3xl mx-auto bg-surface-1 border border-border rounded-xl p-6">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mb-3 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              {isZh ? '為什麼這份不靠 LLM' : 'Why this pack does not rely on an LLM'}
            </p>
            <ul className="space-y-2.5 text-sm text-text-secondary leading-relaxed">
              <Bullet>
                {isZh
                  ? '偵測:336 條 ATR 規則 + Garak 97.1% recall · 0.20% FP——LLM 0 個 token'
                  : 'Detection: 336 ATR rules with 97.1% Garak recall / 0.20% FP — zero LLM tokens'}
              </Bullet>
              <Bullet>
                {isZh
                  ? '報告敘述:由規則 YAML metadata 直接渲染(title / severity / description / compliance citation)'
                  : 'Report narrative: rendered directly from rule YAML metadata (title / severity / description / compliance citation)'}
              </Bullet>
              <Bullet>
                {isZh
                  ? '評估發現:assessors 在客戶機器上直接讀 firewall / encryption / TLS / logging 設定'
                  : 'Assessment findings: assessors read firewall, encryption, TLS, and logging configuration on the customer machine'}
              </Bullet>
              <Bullet>
                {isZh
                  ? '稽核完整性:每個檔案都有 SHA-256 + HMAC-SHA256 簽章(production 客戶簽章用客戶綁定 key)'
                  : 'Audit integrity: every file carries SHA-256 + HMAC-SHA256 signatures (production signatures use a customer-bound key)'}
              </Bullet>
              <Bullet>
                {isZh
                  ? 'Pilot / Enterprise 客戶完全不必綁定 OpenAI / Anthropic key 給偵測層使用'
                  : 'Pilot / Enterprise customers never need to bind an OpenAI / Anthropic key to the detection path'}
              </Bullet>
            </ul>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.45}>
          <div className="mt-12 max-w-3xl mx-auto text-center">
            <p className="text-sm text-text-secondary mb-4">
              {isZh ? '想要綁你自己 workspace 的版本?' : 'Want this generated against your own workspace?'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-brand-sage-light transition-colors"
              >
                {isZh ? '預約示範' : 'Book demo'}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-surface-2 border border-border text-text-primary font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-surface-1 transition-colors"
              >
                {isZh ? '看 Pilot ($25K / 90d)' : 'See Pilot ($25K / 90d)'}
              </Link>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </div>
  );
}

function Stat({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="bg-surface-1 border border-border rounded-xl p-5 text-center">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
      <p className="mt-1 text-[11px] text-text-muted">{caption}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}
