import type { ReactNode } from 'react';

/**
 * v2 homepage design primitives — deck v11 editorial dark language.
 * Signature device: cream headline with the pivotal phrase in sage,
 * mono uppercase micro-labels for all metadata.
 */

/** Rich-text renderer for <sage> tags in homeV2 messages */
export function sageRich(chunks: ReactNode): ReactNode {
  return <span className="text-brand-sage">{chunks}</span>;
}

/** Mono uppercase micro-label with leading dash (deck kicker style) */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`flex items-center gap-3 font-mono text-[11px] uppercase tracking-micro text-text-muted ${className}`}
    >
      <span aria-hidden className="inline-block h-px w-8 bg-border-hover" />
      {children}
    </p>
  );
}

/** Section headline — huge, tight, flush-left, two-tone via <sage> rich text */
export function SectionTitleV2({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`mt-6 max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-text-primary sm:text-5xl lg:text-6xl ${className}`}
    >
      {children}
    </h2>
  );
}

/** Standard v2 section wrapper: hairline top border + generous rhythm */
export function SectionV2({
  children,
  className = '',
  bordered = true,
  id,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`${bordered ? 'border-t border-border-subtle' : ''} ${className}`}>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">{children}</div>
    </section>
  );
}

/** Big mono stat with micro-label beneath (deck KPI row style) */
export function StatV2({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div className="font-mono text-3xl font-medium text-text-primary sm:text-4xl">{value}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-micro text-text-muted">
        {label}
      </div>
    </div>
  );
}

/** Card in the deck language: warm dark fill, hairline border, 16px radius */
export function CardV2({
  children,
  className = '',
  emphasized = false,
  provisional = false,
}: {
  children: ReactNode;
  className?: string;
  emphasized?: boolean;
  provisional?: boolean;
}) {
  const border = emphasized
    ? 'border-brand-sage/40'
    : provisional
      ? 'border-border border-provisional'
      : 'border-border';
  return (
    <div className={`lift rounded-2xl border ${border} bg-surface-1 p-6 ${className}`}>{children}</div>
  );
}

/** Card kicker: mono micro-label inside cards */
export function CardKicker({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-micro text-text-muted">{children}</p>
  );
}

/** Bottom-of-section thesis kicker (deck footer line) */
export function SectionKicker({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`mt-14 border-t border-border-subtle pt-6 text-right font-mono text-[10px] uppercase tracking-micro text-text-muted ${className}`}
    >
      {children}
    </p>
  );
}
