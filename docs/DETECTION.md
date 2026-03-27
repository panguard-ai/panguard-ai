# Detection Capabilities Reference / 偵測能力參考

> Complete reference for all detection capabilities in the Panguard AI platform, including rules, correlation patterns, monitors, and threat intelligence sources.

## Table of Contents / 目錄

- [Built-in Rules](#built-in-rules--內建規則)
- [Event Correlation Patterns](#event-correlation-patterns--事件關聯模式)
- [Monitor Types](#monitor-types--監控器類型)
- [Threat Intelligence Sources](#threat-intelligence-sources--威脅情報來源)
- [Adding Custom Rules](#adding-custom-rules--新增自訂規則)
- [3-Layer AI Detection Funnel](#3-layer-ai-detection-funnel--三層-ai-偵測漏斗)
- [Context Memory and Baseline](#context-memory-and-baseline--上下文記憶與基線)
- [Response Actions and Escalation Ladder](#response-actions-and-escalation-ladder--回應動作與漸進升級)
- [Investigation Engine](#investigation-engine--調查引擎)
- [Honeypot Detection (PanguardTrap)](#honeypot-detection-panguardtrap--蜜罐偵測)
- [Security Scanning (PanguardScan)](#security-scanning-panguardscan--安全掃描)
- [Compliance Reporting (PanguardReport)](#compliance-reporting-panguardreport--合規報告)

---

## Built-in Rules / 內建規則

The Guard ships with 20 built-in rules covering the most common attack techniques. These are defined in `packages/panguard-guard/src/rules/builtin-rules.ts`.

### Credential Access / 憑證存取

| ID                     | Title                     | Level    | MITRE     | Description                                                                                                                                           |
| ---------------------- | ------------------------- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panguard-builtin-001` | Brute Force Login Attempt | high     | T1110     | Detects failed login attempts indicating brute force attack. Matches `failed login`, `authentication failure`, `invalid password`, `Failed password`. |
| `panguard-builtin-002` | SSH Brute Force           | high     | T1110.001 | Detects SSH authentication failures from sshd logs. Matches `Failed password for`, `Invalid user`, `Connection closed by authenticating user`.        |
| `panguard-builtin-003` | Credential Dumping Tool   | critical | T1003     | Detects credential dumping tools. Matches `mimikatz`, `sekurlsa`, `lsadump`, `hashdump`, `credential dump`.                                           |

### Execution / 執行

| ID                     | Title                             | Level    | MITRE | Description                                                                                                                           |
| ---------------------- | --------------------------------- | -------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `panguard-builtin-004` | Suspicious Reverse Shell          | critical | T1059 | Detects reverse shell commands in process or log events. Matches bash, netcat, python, and perl reverse shells.                       |
| `panguard-builtin-005` | Command and Scripting Interpreter | high     | T1059 | Detects suspicious use of scripting interpreters. Matches encoded PowerShell, suspicious bash/curl/wget chains, and Python OS import. |

### Persistence / 持久化

| ID                     | Title                            | Level  | MITRE     | Description                                                                                                                                        |
| ---------------------- | -------------------------------- | ------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panguard-builtin-006` | Cron Job Persistence             | medium | T1053.003 | Detects new cron job creation for persistence. Matches `crontab -`, `/etc/cron`, `/var/spool/cron`, `CRON[`.                                       |
| `panguard-builtin-007` | Systemd Service Creation         | medium | T1543.002 | Detects new systemd service installation for persistence. Matches writes to `/etc/systemd/system/`, `systemctl enable`, `systemctl daemon-reload`. |
| `panguard-builtin-008` | SSH Authorized Keys Modification | high   | T1098.004 | Detects changes to SSH `authorized_keys` for backdoor access.                                                                                      |

### Discovery and Reconnaissance / 偵察

| ID                     | Title                        | Level  | MITRE | Description                                                                                                                                                 |
| ---------------------- | ---------------------------- | ------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panguard-builtin-009` | Port Scan Detection          | medium | T1046 | Detects port scanning activity from network events. Matches `port scan`, `SYN scan`, `connection refused`, `nmap`.                                          |
| `panguard-builtin-010` | Network Enumeration Commands | medium | T1016 | Detects system/network enumeration commands. Matches `ifconfig -a`, `ip addr show`, `netstat`, `ss -tulnp`, `arp -a`, `cat /etc/passwd`, `cat /etc/shadow`. |

### Lateral Movement / 橫向移動

| ID                     | Title                    | Level  | MITRE     | Description                                                                                                                        |
| ---------------------- | ------------------------ | ------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `panguard-builtin-011` | Lateral Movement via SSH | medium | T1021.004 | Detects outbound SSH connections that may indicate lateral movement. Matches `ssh connection to`, `Accepted publickey`, `sshpass`. |

### Defense Evasion / 防禦規避

| ID                     | Title                      | Level    | MITRE     | Description                                                                                                                                                                  |
| ---------------------- | -------------------------- | -------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panguard-builtin-012` | Log Tampering              | critical | T1070.002 | Detects attempts to clear or tamper with system logs. Matches `truncate -s 0 /var/log`, `> /var/log/`, `rm -f /var/log/`, `shred /var/log/`, `history -c`, `unset HISTFILE`. |
| `panguard-builtin-013` | Firewall Rule Modification | critical | T1562.004 | Detects firewall rule changes that may disable security. Matches `iptables -F`, `iptables -X`, `ufw disable`, `pfctl -d`, `netsh advfirewall set`.                           |

### Impact / 衝擊

| ID                     | Title                        | Level | MITRE | Description                                                                                                                                   |
| ---------------------- | ---------------------------- | ----- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `panguard-builtin-014` | Crypto Mining Activity       | high  | T1496 | Detects cryptocurrency mining indicators. Matches `xmrig`, `minerd`, `stratum+tcp`, `cryptonight`, `coin-hive`, `minergate`.                  |
| `panguard-builtin-015` | Data Exfiltration Indicators | high  | T1048 | Detects data exfiltration via common tools. Matches `curl -X POST --data`, `wget --post-file`, `scp`, `rsync`, tar-pipe-nc, base64-pipe-curl. |

### File Integrity / 檔案完整性

| ID                     | Title                             | Level    | MITRE     | Description                                                                                                                                                |
| ---------------------- | --------------------------------- | -------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panguard-builtin-016` | Critical System File Modification | critical | T1222     | Detects changes to critical system configuration files. Matches `/etc/passwd`, `/etc/shadow`, `/etc/sudoers`, `/etc/hosts`, `/etc/resolv.conf`.            |
| `panguard-builtin-017` | Web Shell Detection               | critical | T1505.003 | Detects potential web shell uploads or access. Matches `webshell`, `c99shell`, `r57shell`, `WSO shell`, `eval(base64_decode`, `system($_GET`, `passthru(`. |

### Privilege Escalation / 權限提升

| ID                     | Title                         | Level  | MITRE     | Description                                                                                                                                   |
| ---------------------- | ----------------------------- | ------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `panguard-builtin-018` | Sudo Privilege Escalation     | medium | T1548.003 | Detects suspicious sudo usage for privilege escalation. Matches `sudo: COMMAND=`, `user NOT in sudoers`, `sudo su -`, `sudo bash`, `sudo -i`. |
| `panguard-builtin-019` | SUID/SGID Binary Exploitation | high   | T1548.001 | Detects SUID/SGID file permission changes. Matches `chmod +s`, `chmod u+s`, `chmod 4755`, `chmod 6755`, `find / -perm -4000`.                 |

### Malware / 惡意軟體

| ID                     | Title                 | Level    | MITRE | Description                                                                                                                                                                                             |
| ---------------------- | --------------------- | -------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panguard-builtin-020` | Ransomware Indicators | critical | T1486 | Detects ransomware behavior patterns. Matches `vssadmin delete shadows`, `wmic shadowcopy delete`, `bcdedit /set recoveryenabled no`, `.encrypted`, `DECRYPT_INSTRUCTIONS`, `YOUR_FILES_ARE_ENCRYPTED`. |

---

## Event Correlation Patterns / 事件關聯模式

The `EventCorrelator` (`packages/panguard-guard/src/correlation/event-correlator.ts`) implements 7 real-time attack pattern detectors operating on a sliding time window.

### Configuration

| Parameter          | Default     | Description                               |
| ------------------ | ----------- | ----------------------------------------- |
| Window size        | 5 minutes   | Sliding time window for event correlation |
| Buffer size        | 1000 events | Maximum events kept in memory             |
| Brute force window | 60 seconds  | Time window for auth failure counting     |
| Port scan window   | 60 seconds  | Time window for port counting             |

### Pattern 1: Brute Force (T1110)

**Detection Logic**: Same source IP generating 5+ authentication failure events within 60 seconds.

**Trigger Conditions**:

- Event source is `auth` or category is `authentication`
- Metadata indicates failure (`result: failure`, `outcome: failure`, `status: failed`)
- OR event category is `brute_force`
- OR rule ID contains `brute`

**Confidence Calculation**: `min(100, 60 + (count - 5) * 8)`

**Severity**:

- 10+ failures: `critical`
- 5-9 failures: `high`

---

### Pattern 2: Port Scan (T1046)

**Detection Logic**: Same source IP connecting to 10+ distinct destination ports within 60 seconds.

**Trigger Conditions**:

- Event source is `network`
- Destination port extracted from metadata fields: `destinationPort`, `dst_port`, `dstPort`, `remotePort`, `port`

**Confidence Calculation**: `min(100, 65 + (ports - 10) * 3)`

**Severity**:

- 50+ ports: `high`
- 10-49 ports: `medium`

---

### Pattern 3: Lateral Movement (T1021)

**Detection Logic**: Same source IP connecting to 3+ distinct internal (RFC 1918) IP addresses within the 5-minute correlation window.

**Trigger Conditions**:

- Event source is `network`
- Destination IP is internal (matches `10.*`, `172.16-31.*`, `192.168.*`, `127.*`, `::1`, `fd*`, `fe80:*`)

**Confidence Calculation**: `min(100, 55 + (ips - 3) * 10)`

**Severity**:

- 5+ internal IPs: `critical`
- 3-4 internal IPs: `high`

---

### Pattern 4: Data Exfiltration (T1041)

**Detection Logic**: Single event showing large outbound data transfer (>10 MB) to an external IP address.

**Trigger Conditions**:

- Event source is `network`
- Destination IP is NOT internal (RFC 1918)
- Bytes transferred extracted from: `bytesOut`, `bytes_out`, `bytesSent`, `bytes_sent`, `transferSize`, `bytes`
- Transfer size exceeds 10 MB (10,485,760 bytes)

**Confidence Calculation**: `min(100, 50 + floor(bytes / 10MB) * 15)`

**Severity**:

- 50+ MB: `critical`
- 10-49 MB: `high`

---

### Pattern 5: Backdoor Installation (T1059)

**Detection Logic**: Three-stage attack chain detected within the 5-minute window: file write + process creation + outbound network connection.

**Trigger Conditions** (all three must be present):

1. **File write event**: source `file`, category `file_write` or `file_creation`, or action `write`/`create`
2. **Process creation event**: source `process`, category `process_creation` or `process_start`, or action `exec`/`execve`/`create`
3. **Network outbound event**: source `network`

If source IP is available, events are correlated by IP.

**Confidence Calculation**: `min(100, 55 + fileEvents * 5 + processEvents * 5)`

**Severity**: Always `critical`

---

### Pattern 6: Privilege Escalation (T1548)

**Detection Logic**: Detection of privilege escalation activities within the 5-minute window.

**Trigger Conditions** (any of):

- Event category is `privilege_escalation`, `setuid`, or `setgid`
- Rule ID contains `priv_esc`, `privilege`, `setuid`, or `setgid`
- Process name is `sudo`, `su`, or `pkexec`
- Syscall is `setuid`, `setgid`, `setreuid`, or `setregid`
- Command matches `chmod +s` or `chown root`

**Confidence Calculation**: `min(100, 50 + count * 15)`

**Severity**:

- 3+ events: `critical`
- 1-2 events: `high`

---

### Pattern 7: Severity Escalation (Attack Chain)

**Detection Logic**: Compound accumulation of low-severity or medium-severity events from the same source IP, suggesting coordinated activity.

**Trigger Conditions**:

- 3+ low-severity events from same source IP within 5 minutes => escalate to `medium`
- 3+ medium-severity events from same source IP within 5 minutes => escalate to `high`

**Confidence Calculation**:

- Low escalation: `min(100, 40 + count * 10)`
- Medium escalation: `min(100, 50 + count * 10)`

---

## Monitor Types / 監控器類型

Panguard runs 10 monitors across two layers: 4 built-in monitors from `@panguard-ai/core` and 6 advanced monitors in `@panguard-ai/panguard-guard`.

### Core Monitors (Built-in)

#### 1. LogMonitor

| Property     | Value                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package      | `@panguard-ai/core/monitor/log-monitor.ts`                                                                                                                                |
| Platform     | Linux, macOS, Windows                                                                                                                                                     |
| Requirements | Access to system log files                                                                                                                                                |
| Description  | Monitors system log files (`/var/log/syslog`, `/var/log/auth.log`, etc.) for security-relevant events. Parses syslog format and emits normalized `SecurityEvent` objects. |
| Events       | `event` (SecurityEvent)                                                                                                                                                   |

#### 2. NetworkMonitor

| Property      | Value                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| Package       | `@panguard-ai/core/monitor/network-monitor.ts`                                                            |
| Platform      | Linux, macOS, Windows                                                                                     |
| Requirements  | None (uses `netstat`/`ss` or `/proc/net`)                                                                 |
| Poll Interval | Configurable (default in config)                                                                          |
| Description   | Polls active network connections, detects new and closed connections, reports remote addresses and ports. |
| Events        | `new_connection`, `closed_connection`                                                                     |

#### 3. ProcessMonitor

| Property      | Value                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Package       | `@panguard-ai/core/monitor/process-monitor.ts`                                                             |
| Platform      | Linux, macOS, Windows                                                                                      |
| Requirements  | None (uses `ps` or `/proc`)                                                                                |
| Poll Interval | Configurable (default in config)                                                                           |
| Description   | Polls running processes, detects new process starts and stops, reports process names, PIDs, command lines. |
| Events        | `process_started`, `process_stopped`                                                                       |

#### 4. FileMonitor

| Property     | Value                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------ |
| Package      | `@panguard-ai/core/monitor/file-monitor.ts`                                                |
| Platform     | Linux, macOS, Windows                                                                      |
| Requirements | Configured `watchPaths`                                                                    |
| Description  | Watches specified directories for file changes, creations, and deletions using `fs.watch`. |
| Events       | `file_changed`, `file_created`, `file_deleted`                                             |

### Advanced Monitors (Guard)

#### 5. SyscallMonitor

| Property              | Value                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package               | `packages/panguard-guard/src/monitors/syscall-monitor.ts`                                                                                                                                                                             |
| Platform              | Linux only (kernel 4.18+)                                                                                                                                                                                                             |
| Requirements          | Root or `CAP_SYS_PTRACE`                                                                                                                                                                                                              |
| Description           | Process and network activity monitoring via /proc polling. Detects process execution (`execve`/`execveat`), file writes to sensitive directories, network connections to unusual ports, and privilege escalation (`setuid`/`setgid`). |
| Sensitive Directories | `/etc/`, `/usr/bin/`, `/usr/sbin/`, `/usr/local/bin/`, `/usr/local/sbin/`, `/boot/`, `/lib/modules/`, `/root/`, `/var/spool/cron/`                                                                                                    |
| Degradation           | Gracefully degrades on non-Linux platforms or kernels < 4.18                                                                                                                                                                          |

#### 6. MemoryScanner

| Property     | Value                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package      | `packages/panguard-guard/src/monitors/memory-scanner.ts`                                                                                                                                                |
| Platform     | Linux only                                                                                                                                                                                              |
| Requirements | `CAP_SYS_PTRACE` or root, access to `/proc/{pid}/mem`                                                                                                                                                   |
| Description  | Reads process memory via `/proc/{pid}/mem` and applies pattern matching to detect fileless malware (code running only in memory), injected shellcode, C2 beacon patterns, and known malware signatures. |
| Degradation  | Gracefully degrades when `/proc` is not available or insufficient permissions                                                                                                                           |

#### 7. DpiMonitor

| Property     | Value                                                                                                                                                                                                                                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package      | `packages/panguard-guard/src/monitors/dpi-monitor.ts`                                                                                                                                                                                                                                                                                    |
| Platform     | Linux only                                                                                                                                                                                                                                                                                                                               |
| Requirements | Access to `/proc/net/*` and DNS logs                                                                                                                                                                                                                                                                                                     |
| Description  | Deep Packet Inspection without raw packet capture (pcap). Analyzes network traffic patterns to detect DNS tunneling (Shannon entropy analysis of domain names), C2 beaconing (fixed-interval callbacks with jitter detection), data exfiltration (large outbound transfers), and suspicious TLS certificates (self-signed, short-lived). |
| Degradation  | Gracefully degrades on non-Linux platforms                                                                                                                                                                                                                                                                                               |

#### 8. RootkitDetector

| Property      | Value                                                                                                                                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Package       | `packages/panguard-guard/src/monitors/rootkit-detector.ts`                                                                                                                                                                                                                                                                           |
| Platform      | Linux only                                                                                                                                                                                                                                                                                                                           |
| Requirements  | Root access recommended                                                                                                                                                                                                                                                                                                              |
| Scan Interval | 60 seconds (default)                                                                                                                                                                                                                                                                                                                 |
| Description   | Detects rootkit indicators including hidden processes (comparing `ps` output to `/proc` entries), LD_PRELOAD hooking, suspicious kernel modules, hidden files in sensitive directories (`/etc`, `/usr/bin`, `/usr/sbin`), and system binary integrity violations (SHA-256 checksums of critical binaries like `/bin/ps`, `/bin/ls`). |
| Degradation   | Gracefully degrades on non-Linux platforms                                                                                                                                                                                                                                                                                           |

### Monitor Availability Summary

| Monitor         | Linux | macOS | Windows | Requirements                 |
| --------------- | ----- | ----- | ------- | ---------------------------- |
| LogMonitor      | Yes   | Yes   | Yes     | Log file access              |
| NetworkMonitor  | Yes   | Yes   | Yes     | None                         |
| ProcessMonitor  | Yes   | Yes   | Yes     | None                         |
| FileMonitor     | Yes   | Yes   | Yes     | Configured watch paths       |
| SyscallMonitor  | Yes   | No    | No      | Kernel 4.18+, CAP_SYS_PTRACE |
| MemoryScanner   | Yes   | No    | No      | CAP_SYS_PTRACE, /proc access |
| DpiMonitor      | Yes   | No    | No      | /proc/net access             |
| RootkitDetector | Yes   | No    | No      | Root recommended             |

---

## Threat Intelligence Sources / 威脅情報來源

The `ThreatIntelFeedManager` (`packages/core/src/monitor/threat-intel-feeds.ts`) integrates with 5 threat intelligence feeds plus the Panguard Threat Cloud.

### Feed Sources

#### 1. ThreatFox (abuse.ch)

| Property  | Value                                    |
| --------- | ---------------------------------------- |
| API       | `https://threatfox-api.abuse.ch/api/v1/` |
| Method    | POST (query: `get_iocs`, days: 1)        |
| IoC Types | IP, URL, domain, hash                    |
| Data      | Recent malware indicators of compromise  |
| Auth      | None required (free API)                 |
| Update    | Bulk fetch on startup, then hourly       |

#### 2. URLhaus (abuse.ch)

| Property   | Value                                                    |
| ---------- | -------------------------------------------------------- |
| API        | `https://urlhaus-api.abuse.ch/v1/urls/recent/limit/100/` |
| Method     | GET                                                      |
| IoC Types  | URL, IP (extracted from host)                            |
| Data       | Recent malicious URLs used for malware distribution      |
| Auth       | None required (free API)                                 |
| Confidence | Online URLs: 90, Offline URLs: 50                        |

#### 3. Feodo Tracker (abuse.ch)

| Property   | Value                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| API        | `https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json` |
| Method     | GET                                                                    |
| IoC Types  | IP (with port, ASN, country)                                           |
| Data       | Banking trojan command-and-control (C2) server IPs                     |
| Auth       | None required (free API)                                               |
| Confidence | Online C2: 95, Offline C2: 70                                          |

#### 4. GreyNoise Community

| Property   | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| API        | `https://api.greynoise.io/v3/community/{ip}`                         |
| Method     | GET (per-IP lookup)                                                  |
| IoC Types  | IP                                                                   |
| Data       | Internet scanner/noise classification (benign scanner vs. malicious) |
| Auth       | None required for community tier                                     |
| Mode       | Per-IP lookup (not bulk), checked on demand for network events       |
| Confidence | Malicious classification: 85, Other noise: 50                        |

#### 5. AbuseIPDB (Optional)

| Property  | Value                                                |
| --------- | ---------------------------------------------------- |
| API       | `https://api.abuseipdb.com/api/v2/check`             |
| Method    | GET (per-IP lookup, maxAgeInDays: 90)                |
| IoC Types | IP                                                   |
| Data      | Community-reported abusive IP addresses              |
| Auth      | **API key required** (set `ABUSEIPDB_KEY` env var)   |
| Mode      | Per-IP lookup, checked on demand                     |
| Threshold | Reports with `abuseConfidenceScore > 25` are flagged |

### Feed Configuration

```typescript
// Default configuration
{
  updateIntervalMs: 3_600_000,  // 1 hour
  maxIoCs: 50_000,              // Max IoCs in memory
  enabledFeeds: ['threatfox', 'urlhaus', 'feodotracker', 'greynoise'],
  requestTimeoutMs: 30_000,     // 30 seconds per request
}
```

### Threat Cloud Integration

In addition to the 5 external feeds, the Guard also integrates with Panguard's Threat Cloud:

- **Blocklist Download**: Fetches known-bad IP addresses and injects them into the feed manager with confidence score 85
- **Rule Distribution**: Downloads community ATR rules
- **Anonymized Data Upload**: Uploads anonymized threat data (IP /16-anonymized, MITRE technique, ATR rule IDs) for collective intelligence

Sync happens at startup and then hourly via the `cloudSyncTimer`.

---

## Adding Custom Rules / 新增自訂規則

### Adding Custom Rules

1. Create a `.yml` file in `{dataDir}/rules/`:

```yaml
# /var/panguard-guard/rules/my-custom-rule.yml
title: Detect Docker Escape Attempt
id: custom-docker-escape-001
status: experimental
description: Detects potential Docker container escape techniques
author: Security Team
logsource:
  category: process_creation
detection:
  selection_nsenter:
    description|contains:
      - 'nsenter --mount'
      - 'nsenter -t 1 -m'
  selection_cgroup:
    description|contains:
      - '/sys/fs/cgroup'
      - 'release_agent'
  condition: selection_nsenter OR selection_cgroup
level: critical
tags:
  - attack.privilege_escalation
  - attack.t1611
```

2. The `RuleEngine` will automatically reload the rule (hot-reload is enabled by default).

### Rule Precedence

When multiple rules match the same event:

1. All matching rules contribute to the `DetectionResult.ruleMatches` array
2. The `AnalyzeAgent` uses the highest-severity match for confidence calculation
3. Attack chain correlation considers all unique rule IDs across correlated events
4. The AI analysis (if available) receives all rule matches as context

---

## 3-Layer AI Detection Funnel / 三層 AI 偵測漏斗

Panguard uses a cost-optimized, three-layer detection funnel. Events flow from the cheapest layer upward only when additional analysis is needed.

```
Layer 1: Rules ($0)           -- ATR + built-in pattern matching
         |
         v  (unresolved events)
Layer 2: Local AI ($0)        -- Ollama (local LLM inference)
         |
         v  (still uncertain)
Layer 3: Cloud AI ($$)        -- Claude / OpenAI (API call)
```

### Layer 1: Rule-Based Detection (Cost: $0)

All events pass through the rule engine first. This layer handles the vast majority of detections with zero marginal cost.

| Component          | Description                                                      |
| ------------------ | ---------------------------------------------------------------- |
| ATR Rule Engine    | Matches events against ATR rules (71 rules across 10 categories) |
| Threat Intel Feeds | IP/domain/hash lookup against 5 external feeds + Threat Cloud    |
| Event Correlator   | 7 multi-step attack pattern detectors                            |

Events that match known rules are assigned a verdict immediately. Events that do not match any rules, or match only low-confidence rules, are escalated to Layer 2.

### Layer 2: Local AI / Ollama (Cost: $0)

The `FunnelRouter` (`packages/panguard-guard/src/agent/funnel-router.ts`) routes unresolved events to a local LLM running via Ollama.

| Property       | Value                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Provider       | Ollama (local, self-hosted)                                                                        |
| Auto-detection | `GuardEngine.autoDetectLLM()` probes `http://localhost:11434`                                      |
| Models         | Any Ollama-compatible model (e.g., `llama3`, `mistral`, `phi3`)                                    |
| Capabilities   | Event classification, MITRE ATT&CK technique mapping, severity assessment                          |
| Fallback       | If Ollama is unavailable, events skip to Layer 3 (if configured) or fall back to rule-only verdict |

### Layer 3: Cloud AI (Cost: Per-token API pricing)

Events that remain uncertain after local AI analysis are escalated to cloud AI providers.

| Provider         | Config Key                              | Description                                    |
| ---------------- | --------------------------------------- | ---------------------------------------------- |
| Anthropic Claude | `ANTHROPIC_API_KEY` or encrypted config | Deep reasoning with tool-use for investigation |
| OpenAI GPT       | `OPENAI_API_KEY` or encrypted config    | Alternative cloud AI provider                  |

Cloud AI receives the full event context, rule matches, correlation data, and baseline deviation information. It can also invoke investigation tools (see Investigation Engine below).

### LLM Configuration Priority

The `GuardEngine` resolves AI provider configuration in this order:

1. **Encrypted config file** (`{dataDir}/llm-config.enc`) -- decrypted with machine key
2. **Environment variables** (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OLLAMA_HOST`)
3. **Ollama auto-probe** -- checks `http://localhost:11434/api/tags` for running models

### FunnelRouter Behavior

```
Event arrives
    |
    +--> Rule match found? --[yes]--> Generate verdict (skip AI)
    |
    +--> [no] Ollama available? --[yes]--> Local AI analysis
    |                                |
    |                                +--> Confident? --[yes]--> Generate verdict
    |                                |
    |                                +--> [no] Cloud AI configured?
    |                                         |
    |                                         +--> [yes]--> Cloud AI analysis --> Generate verdict
    |                                         +--> [no]--> Rule-only verdict (lower confidence)
    |
    +--> [no] Cloud AI configured? --[yes]--> Cloud AI analysis --> Generate verdict
                                   --[no]--> Rule-only verdict
```

---

## Context Memory and Baseline / 上下文記憶與基線

The Guard learns normal behavior during an initial learning period, then uses that baseline to detect anomalies in protection mode.

### Operating Modes

| Mode       | Duration                       | Behavior                                                 |
| ---------- | ------------------------------ | -------------------------------------------------------- |
| Learning   | Configurable (default: 7 days) | Observes events, builds baseline, no active response     |
| Protection | Indefinite (after learning)    | Detects deviations from baseline, takes response actions |

### Baseline Data (`EnvironmentBaseline`)

The baseline tracks four categories of normal behavior:

#### 1. Normal Processes (`ProcessPattern[]`)

| Field                    | Description                          |
| ------------------------ | ------------------------------------ |
| `name`                   | Process name (e.g., `nginx`, `sshd`) |
| `path`                   | Executable path                      |
| `frequency`              | How often the process is observed    |
| `firstSeen` / `lastSeen` | Observation window                   |

#### 2. Normal Connections (`ConnectionPattern[]`)

| Field           | Description                   |
| --------------- | ----------------------------- |
| `remoteAddress` | Destination IP address        |
| `remotePort`    | Destination port              |
| `protocol`      | Connection protocol (TCP/UDP) |
| `frequency`     | Connection frequency          |

#### 3. Normal Login Patterns (`LoginPattern[]`)

| Field       | Description               |
| ----------- | ------------------------- |
| `username`  | Login username            |
| `sourceIP`  | Source IP of login        |
| `hourOfDay` | Typical login hour (0-23) |
| `dayOfWeek` | Typical login day (0-6)   |
| `frequency` | Login frequency           |

#### 4. Normal Service Ports (`PortPattern[]`)

| Field     | Description                        |
| --------- | ---------------------------------- |
| `port`    | Listening port number              |
| `service` | Service name (e.g., `http`, `ssh`) |

### Deviation Detection

In protection mode, the `ContextMemory` module compares incoming events against the baseline:

| Deviation Type       | Description                           | Example                                            |
| -------------------- | ------------------------------------- | -------------------------------------------------- |
| Unknown process      | Process not seen during learning      | New binary executing for the first time            |
| Unknown connection   | Connection to IP/port not in baseline | Outbound connection to a new external server       |
| Unusual login time   | Login outside normal hours/days       | SSH login at 3 AM when baseline shows 9-5 activity |
| Unusual login source | Login from IP not seen before         | SSH from a new country                             |
| New service port     | Port not observed during learning     | New listener on port 4444                          |

Each deviation produces a `DeviationResult` with:

- `isDeviation`: boolean
- `deviationType`: string identifying the category
- `confidence`: 0-100 score
- `description`: human-readable explanation

### Continuous Baseline Updates

In protection mode, the baseline is continuously updated (slowly) to accommodate legitimate changes:

- The `lastContinuousUpdate` timestamp tracks when the baseline was last refined
- New patterns are incorporated with lower initial frequency to avoid false positives

### Baseline Confidence

| Metric             | Description                                       |
| ------------------ | ------------------------------------------------- |
| `confidenceLevel`  | 0.0 to 1.0 score indicating baseline completeness |
| `eventCount`       | Total events observed during learning             |
| `learningProgress` | Percentage through the configured learning period |

---

## Response Actions and Escalation Ladder / 回應動作與漸進升級

The `RespondAgent` (`packages/panguard-guard/src/agent/respond-agent.ts`) executes response actions based on verdict confidence and a configurable action policy.

### Action Policy Thresholds

| Threshold       | Default | Action                                                |
| --------------- | ------- | ----------------------------------------------------- |
| `autoRespond`   | 90%     | Automatically execute the recommended response action |
| `notifyAndWait` | 70%     | Send notification, wait for human confirmation        |
| `logOnly`       | 0%      | Log the event, take no action                         |

### Response Actions

| Action            | Description                         | Platforms                                            | Safety Guards                                                  |
| ----------------- | ----------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| `log_only`        | Record event in structured log      | All                                                  | None needed                                                    |
| `notify`          | Send alert via configured channels  | All                                                  | None needed                                                    |
| `block_ip`        | Block source IP via OS firewall     | Linux (iptables), macOS (pfctl), Windows (netsh)     | Whitelisted IPs protected (127.0.0.1, ::1, localhost, 0.0.0.0) |
| `kill_process`    | Terminate malicious process         | All (POSIX signals)                                  | Protected processes list (sshd, systemd, init, launchd, etc.)  |
| `disable_account` | Lock user account                   | Linux (usermod -L), macOS (dscl), Windows (net user) | Protected accounts (root, Administrator, admin, SYSTEM)        |
| `isolate_file`    | Quarantine file to secure directory | All                                                  | Metadata written alongside quarantined file                    |

### Safety Rules

The RespondAgent enforces strict safety rules to prevent self-harm:

| Rule                 | Description                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| IP Whitelist         | Loopback addresses (127.0.0.1, ::1, localhost) can never be blocked                                           |
| Protected Processes  | Critical system processes (sshd, systemd, init, launchd, explorer.exe, node, panguard-guard) cannot be killed |
| Protected Accounts   | System accounts (root, Administrator, SYSTEM) cannot be disabled                                              |
| Self-Protection      | The Guard process (own PID) can never be killed                                                               |
| IP Format Validation | Only valid IPv4/IPv6 addresses are accepted for blocking                                                      |
| Username Validation  | Only alphanumeric usernames (with `.`, `_`, `-`) are accepted                                                 |

### Process Termination Strategy

1. **SIGTERM** (graceful): Sent first, allows process to clean up
2. **Wait 5 seconds**: Check if process exited
3. **SIGKILL** (forced): Sent if process is still alive after timeout

### Auto-Unblock Timers

Blocked IPs are automatically unblocked after a configurable duration:

| Offender Type                   | Block Duration | Description                       |
| ------------------------------- | -------------- | --------------------------------- |
| First offense                   | 1 hour         | Standard auto-unblock timer       |
| Repeat offender (3+ violations) | 24 hours       | Extended block for repeat sources |

Timers are `unref()`-ed to avoid holding the Node.js process open.

### Escalation Ladder

The RespondAgent tracks repeat offenders via the `escalationMap`:

| Violations           | Effect                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| 1-2                  | Standard thresholds apply                                                           |
| 3+ (repeat offender) | Auto-respond threshold lowered by 10% (minimum 50%), block duration extended to 24h |

### Action Manifest (Persistence)

All response actions are persisted to `{dataDir}/action-manifest.jsonl`:

```json
{
  "id": "act-1709472000000-abc123",
  "action": "block_ip",
  "target": "203.0.113.42",
  "timestamp": "2026-03-03T12:00:00.000Z",
  "expiresAt": "2026-03-03T13:00:00.000Z",
  "rolledBack": false,
  "verdict": { "conclusion": "malicious", "confidence": 95 }
}
```

The manifest enables:

- **Rollback**: Any action can be reversed by manifest entry ID
- **Audit trail**: Complete history of all automated responses
- **Startup recovery**: Actions are reloaded on Guard restart

### Rollback Support

| Action            | Rollback Method                                                          |
| ----------------- | ------------------------------------------------------------------------ |
| `block_ip`        | Remove firewall rule (iptables -D / pfctl -T delete / netsh delete rule) |
| `isolate_file`    | Manual intervention required (quarantine metadata provided)              |
| `kill_process`    | Not rollback-able (process already terminated)                           |
| `disable_account` | Not rollback-able via RespondAgent (manual re-enable required)           |

---

## Investigation Engine / 調查引擎

The `AnalyzeAgent` can invoke investigation tools during AI-assisted analysis to gather additional context before making a verdict.

### Investigation Tools

| Tool                  | Description                                                           |
| --------------------- | --------------------------------------------------------------------- |
| `checkIPHistory`      | Look up historical events from the same source IP                     |
| `checkUserPrivilege`  | Check the privilege level of the user associated with the event       |
| `checkTimeAnomaly`    | Compare event timestamp against baseline login/activity patterns      |
| `checkGeoLocation`    | Resolve IP to geographic location and compare against known patterns  |
| `checkRelatedEvents`  | Find other events correlated by time, IP, or attack technique         |
| `checkProcessTree`    | Trace the parent-child process chain for suspicious execution         |
| `checkFileReputation` | Check file hash against known malware databases and Threat Cloud      |
| `checkNetworkPattern` | Analyze network connection patterns (frequency, volume, destinations) |

### Investigation Flow

```
AnalyzeAgent receives DetectionResult
    |
    +--> AI generates InvestigationPlan (list of steps with reasoning)
    |
    +--> Execute each InvestigationStep:
    |        tool: "checkIPHistory"
    |        reason: "Source IP has multiple low-severity events"
    |        --> result: { finding: "5 events in 10 min", riskContribution: 30 }
    |
    +--> AI synthesizes all investigation results
    |
    +--> Produces ThreatVerdict:
             conclusion: "malicious" | "suspicious" | "benign"
             confidence: 0-100
             reasoning: "Full reasoning chain..."
             evidence: [ ... ]
             recommendedAction: "block_ip" | "notify" | "log_only" | ...
             mitreTechnique: "T1110"
```

### Investigation Result Structure

Each investigation step produces an `InvestigationResult`:

| Field                          | Type           | Description                                                 |
| ------------------------------ | -------------- | ----------------------------------------------------------- |
| `finding`                      | string         | Human-readable description of what was found                |
| `riskContribution`             | number (0-100) | How much this finding contributes to the overall risk score |
| `needsAdditionalInvestigation` | boolean        | Whether further tools should be invoked                     |
| `data`                         | Record         | Raw data from the investigation                             |

### Evidence Sources

The ThreatVerdict aggregates evidence from multiple sources:

| Source               | Description                                       |
| -------------------- | ------------------------------------------------- |
| `rule_match`         | ATR rule matched the event                        |
| `ai_analysis`        | AI model analysis and reasoning                   |
| `baseline_deviation` | Event deviates from learned baseline              |
| `threat_intel`       | IP/domain/hash found in threat intelligence feeds |
| `investigation`      | Evidence gathered by investigation tools          |

---

## Honeypot Detection (PanguardTrap) / 蜜罐偵測

PanguardTrap (`packages/panguard-trap/`) deploys honeypot services to detect and profile attackers.

### Honeypot Service Types

| Service | Default Port | Banner                                    | Max Connections | Session Timeout |
| ------- | ------------ | ----------------------------------------- | --------------- | --------------- |
| SSH     | 2222         | `SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6` | 50              | 30s             |
| HTTP    | 8080         | `Apache/2.4.57 (Ubuntu)`                  | 100             | 60s             |
| FTP     | 2121         | `220 ProFTPD 1.3.8 Server`                | 30              | 30s             |
| SMB     | 4450         | (binary protocol)                         | 20              | 30s             |
| MySQL   | 3307         | `5.7.42-0ubuntu0.18.04.1`                 | 30              | 30s             |
| RDP     | 3390         | (binary protocol)                         | 10              | 60s             |
| Telnet  | 2323         | `Ubuntu 22.04 LTS`                        | 30              | 30s             |
| Redis   | 6380         | (RESP protocol)                           | 20              | 30s             |

Default enabled services: SSH and HTTP. All others are opt-in.

### Trap Event Types

| Event Type               | Description                            |
| ------------------------ | -------------------------------------- |
| `connection`             | New connection established             |
| `disconnection`          | Connection closed                      |
| `authentication_attempt` | Login attempt with username/password   |
| `command_input`          | Command entered in interactive session |
| `file_upload`            | File uploaded to honeypot              |
| `file_download`          | File downloaded from honeypot          |
| `port_scan`              | Port scanning activity detected        |
| `exploit_attempt`        | Exploitation attempt detected          |
| `data_exfiltration`      | Data extraction attempt                |
| `lateral_movement`       | Attempt to move to other systems       |
| `privilege_escalation`   | Attempt to elevate privileges          |

### Fake Access Granting

PanguardTrap can grant "fake" access after a configurable number of failed login attempts (default: 3) to encourage attackers to reveal their tactics, techniques, and procedures (TTPs).

### Attacker Profiling

The `AttackerProfiler` builds profiles for each attacker based on observed behavior:

| Field               | Description                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill Level         | `script_kiddie`, `intermediate`, `advanced`, `apt`                                                                                                    |
| Intent              | `reconnaissance`, `credential_harvesting`, `ransomware_deployment`, `cryptomining`, `data_theft`, `botnet_recruitment`, `lateral_movement`, `unknown` |
| Tools Detected      | List of tools observed (e.g., `nmap`, `metasploit`, `hydra`)                                                                                          |
| MITRE Techniques    | ATT&CK technique IDs observed                                                                                                                         |
| Credential Patterns | Common usernames and passwords attempted                                                                                                              |
| Geographic Hints    | Country, timezone, language indicators                                                                                                                |
| Risk Score          | 0-100 composite risk score                                                                                                                            |

### Threat Cloud Integration

Anonymized trap intelligence is uploaded to Threat Cloud:

- Source IP (public IPs only)
- Attack type and MITRE techniques
- Skill level and intent classification
- Tools detected
- Top credential patterns (generic, not customer-specific)
- Geographic region (country-level)

### Trap Statistics

| Metric              | Description                                       |
| ------------------- | ------------------------------------------------- |
| Total sessions      | Cumulative connections across all services        |
| Active sessions     | Currently open connections                        |
| Unique source IPs   | Distinct attacker IP addresses                    |
| Credential attempts | Total login attempts captured                     |
| Commands captured   | Total commands entered in interactive sessions    |
| Sessions by service | Breakdown by service type                         |
| Top attacker IPs    | Most active attackers ranked by sessions and risk |
| Skill distribution  | Distribution of attacker skill levels             |
| Intent distribution | Distribution of attacker intents                  |

---

## Security Scanning (PanguardScan) / 安全掃描

PanguardScan (`packages/panguard-scan/`) performs on-demand security health checks with 8 scanner types.

### Scanner Types

| Scanner           | File                            | Description                                                             |
| ----------------- | ------------------------------- | ----------------------------------------------------------------------- |
| Discovery Scanner | `scanners/discovery-scanner.ts` | Environment discovery: OS, kernel, installed packages, running services |
| Open Ports        | `scanners/open-ports.ts`        | Detects open network ports and identifies services                      |
| Password Policy   | `scanners/password-policy.ts`   | Audits password policy configuration and weak credentials               |
| SSL Checker       | `scanners/ssl-checker.ts`       | Validates SSL/TLS certificates, cipher suites, and protocol versions    |
| CVE Checker       | `scanners/cve-checker.ts`       | Checks installed packages against known CVE databases                   |
| Scheduled Tasks   | `scanners/scheduled-tasks.ts`   | Audits cron jobs and scheduled tasks for suspicious entries             |
| Shared Folders    | `scanners/shared-folders.ts`    | Identifies network shares and their permission settings                 |
| Remote Scanner    | `scanners/remote/index.ts`      | Scans remote hosts via SSH                                              |

### Scan Modes

| Mode  | Duration    | Description                               |
| ----- | ----------- | ----------------------------------------- |
| Quick | ~30 seconds | Essential checks only                     |
| Full  | ~60 seconds | Comprehensive scan with all scanner types |

### Scan Output

Each scan produces a `ScanResult`:

| Field          | Description                                         |
| -------------- | --------------------------------------------------- |
| `discovery`    | Environment discovery data (OS, packages, services) |
| `findings`     | Array of `Finding` objects sorted by severity       |
| `riskScore`    | Overall risk score (0-100)                          |
| `riskLevel`    | Severity label (info, low, medium, high, critical)  |
| `scanDuration` | Duration in milliseconds                            |
| `scannedAt`    | ISO 8601 timestamp                                  |

### Finding Structure

Each finding includes:

- Unique ID and title
- Severity level (critical, high, medium, low, info)
- Category (password, network, system, etc.)
- Remediation recommendation
- Taiwan ISMS compliance reference (when applicable)
- Manual fix commands (for free-tier users)

### PDF Report Generation

PanguardScan generates PDF security reports via `generatePdfReport()`, including:

- Executive summary with risk score
- Findings sorted by severity
- Remediation recommendations
- Compliance cross-references

---

## Compliance Reporting (PanguardReport) / 合規報告

PanguardReport (`packages/panguard-report/`) generates compliance reports mapped to regulatory frameworks.

### Supported Frameworks

| Framework                 | Config Key              | Description                                            |
| ------------------------- | ----------------------- | ------------------------------------------------------ |
| Taiwan Cyber Security Act | `tw_cyber_security_act` | Taiwan's national cybersecurity regulation (TCSA)      |
| ISO 27001                 | `iso27001`              | International information security management standard |
| SOC 2                     | `soc2`                  | Service Organization Control Type 2                    |

### Report Types

| Type         | Description                                         |
| ------------ | --------------------------------------------------- |
| `compliance` | Full compliance assessment against a framework      |
| `incident`   | Incident-specific report with timeline and response |
| `monthly`    | Monthly security summary                            |
| `quarterly`  | Quarterly compliance status                         |
| `annual`     | Annual comprehensive review                         |

### Compliance Control Evaluation

Each control is evaluated against security event data:

| Status           | Description                             |
| ---------------- | --------------------------------------- |
| `pass`           | Control requirements fully met          |
| `fail`           | Control requirements not met            |
| `partial`        | Control partially implemented           |
| `not_applicable` | Control not relevant to the environment |

Controls are auto-mapped from security event categories via `relatedCategories`.

### Report Content

A `ComplianceReportData` object contains:

| Section            | Description                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Executive Summary  | Overall compliance score, pass/fail/partial counts, critical findings, key risks, key achievements |
| Evaluated Controls | Each control with status, evidence, related findings, and remediation suggestions                  |
| Findings           | All security findings from PanguardScan, PanguardGuard, and PanguardTrap                           |
| Statistics         | By status, by category, by severity, compliance percentage, trend analysis                         |
| Recommendations    | Prioritized remediation recommendations with estimated effort                                      |

### Report Formats

| Format | Description                       |
| ------ | --------------------------------- |
| JSON   | Machine-readable structured data  |
| PDF    | Human-readable formatted document |

### Bilingual Support

Reports support both English (`en`) and Traditional Chinese (`zh-TW`). Control titles and descriptions are stored in both languages. The default language is `zh-TW` (configurable via `ReportConfig.language`).
