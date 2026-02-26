/**
 * Panguard AI Brand Icon System
 *
 * 18 custom icons matching the brand design reference:
 * /brand-assets/02-logo-icons/PANGUARD_AI_Complete_Icon_System.png
 *
 * Style: rounded stroke, sage green on dark, consistent 1.5 strokeWidth
 * NOT Lucide — these are brand-specific designs.
 */

type IconProps = { size?: number; className?: string };

const defaults = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ── Shield (protection) — brand 3D shield mark ────────────────── */
export function ShieldIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M6 11L6 6" />
      <path d="M18 11L18 6" />
      <path d="M6 6L12 2L18 6" />
      <path d="M6 11L12 7L18 11" />
      <path d="M6 11L18 11L18 19L12 24L6 19Z" />
    </svg>
  );
}

/* ── Scan (detection) — target/radar with checkmark ────────────── */
export function ScanIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <path d="M9 12L11 14L15 10" />
    </svg>
  );
}

/* ── Lock (secured) — padlock ──────────────────────────────────── */
export function LockIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

/* ── Alert (warning) — triangle with exclamation ───────────────── */
export function AlertIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M12 2L2 20h20L12 2z" />
      <path d="M12 9v4" />
      <circle cx="12" cy="16" r="0.5" fill="currentColor" />
    </svg>
  );
}

/* ── Terminal (CLI) — prompt bracket >_ ────────────────────────── */
export function TerminalIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 9l3 3-3 3" />
      <path d="M12 15h5" />
    </svg>
  );
}

/* ── Network (endpoints) — connected nodes ─────────────────────── */
export function NetworkIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="4" cy="6" r="2" />
      <circle cx="20" cy="6" r="2" />
      <circle cx="4" cy="18" r="2" />
      <circle cx="20" cy="18" r="2" />
      <path d="M10 10.5L5.5 7.5" />
      <path d="M14 10.5L18.5 7.5" />
      <path d="M10 13.5L5.5 16.5" />
      <path d="M14 13.5L18.5 16.5" />
    </svg>
  );
}

/* ── Analytics (insights) — chart lines ────────────────────────── */
export function AnalyticsIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M3 20L3 4" />
      <path d="M3 20L21 20" />
      <path d="M6 16L10 10L14 13L20 6" />
      <circle cx="6" cy="16" r="1" fill="currentColor" />
      <circle cx="10" cy="10" r="1" fill="currentColor" />
      <circle cx="14" cy="13" r="1" fill="currentColor" />
      <circle cx="20" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}

/* ── Check (safe) — checkmark in circle ────────────────────────── */
export function CheckIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12L11 15L16 9" />
    </svg>
  );
}

/* ── Block (threat) — X in circle ──────────────────────────────── */
export function BlockIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 9L15 15" />
      <path d="M15 9L9 15" />
    </svg>
  );
}

/* ── History (timeline) — clock ────────────────────────────────── */
export function HistoryIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

/* ── Monitor (watching) — eye ──────────────────────────────────── */
export function MonitorIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ── Response (instant) — lightning bolt ────────────────────────── */
export function ResponseIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

/* ── Deploy (install) — download arrow ─────────────────────────── */
export function DeployIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M4 19h16" />
    </svg>
  );
}

/* ── Global (multilingual) — globe with lines ──────────────────── */
export function GlobalIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 014 10 15 15 0 01-4 10" />
      <path d="M12 2a15 15 0 00-4 10 15 15 0 004 10" />
    </svg>
  );
}

/* ── Team (collaboration) — people group ───────────────────────── */
export function TeamIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 21v-1.5a3 3 0 00-2.5-2.96" />
    </svg>
  );
}

/* ── Settings (config) — gear ──────────────────────────────────── */
export function SettingsIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
    </svg>
  );
}

/* ── Support (24/7) — headset with badge ───────────────────────── */
export function SupportIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M4 13a8 8 0 1116 0" />
      <path d="M4 13v3a2 2 0 002 2h1" />
      <path d="M20 13v3a2 2 0 01-2 2h-1" />
      <rect x="2" y="11" width="4" height="6" rx="1" />
      <rect x="18" y="11" width="4" height="6" rx="1" />
      <path d="M9 21h6" />
      <path d="M12 18v3" />
    </svg>
  );
}

/* ── Enterprise — building ─────────────────────────────────────── */
export function EnterpriseIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 21V16h6v5" />
      <path d="M8 7h2" />
      <path d="M14 7h2" />
      <path d="M8 11h2" />
      <path d="M14 11h2" />
    </svg>
  );
}

/* ── Chat (AI copilot) — speech bubble ───────────────────────── */
export function ChatIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <path d="M8 10h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

/* ── Trap (honeypot) — honeypot jar ──────────────────────────── */
export function TrapIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M8 2h8l2 4H6l2-4z" />
      <path d="M6 6v2a6 6 0 006 6 6 6 0 006-6V6" />
      <path d="M9 14v4a3 3 0 003 3 3 3 0 003-3v-4" />
      <circle cx="12" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

/* ── Integration (connect) — puzzle piece ────────────────────── */
export function IntegrationIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M5 8h2a2 2 0 002-2 2 2 0 012-2 2 2 0 012 2 2 2 0 002 2h2v2a2 2 0 002 2 2 2 0 010 4 2 2 0 00-2 2v2H13a2 2 0 00-2-2 2 2 0 01-2 2H5v-4a2 2 0 010-4V8z" />
    </svg>
  );
}

/* ── Report (compliance) — clipboard with lines ──────────────── */
export function ReportIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 1v4" />
      <path d="M15 1v4" />
      <path d="M9 10h6" />
      <path d="M9 14h4" />
      <path d="M9 18h2" />
    </svg>
  );
}

/* ── Compliance (certification) — badge with check ───────────── */
export function ComplianceIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M12 2l3 3h4v4l3 3-3 3v4h-4l-3 3-3-3H5v-4l-3-3 3-3V5h4l3-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/* ── Automation (gears/workflow) — circular arrows ───────────── */
export function AutomationIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaults}>
      <path d="M12 2a10 10 0 017.07 2.93" />
      <path d="M19.07 4.93L16 5" />
      <path d="M19.07 4.93L19 8" />
      <path d="M22 12a10 10 0 01-2.93 7.07" />
      <path d="M19.07 19.07L20 16" />
      <path d="M19.07 19.07L16 19" />
      <path d="M12 22a10 10 0 01-7.07-2.93" />
      <path d="M4.93 19.07L8 19" />
      <path d="M4.93 19.07L5 16" />
      <path d="M2 12A10 10 0 014.93 4.93" />
      <path d="M4.93 4.93L4 8" />
      <path d="M4.93 4.93L8 5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
