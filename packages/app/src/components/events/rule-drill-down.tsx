'use client';

/**
 * RuleDrillDown — modal that loads ATR rule metadata for a given rule_id.
 *
 * Opens from an event row's rule_id cell. Shows title, severity, maturity,
 * description, compliance framework mappings (OWASP / NIST / EU AI Act /
 * ISO 42001 / MITRE ATLAS), and a link to the rule's source on GitHub.
 *
 * Differentiation moat #1: competitor dashboards show "something flagged".
 * PanGuard cites ATR rule_id + provenance + framework alignment so the
 * GRC / auditor side has a defensible audit trail per detection.
 */

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { AtrRuleMeta } from '@/lib/atr-rules';

interface Props {
  ruleId: string | null;
  onClose: () => void;
}

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; meta: AtrRuleMeta };

const severityTone: Record<string, 'safe' | 'caution' | 'alert' | 'danger' | 'neutral'> = {
  info: 'safe',
  low: 'safe',
  medium: 'caution',
  high: 'alert',
  critical: 'danger',
};

const maturityTone: Record<string, 'safe' | 'caution' | 'neutral'> = {
  stable: 'safe',
  test: 'caution',
  experimental: 'neutral',
  deprecated: 'neutral',
};

export function RuleDrillDown({ ruleId, onClose }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const open = ruleId !== null;

  useEffect(() => {
    if (!open || !ruleId) {
      setState({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ kind: 'loading' });
    fetch(`/api/atr-rules/${encodeURIComponent(ruleId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AtrRuleMeta>;
      })
      .then((meta) => {
        if (!cancelled) setState({ kind: 'ready', meta });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: e instanceof Error ? e.message : String(e),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, ruleId]);

  return (
    <Dialog open={open} onClose={onClose} title={ruleId ?? ''}>
      {state.kind === 'loading' && (
        <p className="text-text-muted text-sm">Loading rule…</p>
      )}
      {state.kind === 'error' && (
        <p className="text-status-danger text-sm">
          Failed to load rule: {state.message}
        </p>
      )}
      {state.kind === 'ready' && <RuleBody meta={state.meta} />}
    </Dialog>
  );
}

function RuleBody({ meta }: { meta: AtrRuleMeta }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-medium text-text-primary">{meta.title}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone={severityTone[meta.severity] ?? 'neutral'}>
            {meta.severity}
          </Badge>
          <Badge tone={maturityTone[meta.maturity] ?? 'neutral'}>
            maturity: {meta.maturity}
          </Badge>
          <Badge tone={maturityTone[meta.status] ?? 'neutral'}>
            status: {meta.status}
          </Badge>
          {meta.category ? (
            <Badge tone="neutral">{meta.category}</Badge>
          ) : null}
        </div>
      </div>

      {meta.description ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Description
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-text-secondary">
            {meta.description}
          </p>
        </div>
      ) : null}

      {meta.references && Object.keys(meta.references).length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Framework references
          </h3>
          <dl className="mt-1 space-y-1">
            {Object.entries(meta.references).map(([framework, items]) => (
              <div key={framework} className="text-xs">
                <dt className="inline font-mono text-text-muted">
                  {framework}:
                </dt>{' '}
                <dd className="inline text-text-secondary">
                  {Array.isArray(items)
                    ? items.join(' · ')
                    : String(items)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {meta.compliance && Object.keys(meta.compliance).length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Compliance mapping
          </h3>
          <ul className="mt-1 space-y-1 text-xs text-text-secondary">
            {Object.keys(meta.compliance).map((framework) => (
              <li key={framework}>
                <span className="font-mono text-text-muted">{framework}</span>
                <span className="text-text-muted"> · audit-grade mapping</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <a
          href={meta.github_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-sage hover:text-brand-sage-light"
        >
          View rule source on GitHub →
        </a>
        {meta.author ? (
          <span className="text-xs text-text-muted">by {meta.author}</span>
        ) : null}
        {meta.date ? (
          <span className="text-xs text-text-muted">· {meta.date}</span>
        ) : null}
      </div>
    </div>
  );
}
