import { describe, it, expect } from 'vitest';
import { sharingPatch } from '../src/cli/sharing-switch.js';

describe('sharingPatch', () => {
  it('telemetry false turns off the usage ping and every upload', () => {
    expect(sharingPatch('telemetry', false)).toEqual({
      telemetryEnabled: false,
      threatCloudUploadEnabled: false,
    });
  });

  it('threat-cloud false stops all uploads, the usage ping and rule sync', () => {
    expect(sharingPatch('threat-cloud', false)).toEqual({
      threatCloudUploadEnabled: false,
      telemetryEnabled: false,
      threatCloudRuleSyncEnabled: false,
    });
  });

  it('turning a switch on only sets its own flag', () => {
    expect(sharingPatch('telemetry', true)).toEqual({ telemetryEnabled: true });
    expect(sharingPatch('threat-cloud', true)).toEqual({ threatCloudUploadEnabled: true });
  });
});
