/**
 * Threat Cloud Configuration
 *
 * Centralized threat intelligence service configuration.
 * In production, endpoint URLs and API keys come from environment variables.
 * This file provides type-safe defaults for the admin dashboard demo.
 */

export interface ThreatCloudEndpoint {
  /** Display name for this endpoint */
  readonly name: string;
  /** Base URL of the service */
  readonly url: string;
  /** Whether this endpoint is currently enabled */
  readonly enabled: boolean;
}

export interface ThreatCloudConfig {
  /** Service version identifier */
  readonly version: string;
  /** Global toggle for Threat Cloud connectivity */
  readonly enabled: boolean;
  /** How often to poll for new threat intelligence (seconds) */
  readonly pollIntervalSeconds: number;
  /** Maximum number of threat indicators to cache locally */
  readonly maxCacheSize: number;
  /** Time-to-live for cached indicators (seconds) */
  readonly cacheTtlSeconds: number;
  /** API endpoints for the Threat Cloud service */
  readonly endpoints: {
    /** Threat intelligence feed */
    readonly feed: ThreatCloudEndpoint;
    /** Indicator of Compromise (IoC) lookup */
    readonly iocLookup: ThreatCloudEndpoint;
    /** Threat correlation service */
    readonly correlation: ThreatCloudEndpoint;
    /** Reputation scoring service */
    readonly reputation: ThreatCloudEndpoint;
  };
  /** Telemetry settings - what data gets sent upstream */
  readonly telemetry: {
    /** Share anonymized threat data with the collective */
    readonly shareThreats: boolean;
    /** Share endpoint health metrics */
    readonly shareMetrics: boolean;
    /** Include file hashes in submissions */
    readonly includeHashes: boolean;
  };
}

const THREAT_CLOUD_API_BASE =
  process.env.NEXT_PUBLIC_THREAT_CLOUD_URL || 'https://threatcloud.panguard.ai/v1';

export const DEFAULT_THREAT_CLOUD_CONFIG: ThreatCloudConfig = {
  version: '1.0.0',
  enabled: true,
  pollIntervalSeconds: 300,
  maxCacheSize: 50_000,
  cacheTtlSeconds: 3600,
  endpoints: {
    feed: {
      name: 'Threat Intelligence Feed',
      url: `${THREAT_CLOUD_API_BASE}/feed`,
      enabled: true,
    },
    iocLookup: {
      name: 'IoC Lookup',
      url: `${THREAT_CLOUD_API_BASE}/ioc`,
      enabled: true,
    },
    correlation: {
      name: 'Threat Correlation',
      url: `${THREAT_CLOUD_API_BASE}/correlate`,
      enabled: true,
    },
    reputation: {
      name: 'Reputation Scoring',
      url: `${THREAT_CLOUD_API_BASE}/reputation`,
      enabled: true,
    },
  },
  telemetry: {
    shareThreats: true,
    shareMetrics: true,
    includeHashes: false,
  },
} as const;

/**
 * Severity level definitions for the Threat Cloud feed.
 * Used across the admin dashboard for consistent severity rendering.
 */
export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ThreatSeverityConfig {
  readonly label: string;
  readonly color: string;
  readonly bgColor: string;
  readonly borderColor: string;
}

export const SEVERITY_CONFIG: Record<ThreatSeverity, ThreatSeverityConfig> = {
  critical: {
    label: 'Critical',
    color: 'text-status-danger',
    bgColor: 'bg-status-danger/10',
    borderColor: 'border-status-danger/20',
  },
  high: {
    label: 'High',
    color: 'text-status-alert',
    bgColor: 'bg-status-alert/10',
    borderColor: 'border-status-alert/20',
  },
  medium: {
    label: 'Medium',
    color: 'text-status-caution',
    bgColor: 'bg-status-caution/10',
    borderColor: 'border-status-caution/20',
  },
  low: {
    label: 'Low',
    color: 'text-status-info',
    bgColor: 'bg-status-info/10',
    borderColor: 'border-status-info/20',
  },
} as const;
