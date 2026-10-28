import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ComponentProps } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider, type IntlError } from 'next-intl';

// next-intl's createNavigation imports next/navigation, which Node ESM cannot resolve outside a
// Next build; the back link is a plain anchor here.
vi.mock('@/navigation', async () => {
  const { createElement } = await import('react');
  return { Link: (props: ComponentProps<'a'>) => createElement('a', props) };
});

import SigningKeyContent from '../../src/app/[locale]/trust/signing-key/SigningKeyContent';

/**
 * The trust page and /.well-known/panguard-signing-key.json publish the same keys. Visitors pin
 * what the page shows, so every displayed key ID, PEM and verify command must match the file.
 */
const WEBSITE = join(__dirname, '..', '..');

interface PublishedKey {
  key_id: string;
  status: string;
  alg: string;
  usage: string;
  payload_format: string;
  created_at: string;
  public_key_pem: string;
}

interface SigningKeyMessages {
  facts: {
    keyId: string;
    algorithm: string;
    created: string;
    usage: string;
    usageValue: string;
    payloadFormat: string;
  };
  pem: { copy: string; copied: string };
  verify: { copy: string };
  receipt: { usageValue: string; desc: string };
}

/** The file each key verifies, as named in its verify command ("pin the key that matches the file"). */
const VERIFY_FILE_BY_USAGE: Readonly<Record<string, string>> = {
  'audit-report-signing': 'report.json',
  'technical-receipt-signing': 'receipt.json',
};

function activeKeys(): ReadonlyArray<PublishedKey> {
  const path = join(WEBSITE, 'public', '.well-known', 'panguard-signing-key.json');
  const doc = JSON.parse(readFileSync(path, 'utf8')) as { keys: ReadonlyArray<PublishedKey> };
  return doc.keys.filter((key) => key.status === 'active');
}

function keyWithUsage(usage: string): PublishedKey {
  const key = activeKeys().find((candidate) => candidate.usage === usage);
  if (!key) throw new Error(`no active key with usage ${usage}`);
  return key;
}

function verifyCommand(key: PublishedKey): string {
  return `pga report sign verify ${VERIFY_FILE_BY_USAGE[key.usage]} --expect-key ${key.key_id}`;
}

function usageLabel(messages: SigningKeyMessages, usage: string): string | undefined {
  const labels: Readonly<Record<string, string>> = {
    'audit-report-signing': messages.facts.usageValue,
    'technical-receipt-signing': messages.receipt.usageValue,
  };
  return labels[usage];
}

function renderPage(locale: string) {
  const messages = JSON.parse(
    readFileSync(join(WEBSITE, 'messages', `${locale}.json`), 'utf8')
  ) as Record<string, unknown>;
  const onError = vi.fn<(error: IntlError) => void>();
  const view = render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC" onError={onError}>
      <SigningKeyContent />
    </NextIntlClientProvider>
  );
  const intlErrors = () => onError.mock.calls.map(([error]) => `${error.code}: ${error.message}`);
  return { ...view, intlErrors, t: messages.trustSigningKey as SigningKeyMessages };
}

/** Label -> value pairs of a key facts list, as a visitor reads them. */
function readFacts(list: Element): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Array.from(list.querySelectorAll('dt'), (dt) => [
      dt.textContent ?? '',
      dt.nextElementSibling?.textContent ?? '',
    ])
  );
}

/** The PEM or command text displayed in the nearest section that encloses a Copy button. */
function displayedNear(element: Element | null): ReadonlyArray<string> {
  if (element === null) return [];
  const shown = Array.from(element.querySelectorAll('pre, code'), (el) => el.textContent ?? '');
  return shown.length > 0 ? shown : displayedNear(element.parentElement);
}

function copyButtons(t: SigningKeyMessages): ReadonlyArray<HTMLElement> {
  const labels = new Set([t.pem.copy, t.verify.copy]);
  return screen.getAllByRole('button', { name: (name) => labels.has(name) });
}

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window.navigator, 'clipboard');
});

describe('SigningKeyContent', () => {
  /**
   * Value: protects=each active well-known key is shown with its own key ID, PEM, facts, usage
   *   label and verify command; en and zh-TW render with no missing message;
   * fails_when=RECEIPT_KEY or SIGNING_KEY drifts from the file, the receipt card reuses audit
   *   values or label, a command pins the wrong key, or zh-TW lacks a key;
   * why_new=no website test renders the signing-key page or compares it with the well-known file;
   * seam=none;
   * no_claim=renders SigningKeyContent alone (raw locale JSON, Link mocked as <a>); not the Next
   *   route, metadata or the deployed /.well-known response.
   */
  it.each(['en', 'zh-TW'])(
    '%s: shows every active key with the facts, PEM and verify command published in the well-known file',
    (locale) => {
      const { container, intlErrors, t } = renderPage(locale);
      const keys = activeKeys();
      const pems = Array.from(container.querySelectorAll('pre'), (pre) => pre.textContent);
      const commands = Array.from(container.querySelectorAll('code'), (code) => code.textContent);

      expect(intlErrors()).toEqual([]);
      for (const key of keys) {
        const list = screen.getByText(key.key_id, { selector: 'dd' }).closest('dl');
        expect(list, key.key_id).not.toBeNull();
        expect(readFacts(list as Element), key.key_id).toMatchObject({
          [t.facts.keyId]: key.key_id,
          [t.facts.algorithm]: key.alg,
          [t.facts.created]: key.created_at.slice(0, 10),
          [t.facts.payloadFormat]: key.payload_format,
          [t.facts.usage]: usageLabel(t, key.usage),
        });
        expect(pems, key.key_id).toContain(key.public_key_pem.trimEnd());
        expect(commands, key.key_id).toContain(verifyCommand(key));
      }

      const shownKeyIds = Array.from(new Set(container.textContent?.match(/pgk1-[0-9a-f]{16}/g)));
      expect([...shownKeyIds].sort()).toEqual(keys.map((key) => key.key_id).sort());
      expect(screen.getByText(t.receipt.desc)).toBeInTheDocument();
    }
  );

  /**
   * Value: protects=each Copy button writes exactly the PEM or command shown in its own section,
   *   every active key's PEM and command is copyable, and it shows Copied;
   * fails_when=a CopyButton text prop is bound to the other key's constant, or the copied text
   *   differs from the text displayed beside the button;
   * why_new=the render test reads displayed text only; nothing exercises CopyButton or what
   *   reaches the clipboard;
   * seam=none;
   * no_claim=navigator.clipboard is a vi.fn stub in jsdom; browser permissions, secure-context
   *   rules and the 1.6 s label reset are not exercised.
   */
  it('copies exactly the PEM or command shown beside each Copy button and confirms it', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { t } = renderPage('en');
    const buttons = copyButtons(t);
    const keys = activeKeys();

    expect(buttons).toHaveLength(keys.length * 2);
    for (const button of buttons) {
      fireEvent.click(button);
      await waitFor(() => expect(button).toHaveTextContent(t.pem.copied));
    }

    const copied = writeText.mock.calls.map(([text]) => text);
    buttons.forEach((button, index) => {
      expect(displayedNear(button.parentElement)).toContain(copied[index]);
    });
    const published = keys.flatMap((key) => [key.public_key_pem.trimEnd(), verifyCommand(key)]);
    expect([...copied].sort()).toEqual([...published].sort());
  });

  /**
   * Value: protects=when the clipboard rejects the write, the button keeps its Copy label (no false
   *   Copied confirmation) and the rejection is handled;
   * fails_when=setCopied(true) runs before or regardless of the awaited write; a dropped try/catch
   *   fails the run as an unhandled rejection, not this assertion;
   * why_new=no test reaches CopyButton's catch path; the copy test only covers resolved writes;
   * seam=none;
   * no_claim=the rejection is a stubbed writeText; a real browser permission denial and
   *   non-secure-context behavior are not exercised.
   */
  it('keeps the Copy label when the clipboard rejects the receipt key write', async () => {
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new DOMException('Write permission denied', 'NotAllowedError'));
    stubClipboard(writeText);
    const { t } = renderPage('en');
    const receiptPem = keyWithUsage('technical-receipt-signing').public_key_pem.trimEnd();
    const button = copyButtons(t).find((candidate) =>
      displayedNear(candidate.parentElement).includes(receiptPem)
    );
    if (!button) throw new Error('no Copy button beside the receipt key PEM');

    fireEvent.click(button);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(writeText).toHaveBeenCalledWith(receiptPem);
    expect(button.textContent).toBe(t.pem.copy);
  });
});
