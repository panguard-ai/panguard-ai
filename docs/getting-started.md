# Getting Started / 快速開始

> 從安裝到看到第一份安全報告，只需要 5 分鐘。

---

## 系統需求

| 項目 | 最低要求 |
|------|---------|
| 作業系統 | macOS 12+、Ubuntu 20.04+、Windows 10+ |
| Node.js | >= 20.0.0 |
| 磁碟空間 | 200 MB |
| 記憶體 | 512 MB（Guard 運行時建議 1 GB） |

---

## 安裝

### 一行指令安裝（推薦）

```bash
curl -fsSL https://get.panguard.ai | sh
```

### 手動安裝（開發者）

```bash
# 1. 取得原始碼
git clone https://github.com/openclaw-security/openclaw-security.git
cd openclaw-security

# 2. 安裝依賴
pnpm install

# 3. 編譯所有套件
pnpm build

# 4. 驗證安裝
pnpm test
```

---

## 第一次掃描

安裝完成後，執行你的第一次安全掃描：

```bash
panguard-scan --quick
```

你會看到品牌配色的終端輸出：

```
  ╔══════════════════════════════════════╗
  ║       PANGUARD [▣] AI               ║
  ║       Security Scanner              ║
  ╚══════════════════════════════════════╝

  [▣] Scanning system environment...

  ── Security Findings ──────────────────

  CRITICAL  Port 22 (SSH) exposed to 0.0.0.0
  HIGH      No firewall rules detected
  MEDIUM    Password policy not enforced
  LOW       12 unnecessary services running

  ── Risk Score ─────────────────────────

  Score: 62/100 [████████████░░░░░░░░] Grade: C

  ── Recommendations ────────────────────

  1. Restrict SSH access to specific IP ranges
  2. Enable and configure system firewall
  3. Enforce password complexity requirements
```

`--quick` 模式大約 30 秒完成基礎檢查。移除 `--quick` 可執行完整掃描（約 60 秒），包含 SSL 憑證驗證、排程任務稽核和共享資料夾安全檢查。

### 產生 PDF 報告

```bash
panguard-scan --output my-report.pdf
```

報告包含：封面、執行摘要、發現明細表、修復建議、合規框架對應。

### 繁體中文模式

```bash
panguard-scan --lang zh-TW
```

---

## 啟動即時防護

掃描只是一次性檢查。要持續保護你的系統，啟動 Guard：

```bash
panguard-guard start
```

```
  ╔══════════════════════════════════════╗
  ║       PANGUARD [▣] AI               ║
  ║       Guard Engine                  ║
  ╚══════════════════════════════════════╝

  [▣] Guard engine starting...

  ── Status ─────────────────────────────

  Mode:       Learning (Day 1/7)
  Monitoring: processes, network, files
  Rules:      42 Sigma rules loaded
  Score:      --/100 (building baseline)

  Guard is now protecting your system.
  Learning mode: AI is observing normal behavior.
  Protection mode activates automatically after 7 days.
```

Guard 的運作方式：

1. **前 7 天（學習模式）**：AI 觀察你的系統正常行為，建立基線。不會產生誤報。
2. **第 8 天起（保護模式）**：自動偵測異常，執行回應動作，透過通知管道告訴你。

### 安裝為開機自動啟動

```bash
panguard-guard install
```

支援 macOS（launchd）、Linux（systemd）、Windows（sc.exe）。

---

## 設定通知

讓 Panguard 在偵測到威脅時通知你：

```bash
panguard-chat setup
```

互動式設定精靈會引導你完成：

```
? Select notification channel:
  > LINE
    Telegram
    Slack
    Email
    Webhook

? Select your role:
  > boss (impact summary, plain language)
    developer (technical details)
    it_admin (remediation steps)
```

或直接指定：

```bash
# LINE 通知，老闆模式（人話摘要）
panguard-chat setup --channel line --user-type boss

# Slack 通知，IT 管理員模式（修復步驟）
panguard-chat setup --channel slack --user-type it_admin

# Telegram 通知，開發者模式（技術細節）
panguard-chat setup --channel telegram --user-type developer
```

設定完成後測試：

```bash
panguard-chat test
```

---

## 下一步

你已經完成基本設定。以下是進階功能：

| 想做什麼 | 閱讀 |
|---------|------|
| 了解 AI 三層漏斗架構 | [概念：三層 AI 架構](concepts/three-layer-ai.md) |
| 深入了解 Guard 的 5 個 AI Agent | [指南：Panguard Guard](guides/guard.md) |
| 設定蜜罐捕捉攻擊者 | [指南：Panguard Trap](guides/trap.md) |
| 產生合規報告 | [指南：Panguard Report](guides/report.md) |
| 部署集體威脅情報 | [指南：Threat Cloud](guides/threat-cloud.md) |
| 查看所有 CLI 指令 | [參考：CLI 完整指令](reference/cli.md) |
| 撰寫自訂 Sigma 規則 | [參考：Sigma 規則](reference/sigma-rules.md) |
