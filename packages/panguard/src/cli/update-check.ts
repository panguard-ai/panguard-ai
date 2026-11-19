/**
 * Whether the CLI's own daily version lookup (npm registry, @panguard-ai/panguard)
 * may run. Off when PANGUARD_NO_UPDATE_CHECK is 1, true or yes (an override that
 * always wins) or when the guard config key `updateCheck` is false. The Guard
 * daemon's rule-version lookup reads the same two switches.
 */

export function isUpdateCheckEnabled(
  env: NodeJS.ProcessEnv,
  config: { readonly updateCheck?: boolean }
): boolean {
  const v = (env['PANGUARD_NO_UPDATE_CHECK'] ?? '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return false;
  return config.updateCheck !== false;
}
