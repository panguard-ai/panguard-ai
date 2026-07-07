'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';
import { LockIcon, TerminalIcon, GlobalIcon, AlertIcon } from '@/components/ui/BrandIcons';

/* ─── Published key material (public by design; private key never leaves the issuer) ─── */
const SIGNING_KEY = {
  issuer: 'PanGuard AI, Inc.',
  keyId: 'pgk1-621b5f58dbfa5e2c',
  algorithm: 'Ed25519',
  createdAt: '2026-07-04',
  payloadFormat: 'PGA-SIG-V1',
  publicKeyPem:
    '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAE8yWwjJ9K3FUibtTZq640dHJVEGw26AM8NiM749fzqU=\n-----END PUBLIC KEY-----',
} as const;

const VERIFY_COMMAND = `pga report sign verify report.json --expect-key ${SIGNING_KEY.keyId}`;
const WELL_KNOWN_PATH = '/.well-known/panguard-signing-key.json';

/* ─── One-click copy for key material / commands ─── */
function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (permissions / non-secure context) — no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors duration-200 ${
        copied
          ? 'border-[#22c55e]/40 text-[#22c55e]'
          : 'border-border text-text-secondary hover:border-brand-sage hover:text-text-primary'
      }`}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Report Signing Key — the authoritative publication partners pin
   ═══════════════════════════════════════════════════════════════════ */
export default function SigningKeyContent() {
  const t = useTranslations('trustSigningKey');

  const facts: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: t('facts.issuer'), value: SIGNING_KEY.issuer },
    { label: t('facts.keyId'), value: SIGNING_KEY.keyId, mono: true },
    { label: t('facts.algorithm'), value: SIGNING_KEY.algorithm, mono: true },
    { label: t('facts.created'), value: SIGNING_KEY.createdAt, mono: true },
    { label: t('facts.usage'), value: t('facts.usageValue') },
    { label: t('facts.payloadFormat'), value: SIGNING_KEY.payloadFormat, mono: true },
  ];

  return (
    <>
      <SectionWrapper spacing="spacious">
        <SectionTitle overline={t('overline')} title={t('title')} subtitle={t('subtitle')} />

        {/* -- Key facts -- */}
        <FadeInUp delay={0.1}>
          <div className="mt-14 max-w-3xl mx-auto rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface-1">
              <LockIcon className="w-5 h-5 text-brand-sage" />
              <p className="text-sm font-bold text-text-primary">{t('facts.title')}</p>
              <span className="ml-auto rounded-full border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#22c55e]">
                {t('facts.statusActive')}
              </span>
            </div>
            <dl>
              {facts.map((f, idx) => (
                <div
                  key={f.label}
                  className={`flex flex-wrap items-baseline gap-x-6 gap-y-1 px-6 py-3.5 ${
                    idx < facts.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <dt className="w-36 shrink-0 text-xs uppercase tracking-wider text-text-muted">
                    {f.label}
                  </dt>
                  <dd
                    className={`text-sm text-text-primary ${f.mono ? 'font-mono' : ''} break-all`}
                  >
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </FadeInUp>

        {/* -- Public key PEM -- */}
        <FadeInUp delay={0.15}>
          <div className="mt-6 max-w-3xl mx-auto rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface-1">
              <p className="text-sm font-bold text-text-primary">{t('pem.title')}</p>
              <div className="ml-auto">
                <CopyButton
                  text={SIGNING_KEY.publicKeyPem}
                  label={t('pem.copy')}
                  copiedLabel={t('pem.copied')}
                />
              </div>
            </div>
            <pre className="px-6 py-5 font-mono text-xs sm:text-sm text-text-secondary overflow-x-auto leading-relaxed">
              {SIGNING_KEY.publicKeyPem}
            </pre>
            <p className="px-6 pb-5 text-xs text-text-muted leading-relaxed">{t('pem.desc')}</p>
          </div>
        </FadeInUp>

        {/* -- How to verify -- */}
        <FadeInUp delay={0.2}>
          <div className="mt-6 max-w-3xl mx-auto rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface-1">
              <TerminalIcon className="w-5 h-5 text-brand-sage" />
              <p className="text-sm font-bold text-text-primary">{t('verify.title')}</p>
            </div>
            <div>
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-4 px-6 py-4 ${idx < 2 ? 'border-b border-border' : ''}`}
                >
                  <div className="w-7 h-7 rounded-full bg-brand-sage/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-brand-sage">{idx + 1}</span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {t(`verify.steps.${idx}`)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mx-6 mb-5 flex items-center gap-3 rounded-xl border border-border bg-surface-1 px-4 py-3 overflow-x-auto">
              <span aria-hidden className="select-none font-mono text-sm text-brand-sage">
                $
              </span>
              <code className="whitespace-nowrap font-mono text-xs sm:text-sm text-text-secondary">
                {VERIFY_COMMAND}
              </code>
              <div className="ml-auto pl-3">
                <CopyButton
                  text={VERIFY_COMMAND}
                  label={t('verify.copy')}
                  copiedLabel={t('pem.copied')}
                />
              </div>
            </div>
          </div>
        </FadeInUp>

        {/* -- Machine-readable endpoint -- */}
        <FadeInUp delay={0.25}>
          <div className="mt-6 max-w-3xl mx-auto rounded-2xl border border-border px-6 py-5 flex flex-wrap items-center gap-4">
            <GlobalIcon className="w-5 h-5 text-brand-sage shrink-0" />
            <div className="flex-1 min-w-[240px]">
              <p className="text-sm font-bold text-text-primary">{t('wellKnown.title')}</p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{t('wellKnown.desc')}</p>
            </div>
            <a
              href={WELL_KNOWN_PATH}
              className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm text-brand-sage hover:text-brand-sage-light transition-colors duration-200"
            >
              {WELL_KNOWN_PATH} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </FadeInUp>

        {/* -- Scope & limitations (honest boundary, same discipline as the reports) -- */}
        <FadeInUp delay={0.3}>
          <div className="mt-6 max-w-3xl mx-auto rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/[0.04] px-6 py-5">
            <div className="flex items-center gap-3 mb-2">
              <AlertIcon className="w-5 h-5 text-[#f59e0b]" />
              <p className="text-sm font-bold text-text-primary">{t('limits.title')}</p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{t('limits.desc')}</p>
          </div>
        </FadeInUp>

        {/* -- Back to Trust Center -- */}
        <FadeInUp delay={0.35}>
          <div className="mt-10 text-center">
            <Link
              href="/trust"
              className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              {t('backToTrust')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </>
  );
}
