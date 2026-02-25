/**
 * SSH Honeypot Service
 * SSH 蜜罐服務
 *
 * Simulates an SSH server to capture brute force attacks,
 * credential stuffing, and post-auth commands.
 * 模擬 SSH 伺服器以捕獲暴力破解、撞庫攻擊及登入後指令。
 *
 * MITRE ATT&CK Coverage:
 * - T1110: Brute Force
 * - T1078: Valid Accounts
 * - T1059: Command and Scripting Interpreter
 *
 * @module @openclaw/panguard-trap/services/ssh-trap
 */

import { createLogger } from '@openclaw/core';
import type { TrapServiceConfig } from '../types.js';
import { BaseTrapService } from './base-service.js';

const logger = createLogger('panguard-trap:service:ssh');

/** Known suspicious commands / 已知可疑指令 */
const SUSPICIOUS_COMMANDS: { pattern: RegExp; technique: string; description: string }[] = [
  { pattern: /wget|curl.*http/i, technique: 'T1105', description: 'Ingress Tool Transfer' },
  { pattern: /chmod\s+[+]?[0-7]*x|chmod\s+777/i, technique: 'T1222', description: 'File and Directory Permissions Modification' },
  { pattern: /\/etc\/shadow|\/etc\/passwd/i, technique: 'T1003', description: 'OS Credential Dumping' },
  { pattern: /crontab|\/etc\/cron/i, technique: 'T1053', description: 'Scheduled Task/Job' },
  { pattern: /base64\s+-d|echo.*\|.*sh/i, technique: 'T1140', description: 'Deobfuscate/Decode Files or Information' },
  { pattern: /nc\s+-|ncat|netcat/i, technique: 'T1571', description: 'Non-Standard Port' },
  { pattern: /iptables.*-D|ufw\s+disable/i, technique: 'T1562', description: 'Impair Defenses' },
  { pattern: /rm\s+-rf\s+\/|dd\s+if=\/dev\/zero/i, technique: 'T1485', description: 'Data Destruction' },
  { pattern: /xmrig|minerd|crypto/i, technique: 'T1496', description: 'Resource Hijacking (Cryptomining)' },
  { pattern: /ssh-keygen|authorized_keys/i, technique: 'T1098', description: 'Account Manipulation' },
  { pattern: /id\s*$|whoami|uname\s+-a/i, technique: 'T1082', description: 'System Information Discovery' },
  { pattern: /ifconfig|ip\s+addr/i, technique: 'T1016', description: 'System Network Configuration Discovery' },
  { pattern: /cat\s+\/proc|ps\s+aux/i, technique: 'T1057', description: 'Process Discovery' },
];

/** Fake filesystem responses / 假檔案系統回應 */
const FAKE_RESPONSES: Record<string, string> = {
  'id': 'uid=1000(admin) gid=1000(admin) groups=1000(admin),27(sudo)',
  'whoami': 'admin',
  'uname -a': 'Linux web-server-01 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux',
  'pwd': '/home/admin',
  'ls': 'Desktop  Documents  Downloads  backup.tar.gz  deploy.sh',
  'ls -la': 'total 48\ndrwxr-xr-x 6 admin admin 4096 Jan 15 10:30 .\ndrwxr-xr-x 3 root  root  4096 Dec  1  2024 ..\n-rw-r--r-- 1 admin admin  220 Dec  1  2024 .bash_logout\n-rw-r--r-- 1 admin admin 3771 Dec  1  2024 .bashrc\ndrwxr-xr-x 2 admin admin 4096 Jan 15 10:30 Desktop\ndrwxr-xr-x 2 admin admin 4096 Jan 10 08:15 Documents\n-rw-r--r-- 1 admin admin 8192 Jan 14 16:45 backup.tar.gz\n-rwxr-xr-x 1 admin admin  512 Jan 12 09:00 deploy.sh',
  'cat /etc/passwd': 'root:x:0:0:root:/root:/bin/bash\nadmin:x:1000:1000:Admin:/home/admin:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
  'ifconfig': 'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet 10.0.1.100  netmask 255.255.255.0  broadcast 10.0.1.255',
  'hostname': 'web-server-01',
};

/**
 * SSH Honeypot service
 * SSH 蜜罐服務
 */
export class SSHTrapService extends BaseTrapService {
  private server: ReturnType<typeof import('node:net').createServer> | null = null;
  private readonly sshBanner: string;

  constructor(config: TrapServiceConfig) {
    super({ ...config, type: 'ssh' });
    this.sshBanner = config.banner ?? 'SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6';
  }

  protected async doStart(): Promise<void> {
    const net = await import('node:net');
    this.server = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, () => {
        resolve();
      });
      this.server!.on('error', reject);
    });
  }

  protected async doStop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private handleConnection(socket: import('node:net').Socket): void {
    const remoteIP = socket.remoteAddress ?? 'unknown';
    const remotePort = socket.remotePort ?? 0;
    const session = this.createSession(remoteIP, remotePort);

    // Add MITRE technique for initial access
    this.addMitreTechnique(session.sessionId, 'T1110');

    // Send SSH banner
    socket.write(`${this.sshBanner}\r\n`);

    let authAttempts = 0;
    let authenticated = false;
    let inputBuffer = '';

    // Set timeout
    const timeout = this.config.sessionTimeoutMs ?? 30_000;
    socket.setTimeout(timeout);

    socket.on('data', (data: Buffer) => {
      const input = data.toString().trim();
      inputBuffer += input;

      if (!authenticated) {
        // Simulate SSH auth protocol (simplified)
        authAttempts++;

        // Parse username:password from input
        const parts = inputBuffer.split('\n').filter(Boolean);
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.includes(':')) {
            const [username, password] = trimmed.split(':');
            if (username && password) {
              const shouldGrant = this.config.maxConnections
                ? authAttempts >= (this.config.responseDelayMs ? 3 : 5)
                : false;
              this.recordCredential(session.sessionId, username, password, shouldGrant);

              if (shouldGrant) {
                authenticated = true;
                this.addMitreTechnique(session.sessionId, 'T1078');
                socket.write('admin@web-server-01:~$ ');
              } else {
                socket.write('Permission denied, please try again.\r\n');
              }
            }
          }
        }
        inputBuffer = '';
      } else {
        // Post-auth: record commands
        const lines = input.split('\n').filter(Boolean);
        for (const line of lines) {
          const command = line.trim();
          if (!command) continue;

          if (command === 'exit' || command === 'quit' || command === 'logout') {
            socket.end();
            return;
          }

          this.recordCommand(session.sessionId, command);
          this.addMitreTechnique(session.sessionId, 'T1059');

          // Check for suspicious commands
          for (const sus of SUSPICIOUS_COMMANDS) {
            if (sus.pattern.test(command)) {
              this.addMitreTechnique(session.sessionId, sus.technique);
              this.recordEvent(session.sessionId, 'exploit_attempt', command, {
                technique: sus.technique,
                description: sus.description,
              });
            }
          }

          // Send fake response
          const response = this.getFakeResponse(command);
          socket.write(`${response}\r\nadmin@web-server-01:~$ `);
        }
      }
    });

    socket.on('timeout', () => {
      logger.info(`SSH session timeout: ${session.sessionId} / SSH 連線逾時`);
      socket.end();
    });

    socket.on('close', () => {
      this.endSession(session.sessionId);
    });

    socket.on('error', (err) => {
      logger.debug(`SSH socket error: ${err.message}`);
      this.endSession(session.sessionId);
    });
  }

  /** Get fake response for a command / 取得指令的假回應 */
  private getFakeResponse(command: string): string {
    // Check exact matches first
    const exactMatch = FAKE_RESPONSES[command];
    if (exactMatch) return exactMatch;

    // Check partial matches
    for (const [cmd, response] of Object.entries(FAKE_RESPONSES)) {
      if (command.startsWith(cmd)) return response;
    }

    // Generic responses
    if (command.startsWith('cd ')) return '';
    if (command.startsWith('echo ')) return command.slice(5);
    if (command.startsWith('cat ')) return `cat: ${command.slice(4)}: No such file or directory`;

    return `bash: ${command.split(' ')[0]}: command not found`;
  }
}
