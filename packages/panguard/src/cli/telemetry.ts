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
    // Use string variable to prevent tsc from resolving the project reference
    const pkg = '@panguard-ai/panguard-mcp';
    const mod = (await import(pkg)) as {
      discoverAllSkills: () => Promise<readonly unknown[]>;
    };
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

  // Send to both endpoints for compatibility:
  // /api/telemetry — new endpoint (may not be deployed yet)
  // /api/usage — proven production endpoint (always works)
  const payload = {
    event: event.event,
    platform: event.platform,
    skillCount: event.skillCount,
    findingCount: event.findingCount,
    severity: event.severity,
    ts: new Date().toISOString(),
  };

  try {
    // Primary: /api/usage (production-proven, always deployed)
    void fetch(`${TC_ENDPOINT}/api/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: `cli_${event.event}`,
        source: 'cli-user',
        metadata: payload,
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});

    // Secondary: /api/telemetry (new, may not be deployed)
    void fetch(`${TC_ENDPOINT}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  } catch {
    // Best effort — never block scan for telemetry
  }
}

export interface ScanCloudEvent {
  /** 'remote' for `pga scan --target`, 'local' for `pga scan` system audit. */
  readonly mode: 'remote' | 'local';
  readonly findingsCount: number;
  /** Risk classification from runScan/runRemoteScan ('LOW'|'MEDIUM'|'HIGH'|'CRITICAL'). */
  readonly riskLevel: string;
}

/**
 * Push the scan to TC via ThreatCloudClient.reportScanEvent. This is the
 * channel that makes `pga scan` an actual sensor — it lands the event in
 * the same Threat Cloud aggregation as `pga audit skill`, so adoption +
 * coverage stats are unified across audit and scan flows.
 *
 * Fire-and-forget. Gated by the same telemetry consent as reportTelemetry.
 * Importing ThreatCloudClient lazily so non-cloud paths never pay the cost.
 */
export async function reportScanToCloud(
  enabled: boolean,
  event: ScanCloudEvent
): Promise<void> {
  if (!enabled) return;
  try {
    const { ThreatCloudClient } = await import('@panguard-ai/panguard-guard');
    const pathMod = await import('node:path');
    const dataDir = pathMod.join(
      process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.',
      '.panguard-guard'
    );
    const tc = await ThreatCloudClient.create(TC_ENDPOINT, dataDir);
    const isCritical = event.riskLevel === 'CRITICAL';
    const isHigh = event.riskLevel === 'HIGH';
    const isClean = event.findingsCount === 0;
    void tc.reportScanEvent({
      source: 'cli-user',
      skillsScanned: 1,
      findingsCount: event.findingsCount,
      confirmedMalicious: isCritical ? 1 : 0,
      highlySuspicious: isHigh ? 1 : 0,
      cleanCount: isClean ? 1 : 0,
    });
  } catch {
    // Best effort — never block scan
  }
}
