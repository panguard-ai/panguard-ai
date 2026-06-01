'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Loader2, Trash2 } from '@/components/icons';
import { deleteFinding, upsertFinding } from '@/app/w/[slug]/deliverables/actions';
import { SEVERITY_OPTS, SEVERITY_TONE, TEXTAREA_CLASS } from './display';
import type { DeliverableFindingRow } from '@/lib/types';

const FRAMEWORK_LABEL: Record<string, string> = {
  'eu-ai-act': 'EU AI Act',
  'colorado-ai-act': 'Colorado AI Act',
  'nist-ai-rmf': 'NIST AI RMF',
  'iso-42001': 'ISO/IEC 42001',
  'owasp-agentic': 'OWASP Agentic',
  'owasp-llm': 'OWASP LLM',
};

/** A label + raw <textarea> with a per-row unique id (avoids DOM id clashes). */
function FieldTextarea({
  id,
  name,
  label,
  defaultValue,
  placeholder,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        className={TEXTAREA_CLASS}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
      {hint ? <p className="text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}

/**
 * Edit (existing row) or add (no `finding`) a single deliverable finding.
 * Scalar fields post to `upsertFinding`; the ATR-seeded control mappings ride
 * along as a read-only chip list + a hidden JSON field so the scalar editor
 * preserves traceability without re-typing it. Collapsed by default for
 * existing rows; the "add" form opens expanded.
 */
export function FindingRowForm({
  slug,
  deliverableId,
  finding,
  onSaved,
  onCancel,
}: {
  slug: string;
  deliverableId: string;
  finding?: DeliverableFindingRow;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isNew = !finding;
  const uid = finding?.id ?? 'new';
  const [open, setOpen] = useState(isNew);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controls = finding?.controls ?? [];

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await upsertFinding(formData);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to save finding');
      return;
    }
    router.refresh();
    onSaved?.();
  }

  async function onDelete() {
    if (!finding) return;
    setDeleting(true);
    setError(null);
    const formData = new FormData();
    formData.set('slug', slug);
    formData.set('deliverable_id', deliverableId);
    formData.set('finding_id', finding.id);
    const res = await deleteFinding(formData);
    setDeleting(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to delete finding');
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-surface-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
        )}
        <span className="font-mono text-xs text-text-muted">
          {finding?.finding_ref || (isNew ? 'NEW' : '—')}
        </span>
        <span className="flex-1 truncate text-sm text-text-primary">
          {finding?.title || (isNew ? 'New finding' : 'Untitled')}
        </span>
        <Badge tone={SEVERITY_TONE[finding?.severity ?? 'info']}>
          {finding?.severity ?? 'info'}
        </Badge>
      </button>

      {open ? (
        <form action={onSubmit} className="space-y-5 border-t border-border px-4 py-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="deliverable_id" value={deliverableId} />
          {finding ? <input type="hidden" name="finding_id" value={finding.id} /> : null}
          <input type="hidden" name="controls" value={JSON.stringify(controls)} />

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              id={`${uid}-finding_ref`}
              name="finding_ref"
              label="Reference"
              defaultValue={finding?.finding_ref ?? ''}
              placeholder="PG-001"
            />
            <Select
              id={`${uid}-severity`}
              name="severity"
              label="Severity"
              options={SEVERITY_OPTS}
              defaultValue={finding?.severity ?? 'info'}
            />
            <Input
              id={`${uid}-cvss`}
              name="cvss"
              type="number"
              step="0.1"
              min="0"
              max="10"
              label="CVSS"
              defaultValue={finding?.cvss?.toString() ?? ''}
              placeholder="0.0 – 10.0"
            />
          </div>

          <Input
            id={`${uid}-title`}
            name="title"
            label="Title"
            defaultValue={finding?.title ?? ''}
            placeholder="Short finding title"
            required
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id={`${uid}-category`}
              name="category"
              label="Category"
              defaultValue={finding?.category ?? ''}
              placeholder="tool-poisoning"
            />
            <Input
              id={`${uid}-atr_rule_id`}
              name="atr_rule_id"
              label="ATR rule"
              defaultValue={finding?.atr_rule_id ?? ''}
              placeholder="ATR-2026-00543"
            />
            <Input
              id={`${uid}-affected_asset`}
              name="affected_asset"
              label="Affected asset"
              defaultValue={finding?.affected_asset ?? ''}
              placeholder="mcp-gateway-01"
            />
            <Input
              id={`${uid}-cvss_vector`}
              name="cvss_vector"
              label="CVSS vector"
              defaultValue={finding?.cvss_vector ?? ''}
              placeholder="CVSS:3.1/AV:N/AC:L/..."
            />
          </div>

          <FieldTextarea
            id={`${uid}-description`}
            name="description"
            label="Description"
            defaultValue={finding?.description ?? ''}
            placeholder="What the issue is and why it matters."
          />
          <FieldTextarea
            id={`${uid}-evidence`}
            name="evidence"
            label="Evidence"
            defaultValue={finding?.evidence ?? ''}
            placeholder="Redacted scan summary or reproduction detail."
            hint="Sourced from redacted scan summaries — never paste raw secrets or payloads."
          />
          <FieldTextarea
            id={`${uid}-remediation`}
            name="remediation"
            label="Remediation"
            defaultValue={finding?.remediation ?? ''}
            placeholder="How to fix it."
          />

          {controls.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-secondary">Control mappings</span>
              <div className="flex flex-wrap gap-2">
                {controls.map((c, i) => (
                  <Badge key={`${c.framework}-${c.identifier}-${i}`} tone="info">
                    {(FRAMEWORK_LABEL[c.framework] ?? c.framework) + ' · ' + c.identifier}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-text-muted">
                Inherited from the matched ATR rule. Carried into the traceability matrix.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {pending ? 'Saving...' : isNew ? 'Add finding' : 'Save finding'}
            </Button>
            {finding ? (
              confirmingDelete ? (
                <>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={onDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {deleting ? 'Deleting...' : 'Confirm delete'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )
            ) : null}
            {isNew && onCancel ? (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            {error ? <span className="text-sm text-status-danger">{error}</span> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
