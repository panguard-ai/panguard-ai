/**
 * `pga proposals` — review detection-rule proposals kept on this machine and
 * send them to the ATR project as a pre-filled public GitHub issue.
 *
 *   pga proposals list            what is waiting in ~/.panguard/proposals
 *   pga proposals show <id>       the exact, de-identified text that would be published
 *   pga proposals submit <id>     open the pre-filled ATR "New Rule Proposal" issue
 *
 * Nothing is ever posted by this command: `submit` only opens a browser at a
 * pre-filled issue form. The user reads it, edits it if they want, and presses
 * Submit from their own GitHub account. No token and no Threat Cloud needed.
 *
 * @module @panguard-ai/panguard/cli/commands/proposals
 */

import { Command } from 'commander';
import { c, symbols } from '@panguard-ai/core';
import {
  buildAtrIssueUrl,
  listOutbox,
  readOutboxRecord,
  markOutboxOpened,
  defaultOutboxDir,
} from '@panguard-ai/panguard-guard';
import type { OutboxRecord } from '@panguard-ai/panguard-guard';
import { openBrowser } from '../device-flow.js';

interface JsonOption {
  json?: boolean;
}

function printList(records: readonly OutboxRecord[]): void {
  console.log('');
  if (records.length === 0) {
    console.log(`  ${c.dim('No detection rule proposals saved on this machine.')}`);
    console.log(`  ${c.dim(`(${defaultOutboxDir()})`)}`);
    console.log('');
    return;
  }
  console.log(`  ${c.bold(`${records.length} proposal(s) saved on this machine`)}`);
  console.log('');
  for (const r of records) {
    const state = r.status === 'opened' ? c.dim('opened') : c.caution('pending');
    console.log(`  ${c.bold(r.id)}  ${state}  ${c.dim(r.createdAt.slice(0, 10))}`);
    console.log(`    ${r.issue.title}`);
  }
  console.log('');
  console.log(`  ${c.dim('Read one:  pga proposals show <id>')}`);
  console.log(`  ${c.dim('Send one:  pga proposals submit <id>')}`);
  console.log('');
}

function printRecord(record: OutboxRecord, url: string, truncated: boolean): void {
  const f = record.issue;
  console.log('');
  console.log(`  ${c.bold('This is what the public ATR issue will contain')}`);
  console.log(`  ${c.dim('De-identified on this machine. Read it before you submit.')}`);
  console.log('');
  console.log(`  ${c.bold('Title')}             ${f.title}`);
  console.log(`  ${c.bold('Attack Type')}       ${f.attackType}`);
  if (f.references) console.log(`  ${c.bold('References')}        ${f.references}`);
  console.log(`  ${c.bold('Description')}`);
  console.log(indent(f.description));
  console.log(`  ${c.bold('Example Attack Payload')}`);
  console.log(indent(f.payload));
  if (f.falsePositives)
    console.log(`  ${c.bold('Potential False Positives')}  ${f.falsePositives}`);
  if (truncated) {
    console.log('');
    console.log(`  ${c.caution(symbols.warn)} The payload was shortened to fit the issue link.`);
  }
  console.log('');
  console.log(`  ${c.dim('Issue link:')}`);
  console.log(`  ${url}`);
  console.log('');
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n');
}

function requireRecord(id: string, json: boolean | undefined): OutboxRecord | null {
  const record = readOutboxRecord(id);
  if (!record) {
    if (json) console.log(JSON.stringify({ error: 'not_found', id }, null, 2));
    else
      console.log(
        `\n  ${c.caution(symbols.warn)} No proposal with id ${id}. Run \`pga proposals list\`.\n`
      );
    process.exitCode = 1;
  }
  return record;
}

export function proposalsCommand(): Command {
  const cmd = new Command('proposals').description(
    'Review detection rule proposals saved on this machine and send them to ATR'
  );

  cmd
    .command('list')
    .description('List proposals waiting in ~/.panguard/proposals')
    .option('--json', 'Output as JSON')
    .action((opts: JsonOption) => {
      const records = listOutbox();
      if (opts.json) console.log(JSON.stringify(records, null, 2));
      else printList(records);
    });

  cmd
    .command('show <id>')
    .description('Show the de-identified text and the pre-filled ATR issue link')
    .option('--json', 'Output as JSON')
    .option('--open', 'Also open the pre-filled issue in your browser')
    .action((id: string, opts: JsonOption & { open?: boolean }) => {
      const record = requireRecord(id, opts.json);
      if (!record) return;
      const link = buildAtrIssueUrl(record.issue);
      if (opts.json)
        console.log(
          JSON.stringify({ ...record, issueUrl: link.url, truncated: link.truncated }, null, 2)
        );
      else printRecord(record, link.url, link.truncated);
      if (opts.open) {
        openBrowser(link.url);
        markOutboxOpened(record.id);
      }
    });

  cmd
    .command('submit <id>')
    .description('Open the pre-filled ATR issue; you review it and press Submit yourself')
    .option('--no-open', 'Only print the link, do not open a browser')
    .action((id: string, opts: { open?: boolean }) => {
      const record = requireRecord(id, false);
      if (!record) return;
      const link = buildAtrIssueUrl(record.issue);
      printRecord(record, link.url, link.truncated);
      if (opts.open === false) return;
      openBrowser(link.url);
      markOutboxOpened(record.id);
      console.log(
        `  ${c.safe(symbols.pass)} Opened in your browser. Nothing is posted until you press Submit on GitHub.`
      );
      console.log('');
    });

  return cmd;
}
