'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Rss, Mail, MessageSquare } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { CheckIcon, AlertIcon, MonitorIcon } from '@/components/ui/BrandIcons';

/* ─── Types ─── */

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'beta';

type IncidentStatus = 'resolved' | 'investigating' | 'monitoring';

interface Service {
  name: { en: string; 'zh-TW': string };
  status: ServiceStatus;
  uptime: number;
  uptimeHistory: ServiceStatus[];
}

interface Incident {
  date: string;
  title: string;
  status: IncidentStatus;
  description: string;
}

/* ─── Service Data ─── */

const services: Service[] = [
  {
    name: {
      en: 'Panguard Guard \u2014 Skill Monitoring',
      'zh-TW': 'Panguard Guard \u2014 \u6280\u80fd\u884c\u70ba\u76e3\u63a7',
    },
    status: 'operational',
    uptime: 0,
    uptimeHistory: [],
  },
  {
    name: {
      en: 'Panguard Scan \u2014 Security Audits',
      'zh-TW': 'Panguard Scan \u2014 \u8cc7\u5b89\u7a3d\u6838',
    },
    status: 'operational',
    uptime: 0,
    uptimeHistory: [],
  },
  {
    name: {
      en: 'Panguard Skill Auditor \u2014 Pre-Install Analysis',
      'zh-TW': 'Panguard Skill Auditor \u2014 \u5b89\u88dd\u524d\u5206\u6790',
    },
    status: 'operational',
    uptime: 0,
    uptimeHistory: [],
  },
  {
    name: {
      en: 'Threat Cloud \u2014 Collective Defense',
      'zh-TW': 'Threat Cloud \u2014 \u793e\u7fa4\u5354\u540c\u9632\u79a6',
    },
    status: 'operational',
    uptime: 0,
    uptimeHistory: [],
  },
  {
    name: {
      en: 'API & Integrations',
      'zh-TW': 'API \u8207\u6574\u5408',
    },
    status: 'operational',
    uptime: 0,
    uptimeHistory: [],
  },
  {
    name: {
      en: 'Threat Intelligence Feed',
      'zh-TW': '\u5a01\u8105\u60c5\u5831\u4f86\u6e90',
    },
    status: 'operational',
    uptime: 0,
    uptimeHistory: [],
  },
];

interface LocalizedIncident {
  date: { en: string; 'zh-TW': string };
  title: { en: string; 'zh-TW': string };
  status: IncidentStatus;
  description: { en: string; 'zh-TW': string };
}

const incidentData: LocalizedIncident[] = [
  {
    date: { en: 'Feb 20, 2026', 'zh-TW': '2026年2月20日' },
    title: {
      en: 'Scheduled Maintenance: Database Migration',
      'zh-TW': '計畫維護：資料庫遷移',
    },
    status: 'resolved',
    description: {
      en: 'Completed 15 minutes ahead of schedule. No service impact.',
      'zh-TW': '比預定時間提前 15 分鐘完成。未影響服務。',
    },
  },
  {
    date: { en: 'Feb 8, 2026', 'zh-TW': '2026年2月8日' },
    title: {
      en: 'Brief API Latency Increase',
      'zh-TW': 'API 延遲短暫上升',
    },
    status: 'resolved',
    description: {
      en: 'Elevated API response times for 12 minutes due to upstream provider. Automatically mitigated.',
      'zh-TW': '因上游服務供應商問題，API 回應時間升高約 12 分鐘。系統已自動排除。',
    },
  },
  {
    date: { en: 'Jan 25, 2026', 'zh-TW': '2026年1月25日' },
    title: {
      en: 'Scan Service Intermittent Errors',
      'zh-TW': 'Scan 服務間歇性錯誤',
    },
    status: 'resolved',
    description: {
      en: 'Some scan requests returned timeout errors for 8 minutes. Root cause: connection pool exhaustion. Fix deployed.',
      'zh-TW': '部分 scan 請求在 8 分鐘內出現逾時錯誤。根本原因為連線池耗盡，修補已部署。',
    },
  },
];

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
};

const incidentBadgeStyles: Record<IncidentStatus, string> = {
  resolved: 'bg-emerald-500/10 text-emerald-400',
  investigating: 'bg-amber-500/10 text-amber-400',
  monitoring: 'bg-blue-500/10 text-blue-400',
};

function getOverallStatus(svcs: Service[]): ServiceStatus {
  if (svcs.some((s) => s.status === 'outage')) return 'outage';
  if (svcs.some((s) => s.status === 'degraded')) return 'degraded';
  return 'operational';
}

const LAST_MANUAL_REVIEW = '2026-05-19';

function formatTimestamp(locale: string): string {
  return new Date(LAST_MANUAL_REVIEW).toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ════════════════════════  Sub-components  ═══════════════════════ */

function OverallBanner({
  status,
  t,
  locale,
}: {
  status: ServiceStatus;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  const isAllGood = status === 'operational';

  const bannerBg = isAllGood
    ? 'bg-brand-sage/10 border-brand-sage/20'
    : status === 'degraded'
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-red-500/10 border-red-500/20';

  const bannerText = isAllGood
    ? t('allOperational')
    : status === 'degraded'
      ? t('degraded')
      : t('outage');

  return (
    <FadeInUp>
      <div className={`border rounded-2xl p-6 text-center ${bannerBg}`}>
        <div className="flex items-center justify-center gap-3 mb-2">
          {isAllGood ? (
            <CheckIcon size={28} className="text-brand-sage" />
          ) : (
            <AlertIcon size={28} className="text-amber-400" />
          )}
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">{bannerText}</h2>
        </div>
        <p className="text-text-tertiary text-sm">
          {t('lastUpdated')} {formatTimestamp(locale)}
        </p>
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
          {service.uptime > 0 && (
            <span className="text-text-tertiary text-sm font-mono w-16 text-right">
              {service.uptime.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    </FadeInUp>
  );
}

function UptimeChart({
  service,
  index,
  t,
  locale,
}: {
  service: Service;
  index: number;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  const displayName = locale === 'zh-TW' ? service.name['zh-TW'] : service.name.en;

  return (
    <FadeInUp delay={index * 0.05}>
      <div className="bg-surface-1 border border-border rounded-xl p-5">
        <h4 className="text-text-primary text-sm font-semibold mb-3">{displayName}</h4>
        <div className="flex items-end gap-[3px]">
          {service.uptimeHistory.map((day, i) => {
            const cfg = statusConfig[day];
            return (
              <div
                key={i}
                className={`w-2 h-8 rounded-sm ${cfg.barClass} transition-all duration-200 hover:opacity-80`}
                title={`Day ${30 - i}`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-text-tertiary text-xs">{t('uptimeHistory.daysAgo')}</span>
          <span className="text-text-secondary text-xs font-medium">
            {service.uptime > 0
              ? `${t('uptimeHistory.uptimeLabel')} ${service.uptime.toFixed(2)}%`
              : t('betaLabel')}
          </span>
          <span className="text-text-tertiary text-xs">{t('uptimeHistory.today')}</span>
        </div>
      </div>
    </FadeInUp>
  );
}

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
  const overallStatus = getOverallStatus(services);

  const topServices = services.slice(0, 4);
  const incidents = incidentData.map((item) => localizeIncident(item, locale));

  const statusLabels: Record<ServiceStatus, string> = {
    operational: t('operational'),
    beta: t('betaLabel'),
    degraded: t('degradedLabel'),
    outage: t('outageLabel'),
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
              狀態反映最後更新時間的生產營運情況。如需即時監測，請聯絡{' '}
              <a href="mailto:security@panguard.ai" className="text-brand-sage hover:underline">
                security@panguard.ai
              </a>
              。
            </>
          ) : (
            <>
              Status reflects production operations as of the last update. For real-time monitoring,
              contact{' '}
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
        <OverallBanner status={overallStatus} t={t} locale={locale} />
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

      {/* ───────────── Uptime History Charts ───────────── */}
      <SectionWrapper dark>
        <FadeInUp>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {t('uptimeHistory.title')}
          </h3>
          <p className="text-text-secondary text-sm mb-8">{t('uptimeHistory.desc')}</p>
        </FadeInUp>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topServices.map((service, idx) => (
            <UptimeChart
              key={service.name.en}
              service={service}
              index={idx}
              t={t}
              locale={locale}
            />
          ))}
        </div>

        {/* Legend */}
        <FadeInUp delay={0.2}>
          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-brand-sage" />
              <span className="text-text-tertiary text-xs">{t('operational')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-amber-400/60" />
              <span className="text-text-tertiary text-xs">
                {t('uptimeHistory.degradedPerformance')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-400" />
              <span className="text-text-tertiary text-xs">{t('outageLabel')}</span>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

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
