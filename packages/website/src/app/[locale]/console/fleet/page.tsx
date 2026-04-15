'use client';

import { useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────

interface Device {
  readonly id: string;
  readonly hostname: string | null;
  readonly os_type: string | null;
  readonly agent_count: number;
  readonly guard_version: string | null;
  readonly last_seen: string;
  readonly created_at: string;
  readonly skill_count?: number;
  readonly flagged_count?: number;
  readonly status?: 'protected' | 'needs-rescan' | 'outdated' | 'offline';
}

// ── Styles (from DESIGN.md) ────────────────────────────

const colors = {
  bgBase: '#1A1614',
  bgCard: '#242220',
  bgRaised: '#2E2C2A',
  border: '#3A3836',
  textPrimary: '#F5F1E8',
  textMuted: '#A09A94',
  sage: '#8B9A8E',
  ok: '#2ED573',
  warn: '#FBBF24',
  danger: '#EF4444',
  glow: 'rgba(139,154,142,0.15)',
} as const;

// ── Helpers ────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function deviceStatus(d: Device): Device['status'] {
  if (d.status) return d.status;
  const lastSeen = new Date(d.last_seen).getTime();
  const hoursSince = (Date.now() - lastSeen) / 3600000;
  if (hoursSince > 24) return 'offline';
  if ((d.flagged_count ?? 0) > 0) return 'needs-rescan';
  return 'protected';
}

function statusColor(s: Device['status']): string {
  switch (s) {
    case 'protected': return colors.ok;
    case 'needs-rescan': return colors.warn;
    case 'outdated': return colors.danger;
    case 'offline': return colors.textMuted;
    default: return colors.textMuted;
  }
}

function statusLabel(s: Device['status']): string {
  switch (s) {
    case 'protected': return 'PROTECTED';
    case 'needs-rescan': return 'NEEDS RESCAN';
    case 'outdated': return 'OUTDATED';
    case 'offline': return 'OFFLINE';
    default: return 'UNKNOWN';
  }
}

// ── KPI Card ───────────────────────────────────────────

function KPICard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div
      style={{
        background: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: '16px 18px',
        transition: 'border-color 0.2s',
      }}
    >
      <div
        className="font-display"
        style={{ fontSize: 28, fontWeight: 700, color }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: colors.textMuted,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.8px',
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────

function StatusBadge({ status }: { status: Device['status'] }) {
  const color = statusColor(status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        background: `${color}26`,
        color,
      }}
    >
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
      }} />
      {statusLabel(status)}
    </span>
  );
}

// ── Fleet Page ─────────────────────────────────────────

export default function FleetPage() {
  const [devices, setDevices] = useState<readonly Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: replace with real TC API call when auth is ready
    // For now, show demo data so the UI is visible
    const demoDevices: Device[] = [
      {
        id: 'dev-001',
        hostname: 'dev-macbook-pro',
        os_type: 'macOS 15.2',
        agent_count: 7,
        guard_version: '1.5.0',
        last_seen: new Date(Date.now() - 3 * 60000).toISOString(),
        created_at: '2026-04-01T00:00:00Z',
        skill_count: 12,
        flagged_count: 2,
      },
      {
        id: 'dev-002',
        hostname: 'ci-runner-01',
        os_type: 'Ubuntu 24.04',
        agent_count: 3,
        guard_version: '1.5.0',
        last_seen: new Date(Date.now() - 60 * 60000).toISOString(),
        created_at: '2026-04-05T00:00:00Z',
        skill_count: 8,
        flagged_count: 0,
      },
      {
        id: 'dev-003',
        hostname: 'staging-server',
        os_type: 'Ubuntu 22.04',
        agent_count: 5,
        guard_version: '1.4.16',
        last_seen: new Date(Date.now() - 48 * 60 * 60000).toISOString(),
        created_at: '2026-03-15T00:00:00Z',
        skill_count: 15,
        flagged_count: 1,
      },
      {
        id: 'dev-004',
        hostname: 'prod-worker-03',
        os_type: 'Ubuntu 24.04',
        agent_count: 2,
        guard_version: '1.5.0',
        last_seen: new Date(Date.now() - 7 * 24 * 60 * 60000).toISOString(),
        created_at: '2026-03-01T00:00:00Z',
        skill_count: 6,
        flagged_count: 0,
      },
    ];

    setDevices(demoDevices);
    setLoading(false);
  }, []);

  const devicesWithStatus = devices.map((d) => ({
    ...d,
    status: deviceStatus(d),
  }));

  const protectedCount = devicesWithStatus.filter((d) => d.status === 'protected').length;
  const needsRescanCount = devicesWithStatus.filter((d) => d.status === 'needs-rescan').length;
  const outdatedCount = devicesWithStatus.filter(
    (d) => d.status === 'outdated' || d.status === 'offline'
  ).length;
  const totalSkills = devices.reduce((sum, d) => sum + (d.skill_count ?? 0), 0);

  if (loading) {
    return (
      <div style={{ color: colors.textMuted, padding: 40 }}>Loading fleet data...</div>
    );
  }

  if (error) {
    return (
      <div style={{ color: colors.danger, padding: 40 }}>{error}</div>
    );
  }

  return (
    <div>
      {/* Page Title */}
      <h1
        className="font-display"
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: colors.textPrimary,
          margin: '0 0 24px 0',
        }}
      >
        Fleet Overview
      </h1>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <KPICard value={protectedCount} label="Protected" color={colors.ok} />
        <KPICard value={needsRescanCount} label="Needs Rescan" color={colors.warn} />
        <KPICard value={outdatedCount} label="Outdated / Offline" color={colors.danger} />
        <KPICard value={totalSkills} label="Skills Monitored" color={colors.sage} />
      </div>

      {/* Section Title */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h2
          className="font-display"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: colors.textMuted,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
            margin: 0,
          }}
        >
          Devices
        </h2>
        <button
          style={{
            background: colors.sage,
            color: colors.bgBase,
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Rescan All
        </button>
      </div>

      {/* Device Table */}
      <div
        style={{
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1.5fr 1fr 120px',
            padding: '10px 16px',
            borderBottom: `1px solid ${colors.border}`,
            fontSize: 11,
            fontWeight: 500,
            color: colors.textMuted,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.8px',
          }}
        >
          <span>Device</span>
          <span>Agents</span>
          <span>Skills</span>
          <span>Last Seen</span>
          <span>Status</span>
        </div>

        {/* Table Rows */}
        {devicesWithStatus.map((device) => (
          <div
            key={device.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1.5fr 1fr 120px',
              padding: '12px 16px',
              borderBottom: `1px solid ${colors.border}`,
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.bgRaised;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* Device Name + OS */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>
                {device.hostname ?? device.id}
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                {device.os_type ?? 'Unknown OS'}
                {device.guard_version ? ` / Guard ${device.guard_version}` : ''}
              </div>
            </div>

            {/* Agent Count */}
            <div style={{ fontSize: 13, color: colors.textPrimary }}>
              {device.agent_count}
            </div>

            {/* Skills */}
            <div style={{ fontSize: 13, color: colors.textPrimary }}>
              {device.skill_count ?? 0}
              {(device.flagged_count ?? 0) > 0 && (
                <span style={{ color: colors.warn, fontWeight: 600, marginLeft: 4 }}>
                  ({device.flagged_count} flagged)
                </span>
              )}
            </div>

            {/* Last Seen */}
            <div
              className="font-mono"
              style={{ fontSize: 12, color: colors.textMuted }}
            >
              {timeAgo(device.last_seen)}
            </div>

            {/* Status Badge */}
            <StatusBadge status={device.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
