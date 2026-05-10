/**
 * panguard trap — honeypot system
 * Delegates to @panguard-ai/panguard-trap/cli executeCli().
 *
 * The trap engine (TCP listeners for ssh/http/ftp/redis/etc + attacker
 * profiler + intel reporter) lives in packages/panguard-trap. This file
 * just exposes its existing CLI surface as subcommands of `pga trap`.
 */

import { Command } from 'commander';

type ExecuteCli = (args: string[]) => Promise<void>;

async function loadTrapCli(): Promise<ExecuteCli> {
  // Use a string variable so tsc's project-reference checker doesn't try
  // to resolve the workspace target at typecheck time. The subpath
  // ./cli is declared in @panguard-ai/panguard-trap/package.json.
  const pkg = '@panguard-ai/panguard-trap/cli';
  const mod = (await import(pkg)) as { executeCli: ExecuteCli };
  return mod.executeCli;
}

function delegate(subcommand: string) {
  return async (rawOpts: Record<string, unknown>) => {
    try {
      const executeCli = await loadTrapCli();
      const args: string[] = [subcommand];
      // Pass through known flags so the trap CLI argument parser handles them.
      if (typeof rawOpts['services'] === 'string') {
        args.push('--services', rawOpts['services'] as string);
      }
      if (typeof rawOpts['port'] === 'string' || typeof rawOpts['port'] === 'number') {
        args.push('--port', String(rawOpts['port']));
      }
      if (typeof rawOpts['dataDir'] === 'string') {
        args.push('--data-dir', rawOpts['dataDir'] as string);
      }
      // commander stores --no-cloud as cloud=false. The underlying CLI expects
      // the explicit --no-cloud flag.
      if (rawOpts['cloud'] === false) {
        args.push('--no-cloud');
      }
      if (rawOpts['verbose'] === true) {
        args.push('--verbose');
      }
      await executeCli(args);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  pga trap ${subcommand}: ${msg}`);
      process.exitCode = 1;
    }
  };
}

export function trapCommand(): Command {
  const cmd = new Command('trap').description(
    'Honeypot system — SSH/HTTP/FTP/Redis/Telnet decoy services for attacker profiling'
  );

  cmd
    .command('start')
    .description('Start honeypot services (foreground; Ctrl+C to stop)')
    .option(
      '--services <types>',
      'Comma-separated service types (ssh,http,ftp,telnet,mysql,redis,smb,rdp)'
    )
    .option('--port <number>', 'Override port for single service')
    .option('--data-dir <path>', 'Data directory for logs and PID file')
    .option('--no-cloud', 'Disable Threat Cloud upload')
    .option('--verbose', 'Verbose output')
    .action(delegate('start'));

  cmd.command('stop').description('Stop honeypot services').action(delegate('stop'));

  cmd
    .command('status')
    .description('Show current status and statistics')
    .option('--data-dir <path>', 'Data directory')
    .action(delegate('status'));

  cmd
    .command('config')
    .description('Show current configuration')
    .option('--services <types>', 'Comma-separated service types')
    .option('--data-dir <path>', 'Data directory')
    .option('--no-cloud', 'Disable Threat Cloud upload')
    .action(delegate('config'));

  cmd
    .command('deploy')
    .description('Deploy specific trap services (smoke test, starts then stops)')
    .option('--services <types>', 'Comma-separated service types')
    .option('--data-dir <path>', 'Data directory')
    .action(delegate('deploy'));

  cmd
    .command('profiles')
    .description('Show captured attacker profiles (requires running trap)')
    .action(delegate('profiles'));

  cmd
    .command('intel')
    .description('Show threat intelligence summary (requires running trap)')
    .action(delegate('intel'));

  return cmd;
}
