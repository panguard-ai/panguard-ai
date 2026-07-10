/**
 * Shared secret-input helper for the Panguard CLI.
 *
 * Secrets (API keys, encryption keys, tokens) must never be accepted as a
 * command-line flag: argv is visible to any local process via `ps aux` and
 * is written into shell history in cleartext. The project's secret-input
 * hierarchy is: env > stdin > file > argv (never).
 *
 * @module @panguard-ai/panguard/cli/secret-input
 */

/**
 * Read a secret from stdin without echoing it. The key never appears on
 * screen, in argv, or in shell history. Falls back to a plain line read
 * when stdin is not a TTY (e.g. piped input in scripts).
 */
export function readSecret(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const NL = String.fromCharCode(10);
    process.stdout.write(prompt);
    stdin.setEncoding('utf-8');

    if (!stdin.isTTY) {
      stdin.resume();
      stdin.once('data', (data: string) => {
        stdin.pause();
        resolve(data.trim());
      });
      return;
    }

    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    let buf = '';
    const onData = (ch: string): void => {
      const code = ch.charCodeAt(0);
      // Enter (CR=13 / LF=10) or Ctrl-D (EOT=4) terminates input.
      if (code === 13 || code === 10 || code === 4) {
        stdin.removeListener('data', onData);
        stdin.setRawMode(wasRaw);
        stdin.pause();
        process.stdout.write(NL);
        resolve(buf.trim());
        return;
      }
      if (code === 3) {
        // Ctrl-C: abort without leaking the buffer.
        stdin.setRawMode(wasRaw);
        process.stdout.write(NL);
        process.exit(130);
      }
      if (code === 127 || code === 8) {
        buf = buf.slice(0, -1);
        return;
      }
      buf += ch;
    };
    stdin.on('data', onData);
  });
}
