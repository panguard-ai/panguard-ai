# CLI Reference / CLI 完整指令參考

> 所有 Panguard AI 命令列工具的指令、子指令和選項。

---

## panguard-scan

60 秒安全掃描工具。

```
panguard-scan [options]
```

### 選項

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `--quick` | boolean | `false` | 快速模式（~30 秒，跳過 SSL/排程/共享資料夾） |
| `--output <path>` | string | `panguard-scan-report.pdf` | PDF 報告輸出路徑 |
| `--lang <lang>` | string | `en` | 語言（`en` 或 `zh-TW`） |
| `--verbose` | boolean | `false` | 詳細輸出 |

### 範例

```bash
# 快速掃描
panguard-scan --quick

# 完整掃描 + 繁體中文 PDF 報告
panguard-scan --output report.pdf --lang zh-TW

# 詳細輸出
panguard-scan --verbose
```

---

## panguard-guard

AI 即時監控守護引擎。

```
panguard-guard <command> [options]
```

### 子指令

| 子指令 | 說明 |
|--------|------|
| `start` | 啟動 Guard 引擎 |
| `stop` | 停止 Guard 引擎 |
| `status` | 顯示引擎狀態 |
| `install` | 安裝為系統服務 |
| `uninstall` | 移除系統服務 |
| `config` | 顯示目前設定 |
| `generate-key [tier]` | 產生測試授權金鑰（tier: `free`/`pro`/`enterprise`，預設 `pro`） |
| `install-script` | 產生一鍵安裝腳本 |
| `help` | 顯示說明 |

### 全域選項

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `--data-dir <path>` | string | `~/.panguard-guard` | 資料目錄 |
| `--license-key <key>` | string | - | 授權金鑰（用於 `install-script`） |

### 範例

```bash
# 啟動 Guard
panguard-guard start

# 查看狀態
panguard-guard status

# 自訂資料目錄
panguard-guard start --data-dir /opt/panguard/data

# 產生 Enterprise 測試金鑰
panguard-guard generate-key enterprise

# 安裝為系統服務
panguard-guard install

# 產生安裝腳本
panguard-guard install-script --license-key PG-PRO-XXXX
```

---

## panguard-chat

AI 安全通知管理工具。

```
panguard-chat <command> [options]
```

### 子指令

| 子指令 | 說明 |
|--------|------|
| `setup` | 互動式通知設定精靈 |
| `test` | 發送測試通知 |
| `status` | 顯示管道狀態 |
| `config` | 顯示目前設定 |
| `help` | 顯示說明 |

### 選項

| 選項 | 類型 | 可用值 | 說明 |
|------|------|--------|------|
| `--channel <type>` | string | `line`, `telegram`, `slack`, `email`, `webhook` | 通知管道 |
| `--user-type <type>` | string | `developer`, `boss`, `it_admin` | 使用者角色 |
| `--lang <lang>` | string | `en`, `zh-TW` | 語言 |
| `--data-dir <path>` | string | - | 資料目錄 |

### 範例

```bash
# 互動式設定
panguard-chat setup

# LINE + 老闆模式 + 繁體中文
panguard-chat setup --channel line --user-type boss --lang zh-TW

# Slack + IT 管理員模式
panguard-chat setup --channel slack --user-type it_admin

# 測試特定管道
panguard-chat test --channel telegram

# 查看設定狀態
panguard-chat status
```

---

## panguard-trap

智慧蜜罐管理工具。

```
panguard-trap <command> [options]
```

### 子指令

| 子指令 | 說明 |
|--------|------|
| `start` | 啟動蜜罐服務 |
| `stop` | 停止蜜罐服務 |
| `status` | 顯示狀態和統計 |
| `deploy` | 部署特定蜜罐服務 |
| `profiles` | 顯示攻擊者側寫 |
| `intel` | 顯示威脅情報摘要 |
| `config` | 顯示目前設定 |
| `help` | 顯示說明 |

### 選項

| 選項 | 類型 | 可用值 | 說明 |
|------|------|--------|------|
| `--services <types>` | string | `ssh,http,ftp,smb,mysql,rdp,telnet,redis` | 服務類型（逗號分隔） |
| `--port <number>` | number | - | 自訂 port |
| `--data-dir <path>` | string | - | 資料目錄 |
| `--no-cloud` | boolean | - | 停用 Threat Cloud 上傳 |
| `--verbose`, `-v` | boolean | - | 詳細輸出 |

### 範例

```bash
# 啟動 SSH 和 HTTP 蜜罐
panguard-trap start --services ssh,http

# 查看攻擊者側寫
panguard-trap profiles

# 不上傳到 Threat Cloud
panguard-trap start --services ssh --no-cloud
```

---

## panguard-report

合規報告產生工具。

```
panguard-report <command> [options]
```

### 子指令

| 子指令 | 說明 |
|--------|------|
| `generate` | 產生合規報告 |
| `list-frameworks` | 列出支援的合規框架 |
| `validate` | 驗證輸入檔案 |
| `summary` | 顯示合規摘要 |
| `config` | 顯示目前設定 |
| `help` | 顯示說明 |

### 選項

| 選項 | 類型 | 可用值 | 說明 |
|------|------|--------|------|
| `--framework <name>` | string | `tw_cyber_security_act`, `iso27001`, `soc2` | 合規框架 |
| `--language <lang>` | string | `en`, `zh-TW` | 報告語言 |
| `--format <fmt>` | string | `json`, `pdf` | 輸出格式 |
| `--output-dir <path>` | string | - | 輸出目錄 |
| `--org <name>` | string | - | 組織名稱 |
| `--input <file>` | string | - | 輸入檔案（JSON） |
| `--verbose`, `-v` | boolean | - | 詳細輸出 |

### 範例

```bash
# 台灣資安法報告
panguard-report generate --framework tw_cyber_security_act --language zh-TW

# ISO 27001 PDF 報告
panguard-report generate --framework iso27001 --format pdf --output-dir ./reports

# 合規摘要
panguard-report summary --framework soc2
```

---

## threat-cloud

集體威脅情報 API 伺服器。

```
threat-cloud [options]
```

### 選項

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `--port <number>` | number | `8080` | 監聽 port |
| `--host <string>` | string | `127.0.0.1` | 監聽位址 |
| `--db <path>` | string | `./threat-cloud.db` | SQLite 資料庫路徑 |
| `--api-key <keys>` | string | - | API 金鑰（逗號分隔，啟用認證） |
| `--help` | boolean | - | 顯示說明 |

### 範例

```bash
# 本地開發
threat-cloud

# 對外服務 + 認證
threat-cloud --host 0.0.0.0 --port 8080 --api-key key1,key2

# 自訂資料庫
threat-cloud --db /var/lib/threat-cloud/data.db
```
