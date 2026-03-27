'use client';

import { useState } from 'react';
import type { BlogPost } from '@/data/blog-posts';

function renderBlock(block: string, i: number) {
  if (block.startsWith('## ')) {
    return (
      <h2 key={i} className="text-xl font-bold text-text-primary mt-12 mb-6">
        {block.replace('## ', '')}
      </h2>
    );
  }
  if (block.startsWith('```')) {
    const code = block.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    return (
      <pre
        key={i}
        className="bg-surface-1 border border-border rounded-xl p-5 my-2 overflow-x-auto"
      >
        <code className="text-sm text-text-secondary font-mono">{code}</code>
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
      <div key={i} className="overflow-x-auto my-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {headers.map((h, j) => (
                <th key={j} className="text-left py-2 px-3 text-text-primary font-semibold">
                  {h}
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
                    <td key={k} className="py-2 px-3 text-text-primary/75">
                      {cell}
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
      <ul key={i} className="space-y-2 pl-1">
        {items.map((item, j) => (
          <li key={j} className="flex items-start gap-2.5 text-text-primary/75 leading-relaxed">
            <span className="text-brand-sage mt-1.5 shrink-0">{'\u2022'}</span>
            <span>{item.replace(/^- /, '')}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p key={i} className="text-text-primary/75 leading-relaxed">
      {block}
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
      <div className="prose-panguard space-y-5">
        {content.map((block, i) => renderBlock(block, i))}
      </div>
    </div>
  );
}
