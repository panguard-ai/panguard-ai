'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Rss, Mail, MessageSquare } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { CheckIcon, AlertIcon, MonitorIcon } from '@/components/ui/BrandIcons';

/* ─── Types ─── */

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'beta' | 'unknown';

type IncidentStatus = 'resolved' | 'investigating' | 'monitoring';

interface Service {
  name: { en: string; 'zh-TW': string };
  status: ServiceStatus;
  /** Last-probe latency in ms (null = probe never returned). */
  latencyMs: number | null;
  /** HTTP status from the probe (null = network failure). */
  httpStatus: number | null;
  /** ISO timestamp of when the probe last ran. */
  checkedAt: string | null;
}

interface Incident {
  date: string;
  title: string;
  status: IncidentStatus;
  description: string;
}

interface ProbeApiResponse {
  aggregate: 'operational' | 'degraded' | 'outage' | 'unknown';
  probedAt: string;
  results: Array<{
    key: string;
    label: { en: string; 'zh-TW': string };
    status: 'operational' | 'degraded' | 'outage' | 'unknown';
    httpStatus: number | null;
    latencyMs: number | null;
    checkedAt: string;
    error?: string;
  }>;
}

/* ─── Live probe placeholder (replaces former hardcoded "operational" array) ─── */

/**
 * Initial render before /api/health-probe responds. Status defaults to
 * 'unknown' so the page never displays "operational" without real probe
 * data — that was the previous fake.
 */
const PROBE_PLACEHOLDER: Service[] = [
  {
    name: { en: 'panguard.ai website', 'zh-TW': 'panguard.ai \u5b98\u7db2' },
    status: 'unknown',
    latencyMs: null,
    httpStatus: null,
    checkedAt: null,
  },
  {
    name: {
      en: 'Threat Cloud (tc.panguard.ai)',
      'zh-TW': 'Threat Cloud (tc.panguard.ai)',
    },
    status: 'unknown',
    latencyMs: null,
    httpStatus: null,
    checkedAt: null,
  },
  {
    name: {
      en: 'Customer app (app.panguard.ai)',
      'zh-TW': '\u5ba2\u6236\u7aef app (app.panguard.ai)',
    },
    status: 'unknown',
    latencyMs: null,
    httpStatus: null,
    checkedAt: null,
  },
  {
    name: {
      en: '@panguard-ai/panguard on npm',
      'zh-TW': 'npm \u4e0a\u7684 @panguard-ai/panguard',
    },
    status: 'unknown',
    latencyMs: null,
    httpStatus: null,
    checkedAt: null,
  },
  {
    name: {
      en: 'ATR (agent-threat-rules)',
      'zh-TW': 'ATR (agent-threat-rules)',
    },
    status: 'unknown',
    latencyMs: null,
    httpStatus: null,
    checkedAt: null,
  },
];

interface LocalizedIncident {
  date: { en: string; 'zh-TW': string };
  title: { en: string; 'zh-TW': string };
  status: IncidentStatus;
  description: { en: string; 'zh-TW': string };
}

/**
 * Incident history starts empty until we have real incident postmortems
 * published. The previous January-February 2026 entries were placeholder
 * narrative content, not actual production incidents we tracked. Per the
 * "做不到就不要講" rule they are removed; the "no incidents" empty state
 * below renders honestly.
 *
 * When a real incident occurs we publish a postmortem and append the
 * entry here (or move to a Markdown-driven log so this file does not
 * need to be redeployed for each new incident).
 */
const incidentData: LocalizedIncident[] = [];

function localizeIncident(item: LocalizedIncident, locale: string): Incident {
  const key = locale === 'zh-TW' ? 'zh-TW' : 'en';
  return {
    date: item.date[key],
    title: item.title[key],
    status: item.status,
    description: item.description[key],
  };
}

/* ─── Helpers ─── */

const statusConfig: Record<ServiceStatus, { dotClass: string; barClass: string }> = {
  operational: {
    dotClass: 'bg-emerald-400',
    barClass: 'bg-brand-sage',
  },
  beta: {
    dotClass: 'bg-blue-400',
    barClass: 'bg-blue-400/60',
  },
  degraded: {
    dotClass: 'bg-amber-400',
    barClass: 'bg-amber-400/60',
  },
  outage: {
    dotClass: 'bg-red-400',
    barClass: 'bg-red-400',
  },
  unknown: {
    dotClass: 'bg-text-tertiary/50',
    barClass: 'bg-text-tertiary/30',
  },
};

const incidentBadgeStyles: Record<IncidentStatus, string> = {
  resolved: 'bg-emerald-500/10 text-emerald-400',
  investigating: 'bg-amber-500/10 text-amber-400',
  monitoring: 'bg-blue-500/10 text-blue-400',
};

function getOverallStatus(svcs: Service[]): ServiceStatus {
  if (svcs.some((s) => s.status === 'outage')) return 'outage';
  if (svcs.some((s) => s.status === 'degraded')) return 'degraded';
  if (svcs.every((s) => s.status === 'unknown')) return 'unknown';
  return 'operational';
}

/* ════════════════════════  Sub-components  ═══════════════════════ */

function OverallBanner({
  status,
  probedAt,
  t,
  locale,
}: {
  status: ServiceStatus;
  probedAt: string | null;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  const isAllGood = status === 'operational';
  const isProbing = status === 'unknown';

  const bannerBg = isAllGood
    ? 'bg-brand-sage/10 border-brand-sage/20'
    : isProbing
      ? 'bg-surface-1 border-border'
      : status === 'degraded'
        ? 'bg-amber-500/10 border-amber-500/20'
        : 'bg-red-500/10 border-red-500/20';

  const bannerText = isAllGood
    ? t('allOperational')
    : isProbing
      ? locale === 'zh-TW'
        ? '正在探測各服務狀態…'
        : 'Probing services…'
      : status === 'degraded'
        ? t('degraded')
        : t('outage');

  const lastChecked = probedAt
    ? new Date(probedAt).toLocaleString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : null;

  return (
    <FadeInUp>
      <div className={`border rounded-2xl p-6 text-center ${bannerBg}`}>
        <div className="flex items-center justify-center gap-3 mb-2">
          {isAllGood ? (
            <CheckIcon size={28} className="text-brand-sage" />
          ) : isProbing ? (
            <MonitorIcon size={28} className="text-text-tertiary" />
          ) : (
            <AlertIcon size={28} className="text-amber-400" />
          )}
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">{bannerText}</h2>
        </div>
        {lastChecked && (
          <p className="text-text-tertiary text-sm">
            {locale === 'zh-TW' ? '最後探測： ' : 'Last probe: '}
            {lastChecked}
          </p>
        )}
      </div>
    </FadeInUp>
  );
}

function ServiceRow({
  service,
  index,
  statusLabel,
  locale,
}: {
  service: Service;
  index: number;
  statusLabel: string;
  locale: string;
}) {
  const cfg = statusConfig[service.status];
  const displayName = locale === 'zh-TW' ? service.name['zh-TW'] : service.name.en;

  return (
    <FadeInUp delay={index * 0.03}>
      <div className="border-b border-border py-4 flex items-center justify-between gap-4">
        <span className="text-text-primary text-sm sm:text-base font-medium truncate">
          {displayName}
        </span>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} aria-hidden="true" />
            <span className="text-text-secondary text-sm hidden sm:inline">{statusLabel}</span>
          </div>
          {service.latencyMs != null && (
            <span className="text-text-tertiary text-sm font-mono w-20 text-right">
              {service.latencyMs} ms
            </span>
          )}
        </div>
      </div>
    </FadeInUp>
  );
}

/* UptimeChart was removed when the page switched from hardcoded fake data
   to a live /api/health-probe. Real uptime-history charts require a
   persistent probe store (Better Uptime / Statuspage.io / Vercel cron
   into Supabase). Tracked as GA blocker B3 follow-up. */

function IncidentCard({
  incident,
  index,
  t,
}: {
  incident: Incident;
  index: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const incidentLabels: Record<IncidentStatus, string> = {
    resolved: t('recentIncidents.resolved'),
    investigating: t('recentIncidents.investigating'),
    monitoring: t('recentIncidents.monitoring'),
  };

  return (
    <FadeInUp delay={index * 0.05}>
      <div className="bg-surface-1 border border-border rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="text-text-tertiary text-xs font-mono">{incident.date}</span>
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
              incidentBadgeStyles[incident.status]
            }`}
          >
            {incidentLabels[incident.status]}
          </span>
        </div>
        <h4 className="text-text-primary text-sm font-semibold mb-2">{incident.title}</h4>
        <p className="text-text-secondary text-sm leading-relaxed">{incident.description}</p>
      </div>
    </FadeInUp>
  );
}

/* ════════════════════════  Main Component  ═══════════════════════ */

export default function StatusContent() {
  const t = useTranslations('status');
  const locale = useLocale();

  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Live probe state — replaces the previous hardcoded services array. The
  // /api/health-probe endpoint pings the public services server-side and
  // returns real status. Polled every 30s.
  const [services, setServices] = useState<Service[]>(PROBE_PLACEHOLDER);
  const [probedAt, setProbedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function probe(): Promise<void> {
      try {
        const res = await fetch('/api/health-probe', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as ProbeApiResponse;
        if (cancelled) return;
        const next: Service[] = data.results.map((r) => ({
          name: r.label,
          status: r.status,
          latencyMs: r.latencyMs,
          httpStatus: r.httpStatus,
          checkedAt: r.checkedAt,
        }));
        setServices(next);
        setProbedAt(data.probedAt);
      } catch {
        // Network blip — keep last known state, re-probe in 30s.
      }
    }

    void probe();
    const timer = setInterval(probe, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const overallStatus = getOverallStatus(services);
  const incidents = incidentData.map((item) => localizeIncident(item, locale));

  const statusLabels: Record<ServiceStatus, string> = {
    operational: t('operational'),
    beta: t('betaLabel'),
    degraded: t('degradedLabel'),
    outage: t('outageLabel'),
    unknown: locale === 'zh-TW' ? '探測中…' : 'Probing…',
  };

  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <SectionWrapper spacing="spacious">
        <SectionTitle overline={t('overline')} title={t('title')} subtitle={t('subtitle')} />
      </SectionWrapper>

      {/* ───────────── Disclaimer ───────────── */}
      <SectionWrapper spacing="tight">
        <p className="text-center text-sm text-text-secondary bg-surface-1 border border-border rounded-lg px-4 py-3 max-w-xl mx-auto">
          {locale === 'zh-TW' ? (
            <>
              本頁是即時 liveness probe（每 30 秒探測一次，顯示當下狀態）。歷史 uptime 趨勢 + SLA-grade
              監控 由 Better Uptime / Statuspage.io 接管，正在處理中。重要事件或 outage 通報請聯絡{' '}
              <a href="mailto:security@panguard.ai" className="text-brand-sage hover:underline">
                security@panguard.ai
              </a>
              。
            </>
          ) : (
            <>
              This page is a live liveness probe (re-checked every 30 seconds, current state only).
              Historical uptime trends and SLA-grade monitoring are pending — they require a
              dedicated probe store (Better Uptime / Statuspage.io / Vercel cron + Supabase) and are
              tracked as a known follow-up. For incident reports, contact{' '}
              <a href="mailto:security@panguard.ai" className="text-brand-sage hover:underline">
                security@panguard.ai
              </a>
              .
            </>
          )}
        </p>
      </SectionWrapper>

      {/* ───────────── Overall Status Banner ───────────── */}
      <SectionWrapper spacing="tight">
        <OverallBanner status={overallStatus} probedAt={probedAt} t={t} locale={locale} />
      </SectionWrapper>

      {/* ───────────── Service Status List ───────────── */}
      <SectionWrapper>
        <FadeInUp>
          <h3 className="text-lg font-semibold text-text-primary mb-2">{t('currentStatus')}</h3>
          <p className="text-text-secondary text-sm mb-6">{t('currentStatusDesc')}</p>
        </FadeInUp>

        <div>
          {services.map((service, idx) => (
            <ServiceRow
              key={service.name.en}
              service={service}
              index={idx}
              statusLabel={statusLabels[service.status]}
              locale={locale}
            />
          ))}
        </div>
      </SectionWrapper>

      {/* Uptime-history charts intentionally removed (was hardcoded fake data).
          Restoring them requires real historical probe storage — tracked as a
          GA blocker follow-up (Better Uptime / Statuspage.io / Vercel cron +
          Supabase). Until then, the current-state probe above is the truth. */}

      {/* ───────────── Incident History ───────────── */}
      <SectionWrapper>
        <FadeInUp>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {t('recentIncidents.title')}
          </h3>
          <p className="text-text-secondary text-sm mb-8">{t('recentIncidents.desc')}</p>
        </FadeInUp>

        <div className="space-y-4 max-w-3xl">
          {incidents.map((incident, idx) => (
            <IncidentCard
              key={incident.date + incident.title}
              incident={incident}
              index={idx}
              t={t}
            />
          ))}
        </div>

        {/* No incidents fallback */}
        {incidents.length === 0 && (
          <FadeInUp>
            <div className="text-center py-12">
              <CheckIcon size={32} className="text-brand-sage mx-auto mb-3" />
              <p className="text-text-secondary text-sm">{t('noIncidents')}</p>
            </div>
          </FadeInUp>
        )}
      </SectionWrapper>

      {/* ───────────── Subscribe Section ───────────── */}
      <SectionWrapper dark>
        <FadeInUp>
          <div className="text-center max-w-xl mx-auto">
            <MonitorIcon size={32} className="text-brand-sage mx-auto mb-5" />
            <h2 className="text-[clamp(24px,3vw,36px)] font-bold text-text-primary leading-[1.1]">
              {t('getUpdates.title')}
            </h2>
            <p className="text-text-secondary mt-3 leading-relaxed text-sm">
              {t('getUpdates.desc')}
            </p>

            {subStatus === 'success' ? (
              <p className="mt-8 text-sm text-status-safe font-medium">
                {t('getUpdates.success', { email })}
              </p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!email) return;
                  setSubStatus('loading');
                  try {
                    const res = await fetch('/api/waitlist', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email, source: 'status-updates' }),
                    });
                    if (!res.ok) throw new Error('fail');
                    setSubStatus('success');
                  } catch {
                    setSubStatus('error');
                  }
                }}
                className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('getUpdates.emailPlaceholder')}
                  aria-label={t('getUpdates.emailAriaLabel')}
                  className="w-full sm:w-auto sm:min-w-[280px] rounded-full border border-border bg-surface-1 px-5 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage transition-colors"
                />
                <button
                  type="submit"
                  disabled={subStatus === 'loading'}
                  className="bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3 text-sm hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] whitespace-nowrap disabled:opacity-60"
                >
                  {subStatus === 'loading' ? '...' : t('getUpdates.subscribe')}
                </button>
              </form>
            )}
            {subStatus === 'error' && (
              <p className="mt-3 text-sm text-status-alert">{t('getUpdates.error')}</p>
            )}

            {/* Notification channels */}
            <div className="flex items-center justify-center gap-6 mt-8">
              <span className="flex items-center gap-2 text-text-muted text-sm">
                <Rss size={16} />
                <span>{t('channels.rss')}</span>
              </span>
              <span className="flex items-center gap-2 text-text-muted text-sm">
                <MessageSquare size={16} />
                <span>{t('channels.slack')}</span>
              </span>
              <span className="flex items-center gap-2 text-text-muted text-sm">
                <Mail size={16} />
                <span>{t('channels.email')}</span>
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-2">{t('channels.note')}</p>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </>
  );
}
