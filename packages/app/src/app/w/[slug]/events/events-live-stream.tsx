'use client';

/**
 * EventsLiveStream — client component that hydrates the SSR-rendered events
 * table with a live realtime feed. The parent server component renders the
 * initial list (fast first paint), and this component:
 *
 *   1. Subscribes to public.events INSERTs scoped to this workspace.
 *   2. Prepends new events to the displayed list with a subtle opacity
 *      fade-in animation.
 *   3. Shows an in-page toast popup ("New event detected") with the rule
 *      severity dot; auto-dismisses in 5s; click scrolls the new row into
 *      view.
 *   4. Renders a status pill in the corner: green "Live" / yellow
 *      "Reconnecting…" / muted "Offline (refresh to retry)".
 *
 * SSR is preserved: the server-rendered table remains in the DOM and is
 * the initial source of truth; this component takes over once mounted.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { RuleDrillDown } from '@/components/events/rule-drill-down';
import type { EventListRow, Severity } from '@/lib/types';
import { useEventsChannel } from '@/lib/realtime/use-events-channel';
import type { ConnectionStatus, RealtimeEvent } from '@/lib/realtime/events-channel';

const severityTone: Record<Severity, 'safe' | 'caution' | 'alert' | 'danger'> = {
  info: 'safe',
  low: 'safe',
  medium: 'caution',
  high: 'alert',
  critical: 'danger',
};

const severityDot: Record<Severity, string> = {
  info: 'bg-status-info',
  low: 'bg-status-safe',
  medium: 'bg-status-caution',
  high: 'bg-status-alert',
  critical: 'bg-status-danger',
};

/** Toast popup auto-dismiss window. */
const TOAST_TTL_MS = 5000;

interface ToastEntry {
  id: string;
  severity: Severity;
  rule_id: string | null;
}

interface Props {
  workspaceId: string;
  initialEvents: ReadonlyArray<EventListRow>;
}

export function EventsLiveStream({ workspaceId, initialEvents }: Props) {
  // Live events are prepended in front of the SSR list. We keep them
  // separate (not merged into a single array) so the React keys stay
  // stable for the SSR rows and only the live rows get the fade-in class.
  const [liveEvents, setLiveEvents] = useState<ReadonlyArray<RealtimeEvent>>([]);
  const [toasts, setToasts] = useState<ReadonlyArray<ToastEntry>>([]);
  const [status, setStatus] = useState<ConnectionStatus>('reconnecting');
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);

  // Row DOM refs for "click toast → scroll to event" behaviour.
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const handleNewEvent = useCallback((event: RealtimeEvent) => {
    setLiveEvents((prev) => {
      // Defensive: if Supabase ever replays the same INSERT (rare but
      // possible during reconnect), don't duplicate it.
      if (prev.some((e) => e.id === event.id)) return prev;
      return [event, ...prev];
    });

    const toast: ToastEntry = {
      id: event.id,
      severity: event.severity,
      rule_id: event.rule_id,
    };
    setToasts((prev) => [toast, ...prev].slice(0, 5)); // cap to 5 stacked

    // Schedule auto-dismiss. We don't bother cleaning up on unmount —
    // setToasts on an unmounted component is a no-op (React 18+).
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, TOAST_TTL_MS);
  }, []);

  useEventsChannel(workspaceId, {
    onNewEvent: handleNewEvent,
    onStatus: setStatus,
  });

  const scrollToEvent = useCallback((eventId: string) => {
    const row = rowRefs.current.get(eventId);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  // If there are no SSR rows and no live rows yet, render nothing — the
  // parent page handles the empty-state card. Once a live event arrives
  // we render the table to host it.
  const hasAnyRows = initialEvents.length > 0 || liveEvents.length > 0;
  const combinedRows = useMemo(
    () => [...liveEvents, ...initialEvents],
    [liveEvents, initialEvents]
  );

  return (
    <>
      <LiveStatusPill status={status} />

      {hasAnyRows ? (
        // Native <table> markup here (rather than the <Table>/<TR> wrapper
        // components) because we need per-row refs for scroll-into-view
        // and a per-row className for the fade-in animation. The class
        // strings are kept identical to the shared components so the
        // visual output matches the SSR list when both render at once.
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Rule</th>
                <th className="px-4 py-3 font-medium">Summary</th>
                <th className="px-4 py-3 font-medium">Endpoint</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {combinedRows.map((row) => {
                const isLive = liveEvents.some((e) => e.id === row.id);
                // Live events arrive from the realtime broker as bare
                // `events` rows (no endpoint join), so the hostname is
                // unavailable until the next SSR refresh picks them up
                // from the events_with_endpoint view. Fall back to '-'.
                const endpointHostname: string | null =
                  'endpoint_hostname' in row
                    ? (row as { endpoint_hostname: string | null }).endpoint_hostname
                    : null;
                return (
                  <tr
                    key={row.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(row.id, el);
                      else rowRefs.current.delete(row.id);
                    }}
                    className={
                      'bg-surface-1 hover:bg-surface-2 transition-colors' +
                      (isLive ? ' animate-events-fade-in transition-opacity duration-200' : '')
                    }
                  >
                    <td className="px-4 py-3 text-text-secondary">
                      <Badge tone={severityTone[row.severity]}>{row.severity}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.rule_id ? (
                        <button
                          type="button"
                          onClick={() => setActiveRuleId(row.rule_id)}
                          className="text-brand-sage hover:text-brand-sage-light underline-offset-2 hover:underline"
                          title="View rule details"
                        >
                          {row.rule_id}
                        </button>
                      ) : (
                        <span className="text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-primary">{row.payload_summary ?? ''}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                      {endpointHostname ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(row.occurred_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <ToastStack toasts={toasts} onClick={scrollToEvent} onDismiss={dismissToast} />

      <RuleDrillDown ruleId={activeRuleId} onClose={() => setActiveRuleId(null)} />
    </>
  );
}

// ─── Status pill ────────────────────────────────────────────────────────────

const statusMeta: Record<
  ConnectionStatus,
  { label: string; dotClass: string; pillTone: string; hint?: string }
> = {
  connected: {
    label: 'Live',
    dotClass: 'bg-status-safe animate-pulse',
    pillTone: 'border-status-safe/30 bg-status-safe/10 text-status-safe',
  },
  reconnecting: {
    label: 'Reconnecting...',
    dotClass: 'bg-status-caution animate-pulse',
    pillTone: 'border-status-caution/30 bg-status-caution/10 text-status-caution',
  },
  disconnected: {
    label: 'Offline',
    dotClass: 'bg-text-muted',
    pillTone: 'border-border bg-surface-2 text-text-muted',
    hint: 'Refresh to retry',
  },
};

function LiveStatusPill({ status }: { status: ConnectionStatus }) {
  const meta = statusMeta[status];
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${meta.pillTone}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${meta.dotClass}`} />
      <span>{meta.label}</span>
      {meta.hint ? <span className="text-text-muted">· {meta.hint}</span> : null}
    </div>
  );
}

// ─── Toast stack ────────────────────────────────────────────────────────────

interface ToastStackProps {
  toasts: ReadonlyArray<ToastEntry>;
  onClick: (eventId: string) => void;
  onDismiss: (toastId: string) => void;
}

function ToastStack({ toasts, onClick, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => {
            onClick(toast.id);
            onDismiss(toast.id);
          }}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 py-2 text-left text-sm text-text-primary shadow-lg transition hover:bg-surface-2"
        >
          <span className={`inline-block h-2 w-2 rounded-full ${severityDot[toast.severity]}`} />
          <span className="font-medium">New event detected</span>
          {toast.rule_id ? (
            <span className="text-text-muted font-mono text-xs">{toast.rule_id}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
