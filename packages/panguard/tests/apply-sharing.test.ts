import { describe, it, expect, vi } from 'vitest';
import { applySharingToRunningGuard } from '../src/cli/apply-sharing.js';
import type { ApplyDeps } from '../src/cli/apply-sharing.js';

function deps(over: Partial<ApplyDeps> = {}): ApplyDeps {
  return {
    serviceInstalled: () => false,
    restartService: () => true,
    daemonPid: () => null,
    signal: () => true,
    platform: 'darwin',
    ...over,
  };
}

describe('applySharingToRunningGuard', () => {
  it('restarts an installed service for either direction', async () => {
    const restart = vi.fn(() => true);
    const d = deps({ serviceInstalled: () => true, restartService: restart });
    expect(await applySharingToRunningGuard(false, d)).toBe('service-restarted');
    expect(await applySharingToRunningGuard(true, d)).toBe('service-restarted');
    expect(restart).toHaveBeenCalledTimes(2);
  });

  it('signals a hand-started daemon when sharing is turned off', async () => {
    const signal = vi.fn(() => true);
    const d = deps({ daemonPid: () => 4242, signal });
    expect(await applySharingToRunningGuard(false, d)).toBe('signalled');
    expect(signal).toHaveBeenCalledWith(4242);
  });

  it('asks for a restart when sharing is turned on in a running daemon', async () => {
    const signal = vi.fn(() => true);
    expect(await applySharingToRunningGuard(true, deps({ daemonPid: () => 4242, signal }))).toBe(
      'restart-needed'
    );
    expect(signal).not.toHaveBeenCalled();
  });

  it('does nothing when no daemon runs, and falls back when the service restart fails', async () => {
    expect(await applySharingToRunningGuard(false, deps())).toBe('no-daemon');
    const failing = deps({ serviceInstalled: () => true, restartService: () => false });
    expect(await applySharingToRunningGuard(false, failing)).toBe('no-daemon');
  });
});
