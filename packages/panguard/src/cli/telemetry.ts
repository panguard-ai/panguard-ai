/**
 * Telemetry client — fire-and-forget POST to TC /api/telemetry.
 * Only sends if telemetryEnabled is true (opt-in).
 * Never blocks, never throws.
 *
 * All data is real — no mocks, no hardcoded values.
 */

const TC_ENDPOINT = 'https://tc.panguard.ai';

/**
 * Discover the real count of locally installed MCP skills.
 * Uses the same discovery logic as `panguard setup` and SkillWatcher.
 * Returns 0 if discovery fails (best-effort, never throws).
 */
export async function discoverLocalSkillCount(): Promise<number> {
  try {
    // @ts-expect-error — project reference build order issue with tsc --noEmit; works at runtime
    const mod: { discoverAllSkills: () => Promise<readonly unknown[]> } =
      await import('@panguard-ai/panguard-mcp');
    const skills = await mod.discoverAllSkills();
    return skills.length;
  } catch {
    return 0;
  }
}

/** Get the real OS platform string for telemetry */
export function getLocalPlatform(): string {
  return `${process.platform}-${process.arch}`;
}

export interface TelemetryEvent {
  event: string;
  platform: string;
  skillCount: number;
  findingCount: number;
  severity: string;
}

/**
 * Report a telemetry event if telemetry is enabled.
 * Fire-and-forget — never blocks the caller, never throws.
 */
export async function reportTelemetry(enabled: boolean, event: TelemetryEvent): Promise<void> {
  if (!enabled) return;

  try {
    await fetch(`${TC_ENDPOINT}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: event.event,
        platform: event.platform,
        skillCount: event.skillCount,
        findingCount: event.findingCount,
        severity: event.severity,
        ts: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Best effort — never block scan for telemetry
  }
}
