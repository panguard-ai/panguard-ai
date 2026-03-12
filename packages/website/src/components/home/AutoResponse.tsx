'use client';

import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  Ban,
  Skull,
  Lock,
  ShieldOff,
  KeyRound,
} from 'lucide-react';

const tierConfig = [
  {
    key: 'auto' as const,
    accent: 'border-red-500/40',
    accentBg: 'bg-red-500/10',
    accentText: 'text-red-400',
    icon: ShieldAlert,
  },
  {
    key: 'notify' as const,
    accent: 'border-yellow-500/40',
    accentBg: 'bg-yellow-500/10',
    accentText: 'text-yellow-400',
    icon: AlertTriangle,
  },
  {
    key: 'log' as const,
    accent: 'border-text-muted/30',
    accentBg: 'bg-text-muted/10',
    accentText: 'text-text-muted',
    icon: FileText,
  },
];

const actionKeys = [
  'blockIp',
  'killProcess',
  'quarantineFile',
  'blockTool',
  'revokeSkill',
  'killAgent',
  'reducePermissions',
] as const;

const actionIcons = [Ban, Skull, Lock, ShieldOff, KeyRound, Skull, ShieldOff];

export default function AutoResponse() {
  const t = useTranslations('home.autoResponse');

  return (
    <SectionWrapper id="auto-response" dark>
      <div className="text-center mb-14">
        <SectionTitle overline={t('overline')} title={t('title')} subtitle={t('subtitle')} />
      </div>

      {/* Three confidence tiers */}
      <div className="grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto mb-16">
        {tierConfig.map((tier, i) => {
          const Icon = tier.icon;
          return (
            <FadeInUp key={tier.key} delay={i * 0.1}>
              <div
                className={`rounded-2xl border ${tier.accent} bg-surface-1/50 p-5 sm:p-6 h-full flex flex-col`}
              >
                {/* Icon + threshold badge */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tier.accentBg}`}
                  >
                    <Icon className={`w-5 h-5 ${tier.accentText}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {t(`tiers.${tier.key}.label`)}
                    </h3>
                    <span className={`text-[11px] font-mono font-semibold ${tier.accentText}`}>
                      {t(`tiers.${tier.key}.threshold`)}
                    </span>
                  </div>
                </div>

                {/* Tagline */}
                <p className={`text-sm font-semibold mb-2 ${tier.accentText}`}>
                  {t(`tiers.${tier.key}.tagline`)}
                </p>

                {/* Description */}
                <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-1">
                  {t(`tiers.${tier.key}.description`)}
                </p>

                {/* Actions list */}
                <div className="rounded-lg bg-surface-0 px-3 py-2.5 border border-border">
                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-1">
                    {t('actionsTable.headers.action')}
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {t(`tiers.${tier.key}.actions`)}
                  </p>
                </div>
              </div>
            </FadeInUp>
          );
        })}
      </div>

      {/* Response actions table */}
      <FadeInUp delay={0.3}>
        <div className="max-w-4xl mx-auto">
          <h3 className="text-lg font-bold text-text-primary mb-6 text-center">
            {t('actionsTable.title')}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface-1/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                    {t('actionsTable.headers.action')}
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                    {t('actionsTable.headers.trigger')}
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-text-muted font-semibold hidden sm:table-cell">
                    {t('actionsTable.headers.description')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {actionKeys.map((key, i) => {
                  const ActionIcon = actionIcons[i];
                  return (
                    <tr key={key} className="border-b border-border/50 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ActionIcon className="w-4 h-4 text-brand-sage shrink-0" />
                          <span className="text-text-primary font-medium">
                            {t(`actionsTable.${key}.action`)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-brand-sage font-mono bg-brand-sage/10 px-1.5 py-0.5 rounded">
                          {t(`actionsTable.${key}.trigger`)}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">
                        {t(`actionsTable.${key}.description`)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </FadeInUp>
    </SectionWrapper>
  );
}
