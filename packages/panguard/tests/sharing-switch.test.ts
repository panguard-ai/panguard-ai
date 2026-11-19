import { describe, it, expect } from 'vitest';
import { sharingPatch } from '../src/cli/sharing-switch.js';
import { isSharingEnabled } from '../src/cli/guard-config.js';

describe('sharingPatch', () => {
  it('both keys are the same switch and behave like the consent prompt', () => {
    const on = {
      telemetryEnabled: true,
      threatCloudUploadEnabled: true,
      threatCloudRuleSyncEnabled: true,
    };
    const off = {
      telemetryEnabled: false,
      threatCloudUploadEnabled: false,
      threatCloudRuleSyncEnabled: false,
    };
    expect(sharingPatch('telemetry', true)).toEqual(on);
    expect(sharingPatch('threat-cloud', true)).toEqual(on);
    expect(sharingPatch('telemetry', false)).toEqual(off);
    expect(sharingPatch('threat-cloud', false)).toEqual(off);
  });

  it('every status line reads the same predicate as the switch writes', () => {
    expect(isSharingEnabled({ ...sharingPatch('threat-cloud', true) })).toBe(true);
    expect(isSharingEnabled({ ...sharingPatch('telemetry', true) })).toBe(true);
    expect(isSharingEnabled({ ...sharingPatch('telemetry', false) })).toBe(false);
    expect(isSharingEnabled({ telemetryEnabled: true })).toBe(false);
    expect(isSharingEnabled({})).toBe(false);
  });
});
