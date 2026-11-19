/**
 * Exact-version npx package specs for the config entries PanGuard writes.
 *
 * An unpinned `npx -y @panguard-ai/...` resolves the latest release on every
 * agent start. PanGuard packages are released in lockstep, so the config is
 * pinned to the version of this (the writing) package.
 */

import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);
const _pkg = _require('../../package.json') as { version: string };

export const MCP_PACKAGE = '@panguard-ai/panguard-mcp';
export const PROXY_PACKAGE = '@panguard-ai/panguard-mcp-proxy';

/** Version of the package that writes the entries. */
export const SELF_VERSION: string = _pkg.version;

/** `<name>@<exact version>` */
export function pinnedSpec(name: string, version: string = SELF_VERSION): string {
  return `${name}@${version}`;
}

/** True for `<name>` or `<name>@<anything>` (pinned or unpinned form). */
export function isSpecOf(arg: unknown, name: string): boolean {
  return typeof arg === 'string' && (arg === name || arg.startsWith(`${name}@`));
}
