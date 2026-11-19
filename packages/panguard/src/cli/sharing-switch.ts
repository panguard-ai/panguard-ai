/**
 * What `pga config set telemetry|threat-cloud <bool>` changes.
 *
 * Every upload is gated on `threatCloudUploadEnabled`; `telemetryEnabled` gates
 * the usage ping. Turning either switch OFF must stop all uploads, so both flags
 * go false together (and `threat-cloud false` also stops rule sync). Turning a
 * switch ON only sets that switch's own flag: enabling sharing is an explicit,
 * separate act.
 */

export type SharingKey = 'telemetry' | 'threat-cloud';

export interface SharingPatch {
  readonly telemetryEnabled?: boolean;
  readonly threatCloudUploadEnabled?: boolean;
  readonly threatCloudRuleSyncEnabled?: boolean;
}

export function sharingPatch(key: SharingKey, enabled: boolean): SharingPatch {
  if (enabled) {
    return key === 'telemetry' ? { telemetryEnabled: true } : { threatCloudUploadEnabled: true };
  }
  return key === 'telemetry'
    ? { telemetryEnabled: false, threatCloudUploadEnabled: false }
    : {
        threatCloudUploadEnabled: false,
        telemetryEnabled: false,
        threatCloudRuleSyncEnabled: false,
      };
}
