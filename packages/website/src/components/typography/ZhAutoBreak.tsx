'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';

/**
 * Phrase-aware line breaking for Traditional Chinese.
 *
 * CJK text can legally wrap between ANY two characters, so headings split
 * words mid-phrase (e.g. 攻擊 breaking into 攻 / 擊 across lines). BudouX
 * inserts zero-width breakpoints at phrase boundaries and sets
 * word-break: keep-all on the element, so lines wrap only at natural word
 * edges. Applied to display headings and opted-in nodes; body text at
 * reading sizes wraps acceptably anywhere and is left alone.
 *
 * The zh-hant model (~84KB) is dynamically imported only on zh-TW pages.
 */
const TARGETS = 'h1, h2, h3, [data-cjk-break]';

export default function ZhAutoBreak() {
  const locale = useLocale();

  useEffect(() => {
    if (locale !== 'zh-TW') return;
    let disposed = false;
    let observer: MutationObserver | null = null;
    let scheduled = false;

    void (async () => {
      const { loadDefaultTraditionalChineseParser } = await import('budoux');
      if (disposed) return;
      const parser = loadDefaultTraditionalChineseParser();
      const seen = new WeakSet<Element>();

      // BudouX's zh-hant model occasionally drops a breakpoint INSIDE a Latin
      // run (e.g. "agen​t"), which keep-all would happily break across
      // lines. Strip any ZWSP sandwiched between Latin alphanumerics so
      // English tokens stay whole; phrase breaks around CJK are untouched.
      const LATIN_ZWSP = /(?<=[A-Za-z0-9])​(?=[A-Za-z0-9])/g;
      const cleanLatin = (el: HTMLElement) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.nodeValue;
          if (text && text.includes('​')) {
            const cleaned = text.replace(LATIN_ZWSP, '');
            if (cleaned !== text) node.nodeValue = cleaned;
          }
        }
      };

      const apply = () => {
        scheduled = false;
        document.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);
          try {
            parser.applyToElement(el);
            cleanLatin(el);
          } catch {
            // Skip nodes BudouX can't process; never break rendering over typography.
          }
        });
      };

      apply();
      // Route transitions and reveal-on-scroll mounts add headings after the
      // first pass — reapply once per animation frame at most. The WeakSet
      // keeps already-processed elements from being touched again, so the
      // observer never feeds back on its own mutations.
      observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(apply);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
    };
  }, [locale]);

  return null;
}
