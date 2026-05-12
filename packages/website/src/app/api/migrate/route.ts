import { NextResponse } from 'next/server';
import yaml from 'js-yaml';
import { convertSigma, convertYara } from '@panguard-ai/migrator-community';
import type { SigmaRule } from '@panguard-ai/migrator-community';

/**
 * POST /api/migrate
 *
 * Converts a single Sigma YAML or YARA text rule into an ATR YAML rule
 * using the open-source @panguard-ai/migrator-community parsers.
 *
 * Runs server-side because the community package transitively reaches
 * `node:crypto` (id allocator) and `agent-threat-rules` (validator) —
 * neither bundles cleanly into a browser client. Keeping the conversion
 * here also lets the demo work even with JavaScript disabled in the
 * marketing layer above; only the live converter requires JS.
 *
 * Input:
 *   { source: 'sigma' | 'yara' | 'auto', text: string }
 *
 * Output (200):
 *   { yaml: string, atrId: string, warnings: string[], errors: string[], outcome: 'converted' | 'skipped' | 'failed' }
 *
 * Failure modes:
 *   400 — empty input, oversized input, unparseable input
 *   422 — parser ran but produced no rule (e.g. unsupported Sigma feature)
 *   500 — unexpected exception
 */

interface MigrateBody {
  readonly source?: 'sigma' | 'yara' | 'auto';
  readonly text?: string;
}

const MAX_INPUT_BYTES = 64 * 1024; // 64KB ceiling — single-rule demo

function detectSource(text: string): 'sigma' | 'yara' {
  // A YARA rule begins with the `rule` keyword (optionally preceded by
  // `private`/`global`/whitespace/comments). Sigma is YAML, almost always
  // with a top-level `detection:` block. Default to sigma when ambiguous.
  const trimmed = text.trimStart();
  if (/^(?:private\s+|global\s+)*rule\s+[A-Za-z_]/.test(trimmed)) return 'yara';
  return 'sigma';
}

export async function POST(req: Request): Promise<Response> {
  let body: MigrateBody;
  try {
    body = (await req.json()) as MigrateBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text : '';
  if (text.trim().length === 0) {
    return NextResponse.json({ error: 'empty_input' }, { status: 400 });
  }
  if (Buffer.byteLength(text, 'utf-8') > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: 'input_too_large' }, { status: 400 });
  }

  const source: 'sigma' | 'yara' =
    body.source === 'sigma' || body.source === 'yara' ? body.source : detectSource(text);

  try {
    let result;
    if (source === 'sigma') {
      let parsed: unknown;
      try {
        parsed = yaml.load(text);
      } catch (err) {
        return NextResponse.json(
          {
            error: 'sigma_parse_error',
            detail: err instanceof Error ? err.message : 'unknown',
          },
          { status: 400 }
        );
      }
      if (parsed === null || typeof parsed !== 'object') {
        return NextResponse.json(
          { error: 'sigma_not_object', detail: 'top-level YAML must be a mapping' },
          { status: 400 }
        );
      }
      result = await convertSigma(parsed as SigmaRule, {});
    } else {
      result = await convertYara(text, {});
    }

    if (result.outcome === 'skipped' || result.atr === null) {
      return NextResponse.json(
        {
          outcome: result.outcome,
          error: 'rule_skipped',
          skipReason: result.skipReason,
          warnings: result.warnings,
          errors: result.errors,
        },
        { status: 422 }
      );
    }

    const yamlOut = yaml.dump(result.atr, { noRefs: true, lineWidth: 120 });
    return NextResponse.json({
      outcome: result.outcome,
      yaml: yamlOut,
      atrId: result.atr.id,
      warnings: result.warnings,
      errors: result.errors,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'unexpected',
        detail: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500 }
    );
  }
}
