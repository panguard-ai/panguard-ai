'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, Check, Plus } from '@/components/icons';
import type { Workspace } from '@/lib/types';

interface Props {
  current: Workspace;
  options: ReadonlyArray<Workspace>;
}

export function WorkspaceSwitcher({ current, options }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm font-medium text-text-primary hover:border-brand-sage"
      >
        <span>{current.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-40 mt-1 w-64 rounded-xl border border-border bg-surface-1 p-1 shadow-2xl"
          onMouseLeave={() => setOpen(false)}
        >
          {options.map((w) => (
            <Link
              key={w.id}
              href={`/w/${w.slug}`}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              onClick={() => setOpen(false)}
            >
              <span>{w.name}</span>
              {w.id === current.id ? <Check className="h-3.5 w-3.5 text-brand-sage" /> : null}
            </Link>
          ))}
          <div className="my-1 border-t border-border" />
          <Link
            href="/onboarding"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-sage hover:bg-surface-2"
            onClick={() => setOpen(false)}
          >
            <Plus className="h-3.5 w-3.5" />
            New workspace
          </Link>
        </div>
      ) : null}
    </div>
  );
}
