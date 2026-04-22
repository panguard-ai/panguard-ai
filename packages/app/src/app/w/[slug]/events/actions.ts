'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

const FilterInput = z.object({
  slug: z.string(),
  severity: z.string().optional(),
  q: z.string().optional(),
});

export async function applyEventFilters(formData: FormData): Promise<void> {
  const parsed = FilterInput.parse({
    slug: formData.get('slug'),
    severity: formData.get('severity') || undefined,
    q: formData.get('q') || undefined,
  });
  const params = new URLSearchParams();
  if (parsed.severity) params.set('severity', parsed.severity);
  if (parsed.q) params.set('q', parsed.q);
  const qs = params.toString();
  redirect(`/w/${parsed.slug}/events${qs ? `?${qs}` : ''}`);
}
