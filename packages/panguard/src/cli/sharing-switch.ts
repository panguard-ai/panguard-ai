/**
 * What `pga config set telemetry|threat-cloud <bool>` changes.
 *
 * Both keys are the same switch: sharing. Turning it ON behaves exactly like
 * accepting the consent prompt (usage ping, uploads and the rule-sync opt-in are
 * set together); turning it OFF stops every upload and download. Every status
 * line and upload gate reads the single predicate `isSharingEnabled`
 * (threatCloudUploadEnabled === true); the other flags are kept in step with it.
 */

export type SharingKey = 'telemetry' | 'threat-cloud';

export interface SharingPatch {
  readonly telemetryEnabled: boolean;
  readonly threatCloudUploadEnabled: boolean;
  readonly threatCloudRuleSyncEnabled: boolean;
}

/** The flags written by the consent prompt, for the given answer. */
export function sharingPatch(_key: SharingKey, enabled: boolean): SharingPatch {
  return {
    telemetryEnabled: enabled,
    threatCloudUploadEnabled: enabled,
    threatCloudRuleSyncEnabled: enabled,
  };
}
