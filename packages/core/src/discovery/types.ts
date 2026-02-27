/**
 * Discovery engine type definitions
 * 環境偵察引擎型別定義
 *
 * Defines all interfaces used by the environment discovery engine for
 * system scanning, risk assessment, and security posture evaluation.
 * 定義環境偵察引擎所使用的所有介面，用於系統掃描、風險評估和安全態勢評估。
 *
 * @module @panguard-ai/core/discovery/types
 */

import type { Language, Severity } from '../types.js';

/**
 * Configuration for the discovery engine
 * 偵察引擎配置
 */
export interface DiscoveryConfig {
  /**
   * Scan depth - 'quick' for fast overview, 'full' for comprehensive scan
   * 掃描深度 - 'quick' 快速概覽，'full' 全面掃描
   */
  depth: 'quick' | 'full';

  /**
   * Language for output and descriptions
   * 輸出和描述的語言
   */
  lang: Language;
}

/**
 * Operating system information
 * 作業系統資訊
 */
export interface OSInfo {
  /**
   * OS platform identifier (e.g. 'darwin', 'linux', 'win32')
   * 作業系統平台識別碼（例如 'darwin'、'linux'、'win32'）
   */
  platform: string;

  /**
   * OS distribution name (e.g. 'macOS', 'Ubuntu', 'Windows 11')
   * 作業系統發行版名稱（例如 'macOS'、'Ubuntu'、'Windows 11'）
   */
  distro: string;

  /**
   * OS version string
   * 作業系統版本字串
   */
  version: string;

  /**
   * CPU architecture (e.g. 'x64', 'arm64')
   * CPU 架構（例如 'x64'、'arm64'）
   */
  arch: string;

  /**
   * Kernel version string
   * 核心版本字串
   */
  kernel: string;

  /**
   * System hostname
   * 系統主機名稱
   */
  hostname: string;

  /**
   * System uptime in seconds
   * 系統運行時間（秒）
   */
  uptime: number;

  /**
   * Latest patch or update level identifier
   * 最新修補程式或更新等級識別碼
   */
  patchLevel: string;
}

/**
 * Network interface information
 * 網路介面資訊
 */
export interface NetworkInterface {
  /**
   * Interface name (e.g. 'eth0', 'en0', 'Wi-Fi')
   * 介面名稱（例如 'eth0'、'en0'、'Wi-Fi'）
   */
  name: string;

  /**
   * IP address assigned to the interface
   * 分配給介面的 IP 位址
   */
  ip: string;

  /**
   * MAC (hardware) address
   * MAC（硬體）位址
   */
  mac: string;

  /**
   * Network mask
   * 網路遮罩
   */
  netmask: string;

  /**
   * Whether this is an internal/loopback interface
   * 是否為內部/迴路介面
   */
  internal: boolean;
}

/**
 * Information about an open port
 * 開放埠資訊
 */
export interface PortInfo {
  /**
   * Port number
   * 埠號
   */
  port: number;

  /**
   * Protocol (e.g. 'tcp', 'udp')
   * 協定（例如 'tcp'、'udp'）
   */
  protocol: string;

  /**
   * Port state (e.g. 'LISTEN', 'ESTABLISHED')
   * 埠狀態（例如 'LISTEN'、'ESTABLISHED'）
   */
  state: string;

  /**
   * Process ID using this port
   * 使用此埠的行程 ID
   */
  pid: number | undefined;

  /**
   * Process name using this port
   * 使用此埠的行程名稱
   */
  process: string;

  /**
   * Service name associated with this port
   * 與此埠關聯的服務名稱
   */
  service: string;
}

/**
 * Active network connection information
 * 活躍網路連線資訊
 */
export interface ActiveConnection {
  /**
   * Local IP address
   * 本地 IP 位址
   */
  localAddress: string;

  /**
   * Local port number
   * 本地埠號
   */
  localPort: number;

  /**
   * Remote IP address
   * 遠端 IP 位址
   */
  remoteAddress: string;

  /**
   * Remote port number
   * 遠端埠號
   */
  remotePort: number;

  /**
   * Connection state (e.g. 'ESTABLISHED', 'TIME_WAIT')
   * 連線狀態（例如 'ESTABLISHED'、'TIME_WAIT'）
   */
  state: string;

  /**
   * Process ID owning this connection
   * 擁有此連線的行程 ID
   */
  pid: number | undefined;

  /**
   * Process name owning this connection
   * 擁有此連線的行程名稱
   */
  process: string;
}

/**
 * Aggregated network information
 * 彙總網路資訊
 */
export interface NetworkInfo {
  /**
   * Detected network interfaces
   * 偵測到的網路介面
   */
  interfaces: NetworkInterface[];

  /**
   * Open / listening ports
   * 開放/監聽埠
   */
  openPorts: PortInfo[];

  /**
   * Active network connections
   * 活躍網路連線
   */
  activeConnections: ActiveConnection[];

  /**
   * Default gateway IP address
   * 預設閘道 IP 位址
   */
  gateway: string;

  /**
   * DNS server addresses
   * DNS 伺服器位址
   */
  dns: string[];
}

/**
 * Running service information
 * 執行中服務資訊
 */
export interface ServiceInfo {
  /**
   * Service identifier / name
   * 服務識別碼/名稱
   */
  name: string;

  /**
   * Human-readable display name
   * 人類可讀的顯示名稱
   */
  displayName: string;

  /**
   * Current service status
   * 目前服務狀態
   */
  status: 'running' | 'stopped' | 'unknown';

  /**
   * Process ID of the service (if running)
   * 服務的行程 ID（如果正在執行）
   */
  pid?: number;

  /**
   * Service start type (e.g. 'auto', 'manual', 'disabled')
   * 服務啟動類型（例如 'auto'、'manual'、'disabled'）
   */
  startType?: string;

  /**
   * Service description
   * 服務描述
   */
  description?: string;
}

/**
 * Security tool type classification
 * 安全工具類型分類
 */
export type SecurityToolType = 'antivirus' | 'edr' | 'firewall' | 'ids' | 'siem' | 'other';

/**
 * Detected security tool information
 * 偵測到的安全工具資訊
 */
export interface SecurityTool {
  /**
   * Tool name
   * 工具名稱
   */
  name: string;

  /**
   * Vendor / manufacturer
   * 廠商/製造商
   */
  vendor: string;

  /**
   * Tool version (if detectable)
   * 工具版本（如果可偵測）
   */
  version?: string;

  /**
   * Whether the tool is currently running
   * 工具是否正在執行
   */
  running: boolean;

  /**
   * Security tool category
   * 安全工具類別
   */
  type: SecurityToolType;
}

/**
 * Firewall rule definition
 * 防火牆規則定義
 */
export interface FirewallRule {
  /**
   * Rule name or identifier
   * 規則名稱或識別碼
   */
  name: string;

  /**
   * Traffic direction
   * 流量方向
   */
  direction: 'in' | 'out';

  /**
   * Rule action
   * 規則動作
   */
  action: 'allow' | 'block';

  /**
   * Network protocol (e.g. 'tcp', 'udp', 'any')
   * 網路協定（例如 'tcp'、'udp'、'any'）
   */
  protocol?: string;

  /**
   * Port number or range
   * 埠號或範圍
   */
  port?: string;

  /**
   * Whether the rule is enabled
   * 規則是否已啟用
   */
  enabled: boolean;
}

/**
 * Firewall status information
 * 防火牆狀態資訊
 */
export interface FirewallStatus {
  /**
   * Whether the firewall is enabled
   * 防火牆是否已啟用
   */
  enabled: boolean;

  /**
   * Firewall product name
   * 防火牆產品名稱
   */
  product: string;

  /**
   * Active firewall rules
   * 啟用中的防火牆規則
   */
  rules: FirewallRule[];
}

/**
 * System update status
 * 系統更新狀態
 */
export interface UpdateStatus {
  /**
   * Last time updates were checked (ISO timestamp)
   * 上次檢查更新的時間（ISO 時間戳）
   */
  lastCheck?: string;

  /**
   * Number of pending updates
   * 待安裝更新數量
   */
  pendingUpdates: number;

  /**
   * Whether automatic updates are enabled
   * 是否已啟用自動更新
   */
  autoUpdateEnabled: boolean;
}

/**
 * User account information
 * 使用者帳號資訊
 */
export interface UserInfo {
  /**
   * Username / login name
   * 使用者名稱/登入名稱
   */
  username: string;

  /**
   * User ID (numeric, on UNIX systems)
   * 使用者 ID（數字，於 UNIX 系統上）
   */
  uid?: string;

  /**
   * Whether the user has administrator privileges
   * 使用者是否具有管理員權限
   */
  isAdmin: boolean;

  /**
   * Last login timestamp (ISO string or descriptive)
   * 上次登入時間戳（ISO 字串或描述性）
   */
  lastLogin?: string;

  /**
   * Password age in days
   * 密碼使用天數
   */
  passwordAge?: number;

  /**
   * Default shell (on UNIX systems)
   * 預設 shell（於 UNIX 系統上）
   */
  shell?: string;
}

/**
 * Individual risk factor identified during discovery
 * 偵察期間識別的個別風險因素
 */
export interface RiskFactor {
  /**
   * Risk category identifier
   * 風險類別識別碼
   */
  category: string;

  /**
   * Human-readable risk description
   * 人類可讀的風險描述
   */
  description: string;

  /**
   * Numeric risk score (0-25 per factor)
   * 數值風險評分（每個因素 0-25）
   */
  score: number;

  /**
   * Severity classification
   * 嚴重性分類
   */
  severity: Severity;

  /**
   * Additional details about this risk factor
   * 關於此風險因素的額外詳情
   */
  details?: string;
}

/**
 * Complete environment discovery result
 * 完整的環境偵察結果
 */
export interface DiscoveryResult {
  /**
   * Operating system information
   * 作業系統資訊
   */
  os: OSInfo;

  /**
   * System hostname
   * 系統主機名稱
   */
  hostname: string;

  /**
   * Network information
   * 網路資訊
   */
  network: NetworkInfo;

  /**
   * Open / listening ports (convenience alias for network.openPorts)
   * 開放/監聽埠（network.openPorts 的便捷別名）
   */
  openPorts: PortInfo[];

  /**
   * Detected running services
   * 偵測到的執行中服務
   */
  services: ServiceInfo[];

  /**
   * Security posture information
   * 安全態勢資訊
   */
  security: {
    /**
     * Detected security tools
     * 偵測到的安全工具
     */
    existingTools: SecurityTool[];

    /**
     * Firewall status
     * 防火牆狀態
     */
    firewall: FirewallStatus;

    /**
     * System update status
     * 系統更新狀態
     */
    updates: UpdateStatus;

    /**
     * User accounts
     * 使用者帳號
     */
    users: UserInfo[];
  };

  /**
   * Identified risk factors / vulnerabilities
   * 已識別的風險因素/弱點
   */
  vulnerabilities: RiskFactor[];

  /**
   * Overall risk score (0-100)
   * 總體風險評分（0-100）
   */
  riskScore: number;

  /**
   * Discovery timestamp (ISO 8601)
   * 偵察時間戳（ISO 8601）
   */
  discoveredAt: string;
}
