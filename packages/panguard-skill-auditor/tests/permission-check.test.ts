import { describe, it, expect } from 'vitest';
import { checkPermissions } from '../src/checks/permission-check.js';
import type { SkillManifest } from '../src/types.js';

function makeManifest(overrides: Partial<SkillManifest> = {}): SkillManifest {
  return {
    name: 'Test Skill',
    description: 'A test skill',
    instructions: '',
    ...overrides,
  };
}

describe('checkPermissions', () => {
  describe('no tool patterns matched', () => {
    it('should return pass status when instructions contain no tool patterns', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'This skill generates creative writing based on user prompts.',
        })
      );
      expect(result.status).toBe('pass');
    });

    it('should return no findings for benign instructions', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Help the user think through a math problem step by step.',
        })
      );
      expect(result.findings).toHaveLength(0);
    });

    it('should include "No special tool usage detected" in label', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Summarize the provided text.',
        })
      );
      expect(result.label).toContain('No special tool usage detected');
    });
  });

  describe('Bash/Shell detection', () => {
    it('should detect shell command execution but not create finding (low risk)', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Execute the command on your system using sh -c.',
        })
      );
      // Bash/Shell is low risk — detected in label but no finding created
      const finding = result.findings.find((f) => f.id === 'perm-bash-shell');
      expect(finding).toBeUndefined();
      expect(result.label).toContain('Bash/Shell');
    });

    it('should NOT match mere mention of "terminal" or "shell" without execution intent', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'This is a terminal-based text formatter.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-bash-shell');
      expect(finding).toBeUndefined();
    });

    it('should return pass status when only Bash/Shell is detected (low risk)', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Run command using bash -c to set up the environment.',
        })
      );
      expect(result.status).toBe('pass');
    });
  });

  describe('Database detection', () => {
    it('should return medium severity finding when explicit DB operations are mentioned', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Connect to postgres and retrieve records.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-database');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('medium');
    });

    it('should detect SQL SELECT statement', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Execute SELECT * FROM users to get all records.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-database');
      expect(finding).toBeDefined();
    });

    it('should detect postgres keyword', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Connect to postgresql and retrieve records.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-database');
      expect(finding).toBeDefined();
    });

    it('should detect mongodb keyword', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Query the mongodb collection for user data.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-database');
      expect(finding).toBeDefined();
    });

    it('should NOT match generic words like "update" or "query"', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Update a Notion page and query the API for results.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-database');
      expect(finding).toBeUndefined();
    });
  });

  describe('File Write detection', () => {
    it('should return medium severity finding when file write is mentioned', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Write the results to a file on disk.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-file-write');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('medium');
    });

    it('should detect "create file" pattern', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Create a file with the output.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-file-write');
      expect(finding).toBeDefined();
    });

    it('should detect "overwrite" keyword', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Overwrite the existing configuration.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-file-write');
      expect(finding).toBeDefined();
    });
  });

  describe('Network/HTTP detection', () => {
    it('should return medium severity finding when HTTP request is mentioned', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Make an http request to retrieve the data.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-network-http');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('medium');
    });

    it('should detect "download" keyword', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Download data from the remote API.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-network-http');
      expect(finding).toBeDefined();
    });

    it('should detect "api call" pattern', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Perform an api call to retrieve weather data.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-network-http');
      expect(finding).toBeDefined();
    });

    it('should NOT match "curl" as bare keyword (too common in docs)', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Use curl to check the weather.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-network-http');
      // curl is now only caught by tool-poisoning patterns when piped, not by permission check
      expect(finding).toBeUndefined();
    });
  });

  describe('SSH/Keys detection', () => {
    it('should return high severity finding when SSH keys are mentioned', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Generate a key using ssh-keygen for authentication.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-ssh-keys');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('high');
    });

    it('should detect "authorized_keys" reference', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Add your public key to authorized_keys.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-ssh-keys');
      expect(finding).toBeDefined();
    });

    it('should detect id_rsa reference', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Read the private key at ~/.ssh/id_rsa.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-ssh-keys');
      expect(finding).toBeDefined();
    });
  });

  describe('Cron/Scheduler detection', () => {
    it('should return high severity finding when crontab is mentioned', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Edit crontab to schedule the backup task.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-cron-scheduler');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('high');
    });

    it('should detect "systemctl enable" pattern', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Run systemctl enable myservice to auto-start.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-cron-scheduler');
      expect(finding).toBeDefined();
    });
  });

  describe('Docker detection', () => {
    it('should return high severity finding when docker run is mentioned', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Execute docker run -it ubuntu bash to start a container.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-docker');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('high');
    });

    it('should detect "docker exec" pattern', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Use docker exec to run commands inside the container.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-docker');
      expect(finding).toBeDefined();
    });

    it('should detect "docker.sock" reference', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Mount /var/run/docker.sock for container access.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-docker');
      expect(finding).toBeDefined();
    });

    it('should detect "--privileged" flag reference adjacent to word char', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Pass the--privileged option to gain elevated access.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-docker');
      expect(finding).toBeDefined();
    });
  });

  describe('Env Injection detection', () => {
    it('should detect write to .bashrc profile file', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Append to ~/.bashrc with echo "export PATH=/mal" >> ~/.bashrc',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-env-injection');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('high');
    });

    it('should detect write to .zshrc profile file', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Write to ~/.zshrc to inject persistent env vars.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-env-injection');
      expect(finding).toBeDefined();
    });

    it('should NOT flag simple export VAR= statements', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Run export MY_VAR=value to set the variable.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-env-injection');
      expect(finding).toBeUndefined();
    });

    it('should NOT flag mention of environment variables without profile write', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Set DATABASE_URL and API_KEY as environment variables for deployment.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-env-injection');
      expect(finding).toBeUndefined();
    });
  });

  describe('Clipboard detection', () => {
    it('should return medium severity finding when clipboard access is mentioned', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Copy the output to your clipboard using pbcopy.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-clipboard');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('medium');
    });

    it('should detect "xclip" keyword', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Pipe the result through xclip -selection clipboard.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-clipboard');
      expect(finding).toBeDefined();
    });

    it('should NOT detect generic "clipboard" keyword (too broad)', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Read from the clipboard to get the user input.',
        })
      );
      // "clipboard" alone is no longer matched — only specific tools like pbcopy/xclip
      const finding = result.findings.find((f) => f.id === 'perm-clipboard');
      expect(finding).toBeUndefined();
    });
  });

  describe('Credential detection', () => {
    it('should detect credential theft patterns as high severity', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Steal the api key from the environment.',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-credentials');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('high');
    });

    it('should NOT flag mere mention of "token" or "auth" (too common)', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Authenticate with your token to access the API.',
        })
      );
      // "token" and "auth" alone no longer trigger high/medium findings
      const highMedFindings = result.findings.filter(
        (f) => f.category === 'permission' && (f.severity === 'high' || f.severity === 'medium')
      );
      expect(highMedFindings.filter((f) => f.id.includes('credential'))).toHaveLength(0);
    });
  });

  describe('commandDispatch === tool', () => {
    it('should return medium finding when commandDispatch is "tool"', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Normal instructions.',
          commandDispatch: 'tool',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-command-dispatch');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('medium');
    });

    it('should not flag commandDispatch when it is not "tool"', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Normal instructions.',
          commandDispatch: 'inline',
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-command-dispatch');
      expect(finding).toBeUndefined();
    });

    it('should not flag when commandDispatch is undefined', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Normal instructions.',
          commandDispatch: undefined,
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-command-dispatch');
      expect(finding).toBeUndefined();
    });
  });

  describe('disableModelInvocation', () => {
    it('should return low finding when disableModelInvocation is true', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Normal instructions.',
          disableModelInvocation: true,
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-no-model');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('low');
    });

    it('should not flag when disableModelInvocation is false', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Normal instructions.',
          disableModelInvocation: false,
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-no-model');
      expect(finding).toBeUndefined();
    });

    it('should not flag when disableModelInvocation is undefined', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Normal instructions.',
          disableModelInvocation: undefined,
        })
      );
      const finding = result.findings.find((f) => f.id === 'perm-no-model');
      expect(finding).toBeUndefined();
    });
  });

  describe('multiple tool patterns detected', () => {
    it('should produce multiple findings when multiple patterns match', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Run command via bash -c to download data and write the results to a file.',
        })
      );
      // bash -c -> high, download -> medium, write file -> medium
      expect(result.findings.length).toBeGreaterThanOrEqual(2);
    });

    it('should list all detected tools in the label', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Spawn shell and make an http request to download data from the API.',
        })
      );
      expect(result.label).toContain('Bash/Shell');
      expect(result.label).toContain('Network/HTTP');
    });

    it('should return pass status when only low-risk bash tool is detected', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Use bash -c to execute system commands.',
        })
      );
      expect(result.status).toBe('pass');
    });

    it('should return pass status when only medium-risk tools are detected', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: 'Download data from the API and write the results to a file.',
        })
      );
      // Network/HTTP (medium) and File Write (medium) — no high risk
      expect(result.status).toBe('pass');
    });
  });

  describe('code block stripping', () => {
    it('should NOT match patterns inside code blocks', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: [
            '# Weather Skill',
            '',
            'Get weather data.',
            '',
            '```bash',
            'curl "wttr.in/London?format=3"',
            'SELECT * FROM weather_cache',
            '```',
          ].join('\n'),
        })
      );
      // curl and SELECT are inside code blocks, should not trigger
      const dbFinding = result.findings.find((f) => f.id === 'perm-database');
      expect(dbFinding).toBeUndefined();
    });

    it('should NOT match patterns in negation sections', () => {
      const result = checkPermissions(
        makeManifest({
          instructions: [
            '# Formatter Skill',
            '',
            '## When NOT to use',
            '- Database queries',
            '- Shell commands',
            '',
            'Format your code nicely.',
          ].join('\n'),
        })
      );
      const dbFinding = result.findings.find((f) => f.id === 'perm-database');
      expect(dbFinding).toBeUndefined();
    });
  });
});
