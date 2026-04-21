'use client';

import { useState, type ReactNode } from 'react';
import type { BlogPost } from '@/data/blog-posts';

/* ─── Inline markdown parser ───
 * Handles within a single line/paragraph:
 *   [text](url)        → external-aware link
 *   **text**           → bold
 *   *text*             → italic
 *   `text`             → inline code
 *   ---                → horizontal rule marker (treated by caller)
 */
function parseInline(text: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\n]+)\*/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    if (match[1] && match[2]) {
      const href = match[2];
      const external = /^https?:\/\//.test(href);
      tokens.push(
        <a
          key={key++}
          href={href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-brand-sage underline underline-offset-2 decoration-brand-sage/40 hover:decoration-brand-sage transition-colors"
        >
          {match[1]}
        </a>
      );
    } else if (match[3]) {
      tokens.push(
        <strong key={key++} className="text-text-primary font-semibold">
          {match[3]}
        </strong>
      );
    } else if (match[4]) {
      tokens.push(
        <code
          key={key++}
          className="text-[0.9em] bg-surface-1 border border-border rounded px-1.5 py-0.5 font-mono text-text-primary"
        >
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      tokens.push(
        <em key={key++} className="italic">
          {match[5]}
        </em>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}

function renderBlock(block: string, i: number) {
  if (block.startsWith('## ')) {
    return (
      <h2
        key={i}
        className="text-[clamp(20px,3vw,28px)] font-bold text-text-primary mt-12 mb-5 leading-tight"
      >
        {parseInline(block.replace('## ', ''))}
      </h2>
    );
  }
  if (block.startsWith('### ')) {
    return (
      <h3 key={i} className="text-lg font-bold text-text-primary mt-8 mb-3 leading-snug">
        {parseInline(block.replace('### ', ''))}
      </h3>
    );
  }
  if (block.startsWith('```')) {
    const code = block.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    return (
      <pre
        key={i}
        className="bg-surface-1 border border-border rounded-xl p-4 sm:p-5 my-5 overflow-x-auto text-xs sm:text-sm"
      >
        <code className="text-text-secondary font-mono whitespace-pre leading-relaxed">{code}</code>
      </pre>
    );
  }
  if (block.startsWith('| ')) {
    const rows = block.split('\n').filter((r) => r.trim());
    const headerRow = rows[0];
    const dataRows = rows.slice(2);
    const headers = headerRow
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    return (
      <div key={i} className="overflow-x-auto my-6 -mx-5 sm:mx-0">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-border">
              {headers.map((h, j) => (
                <th key={j} className="text-left py-3 px-3 sm:px-4 text-text-primary font-semibold">
                  {parseInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, j) => {
              const cells = row
                .split('|')
                .map((c) => c.trim())
                .filter(Boolean);
              return (
                <tr key={j} className="border-b border-border/50">
                  {cells.map((cell, k) => (
                    <td key={k} className="py-3 px-3 sm:px-4 text-text-primary/85">
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.startsWith('- ')) {
    const items = block.split('\n').filter((line) => line.startsWith('- '));
    return (
      <ul key={i} className="space-y-2.5 pl-1 my-4">
        {items.map((item, j) => (
          <li
            key={j}
            className="flex items-start gap-3 text-text-primary/85 leading-relaxed text-[15px] sm:text-base"
          >
            <span className="text-brand-sage mt-[0.55em] shrink-0 text-xs">●</span>
            <span>{parseInline(item.replace(/^- /, ''))}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.trim() === '---') {
    return <hr key={i} className="my-10 border-border/60" />;
  }
  return (
    <p
      key={i}
      className="text-text-primary/85 leading-[1.75] text-[15px] sm:text-base my-4 first:mt-0"
    >
      {parseInline(block)}
    </p>
  );
}

interface BilingualArticleProps {
  enPost: BlogPost;
  zhPost: BlogPost | null;
  defaultLang: 'en' | 'zh';
}

export default function BilingualArticle({ enPost, zhPost, defaultLang }: BilingualArticleProps) {
  const [lang, setLang] = useState<'en' | 'zh'>(defaultLang);
  const activePost = lang === 'zh' && zhPost ? zhPost : enPost;
  const content = activePost.content;

  if (!content) return null;

  // Pre-process: merge consecutive list items into one block, and
  // reconstruct code fences that were split across multiple strings
  // (e.g. '```', 'line1', 'line2', '```' → '```\nline1\nline2\n```').
  const blocks: string[] = [];
  let codeBuffer: string[] | null = null;
  for (const raw of content) {
    if (codeBuffer) {
      if (raw.startsWith('```')) {
        blocks.push(['```', ...codeBuffer, '```'].join('\n'));
        codeBuffer = null;
      } else {
        codeBuffer.push(raw);
      }
      continue;
    }
    if (raw === '```' || (raw.startsWith('```') && !raw.includes('\n'))) {
      codeBuffer = [];
      continue;
    }
    const prev = blocks[blocks.length - 1];
    if (prev && prev.startsWith('- ') && raw.startsWith('- ')) {
      blocks[blocks.length - 1] = `${prev}\n${raw}`;
      continue;
    }
    blocks.push(raw);
  }
  if (codeBuffer) {
    // unclosed fence — render as-is
    blocks.push(['```', ...codeBuffer].join('\n'));
  }

  return (
    <div className="mt-8">
      {zhPost && (
        <div className="flex items-center gap-1 mb-8 bg-surface-1 border border-border rounded-full p-0.5 w-fit">
          <button
            onClick={() => setLang('en')}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
              lang === 'en'
                ? 'bg-brand-sage text-surface-0'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('zh')}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
              lang === 'zh'
                ? 'bg-brand-sage text-surface-0'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            ZH
          </button>
        </div>
      )}
      <div className="prose-panguard">{blocks.map((block, i) => renderBlock(block, i))}</div>
    </div>
  );
}
