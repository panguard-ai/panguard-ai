import { describe, it, expect, vi, afterEach } from 'vitest';

// A tool that never answers, like lsof blocked on an unresponsive network mount.
// promisify on this mock resolves with the second callback argument, so pass { stdout, stderr } as execFile's own promise does.
type Callback = (err: Error | null, out?: { stdout: string; stderr: string }) => void;
const pending: Callback[] = [];
vi.mock('node:child_process', () => ({
  execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: Callback) => {
    pending.push(cb);
  }),
}));
vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:os')>()),
  platform: () => 'darwin',
}));

const { execFile } = await import('node:child_process');
const { NetworkMonitor } = await import('../src/monitor/network-monitor.js');

const LSOF_HEADER = 'COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME\n';

describe('NetworkMonitor polling', () => {
  afterEach(() => {
    vi.useRealTimers();
    pending.length = 0;
    vi.mocked(execFile).mockClear();
  });

  it('does not start another poll while the previous one is still running', async () => {
    vi.useFakeTimers();
    const monitor = new NetworkMonitor(1000);
    monitor.start();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(execFile).toHaveBeenCalledTimes(1);
    monitor.stop();
  });

  it('polls again once the stuck poll finishes', async () => {
    vi.useFakeTimers();
    const monitor = new NetworkMonitor(1000);
    const seen: unknown[] = [];
    monitor.on('new_connection', (e) => seen.push(e));
    monitor.start();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(execFile).toHaveBeenCalledTimes(1);

    pending.shift()!(null, {
      stdout: LSOF_HEADER + 'node 42 me 20u IPv4 0x1 0t0 UDP 10.0.0.2:51000->93.184.216.34:443\n',
      stderr: '',
    });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(seen).toHaveLength(1);
    expect(execFile).toHaveBeenCalledTimes(2);
    monitor.stop();
  });
});
