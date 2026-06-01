'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { InlineToast } from '@/components/ui/toast';
import { updateDeliverableMeta } from '@/app/w/[slug]/deliverables/actions';
import type { Deliverable } from '@/lib/types';

const LANGUAGE_OPTS = [
  { value: 'en', label: 'English' },
  { value: 'zh-Hant', label: '繁體中文' },
] as const;

const CLASSIFICATION_OPTS = [
  { value: 'public', label: 'Public' },
  { value: 'internal', label: 'Internal' },
  { value: 'confidential', label: 'Confidential' },
  { value: 'restricted', label: 'Restricted' },
] as const;

const REGION_OPTS = [
  { value: 'eu', label: 'European Union' },
  { value: 'us', label: 'United States' },
  { value: 'apac', label: 'APAC' },
  { value: 'global', label: 'Global' },
] as const;

const FRAMEWORK_OPTS = [
  { value: 'eu-ai-act', label: 'EU AI Act' },
  { value: 'nist-ai-rmf', label: 'NIST AI RMF' },
  { value: 'iso-42001', label: 'ISO/IEC 42001' },
  { value: 'owasp-agentic', label: 'OWASP Agentic Top 10' },
  { value: 'owasp-llm', label: 'OWASP LLM Top 10' },
] as const;

const textareaClass =
  'rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage min-h-[96px] resize-y';

/**
 * Editable metadata for a draft deliverable. Mirrors create-client-form's
 * uncontrolled-form-action pattern. All inputs are pre-filled from the row;
 * scope/methodology are one-bullet-per-line textareas. Issued deliverables
 * never render this form (the detail page shows a read-only summary instead).
 */
export function DeliverableMetaForm({
  slug,
  deliverable,
}: {
  slug: string;
  deliverable: Deliverable;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateDeliverableMeta(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? 'Failed to save changes');
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Report metadata"
        subtitle="Client, assessor, framework, and document details. Editable until issued."
      />
      <form ref={formRef} action={onSubmit} className="space-y-5">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="id" value={deliverable.id} />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            name="client_name"
            label="Client name"
            defaultValue={deliverable.client_name}
            placeholder="Acme Bank"
            required
          />
          <Input
            name="client_detail"
            label="Client detail"
            defaultValue={deliverable.client_detail ?? ''}
            placeholder="Security & Compliance, EMEA"
          />
          <Input
            name="assessor_name"
            label="Assessor name"
            defaultValue={deliverable.assessor_name}
            placeholder="Your firm's legal name"
          />
          <Input
            name="assessor_detail"
            label="Assessor detail"
            defaultValue={deliverable.assessor_detail ?? ''}
            placeholder="Accredited assessor · Reg. 12345"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Input
            name="report_ref"
            label="Report reference"
            defaultValue={deliverable.report_ref}
            placeholder="PG-RPT-2026-0042"
          />
          <Input
            name="version"
            label="Version"
            defaultValue={deliverable.version}
            placeholder="1.0"
          />
          <Input
            name="report_date"
            type="date"
            label="Report date"
            defaultValue={deliverable.report_date ?? ''}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            name="prepared_by"
            label="Prepared by"
            defaultValue={deliverable.prepared_by}
            placeholder="Lead assessor name"
          />
          <Input
            name="reviewed_by"
            label="Reviewed by"
            defaultValue={deliverable.reviewed_by ?? ''}
            placeholder="Reviewer name (optional)"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Select
            name="language"
            label="Language"
            options={LANGUAGE_OPTS}
            defaultValue={deliverable.language}
          />
          <Select
            name="classification"
            label="Classification"
            options={CLASSIFICATION_OPTS}
            defaultValue={deliverable.classification}
          />
          <Select
            name="region"
            label="Region"
            options={REGION_OPTS}
            defaultValue={deliverable.region}
          />
          <Select
            name="primary_framework"
            label="Primary framework"
            options={FRAMEWORK_OPTS}
            defaultValue={deliverable.primary_framework}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="scope" className="text-sm font-medium text-text-secondary">
              Scope
            </label>
            <textarea
              id="scope"
              name="scope"
              className={textareaClass}
              defaultValue={deliverable.scope.join('\n')}
              placeholder={
                'One item per line, e.g.\nProduction MCP servers\nTime window: 2026-05-01 to 2026-05-15'
              }
            />
            <p className="text-xs text-text-muted">One bullet per line.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="methodology" className="text-sm font-medium text-text-secondary">
              Methodology
            </label>
            <textarea
              id="methodology"
              name="methodology"
              className={textareaClass}
              defaultValue={deliverable.methodology.join('\n')}
              placeholder={'Leave blank for the regional default, or list one step per line.'}
            />
            <p className="text-xs text-text-muted">Blank = regional default.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save changes'}
          </Button>
          {error ? <span className="text-sm text-status-danger">{error}</span> : null}
        </div>
      </form>
      {saved ? (
        <div className="mt-4">
          <InlineToast tone="success">Metadata saved.</InlineToast>
        </div>
      ) : null}
    </Card>
  );
}
