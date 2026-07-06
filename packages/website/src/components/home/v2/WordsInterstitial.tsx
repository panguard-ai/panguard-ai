'use client';

import { useTranslations } from 'next-intl';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const CJK_RE = /[　-〿一-鿿豈-﫿＀-￯]/;
// Full-width closers must never start a segment (avoids dangling punctuation
// wrapping to a new line as its own inline-block).
const CJK_TRAILING = /^[。,、!?;:」』)……——~]/;

/**
 * Segment a text run for word-by-word reveal.
 * EN: split on spaces. CJK: per-character cascade with trailing
 * punctuation glued to the previous character (deterministic on both
 * server and client — no Intl.Segmenter, so hydration stays exact).
 */
function segment(text: string): string[] {
  if (!CJK_RE.test(text)) {
    return text.split(' ').filter(Boolean);
  }
  const chars = Array.from(text.trim());
  const out: string[] = [];
  for (const ch of chars) {
    if (ch === ' ') continue;
    if (out.length > 0 && CJK_TRAILING.test(ch)) {
      out[out.length - 1] += ch;
    } else {
      out.push(ch);
    }
  }
  return out;
}

/**
 * Full-screen single-statement interstitial — word-by-word blur reveal.
 * Parses the raw <sage>…</sage> markup so the highlighted run keeps the
 * deck's two-tone headline device.
 */
export default function WordsInterstitial() {
  const t = useTranslations('homeV2.interstitial');
  const ref = useScrollReveal({ margin: '-80px' });

  const raw = t.raw('text') as string;
  // Split into [before, highlighted, after] runs around <sage> tags.
  const match = raw.match(/^([\s\S]*?)<sage>([\s\S]*?)<\/sage>([\s\S]*)$/);
  const runs: Array<{ text: string; sage: boolean }> = match
    ? [
        { text: match[1], sage: false },
        { text: match[2], sage: true },
        { text: match[3], sage: false },
      ]
    : [{ text: raw, sage: false }];

  const isCjk = CJK_RE.test(raw);
  const gapClass = isCjk ? '' : 'mr-[0.28em]';

  let wordIndex = 0;

  return (
    <section className="border-t border-border-subtle bg-surface-hero">
      <div className="mx-auto flex min-h-[52vh] max-w-7xl items-center px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <p
          ref={ref}
          className="reveal-text-container max-w-5xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-text-primary sm:text-6xl lg:text-7xl"
        >
          {runs.map((run, runIdx) =>
            segment(run.text).map((word) => {
              const delay = wordIndex * 0.07;
              wordIndex += 1;
              return (
                <span
                  key={`${runIdx}-${wordIndex}`}
                  className={`reveal-word-blur inline-block ${gapClass} ${
                    run.sage ? 'text-brand-sage' : ''
                  }`}
                  style={{ transitionDelay: `${delay}s` }}
                >
                  {word}
                </span>
              );
            })
          )}
        </p>
      </div>
    </section>
  );
}
