/**
 * Realtime events channel — pure module, no React.
 *
 * The `useEventsChannel` React hook is in `./use-events-channel.ts` so
 * this file stays import-clean for vitest (it transitively avoids the
 * `@/lib/env` alias chain in `@/lib/supabase/client`).
 *
 * Design notes:
 *   - One channel per workspace_id, scoped via the postgres_changes filter
 *     so the realtime broker server-side filters before the WS payload
 *     crosses the wire. Combined with the RLS SELECT policy on events,
 *     this means a subscriber receives events only for workspaces it can
 *     read.
 *   - `attachEventsChannel` is the testable seam: it takes a supabase-like
 *     client and returns an unsubscribe fn. Tests pass a vi.fn() mock and
 *     assert on the channel/filter/handler wiring without standing up a
 *     real Supabase project.
 */

import type { SecurityEvent } from '../types';

/**
 * Payload shape mirrors public.events row. The realtime broker always
 * sends the full row (because REPLICA IDENTITY FULL was set in
 * 20260512000005_events_realtime.sql), so any column may be inspected.
 */
export type RealtimeEvent = SecurityEvent;

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface UseEventsChannelOptions {
  /** Fires for every INSERT into public.events for this workspace. */
  onNewEvent: (event: RealtimeEvent) => void;
  /**
   * Optional channel-status callback. The realtime client auto-reconnects
   * on disconnect, so this is informational — the UI uses it to render a
   * live/reconnecting/offline dot.
   */
  onStatus?: (status: ConnectionStatus) => void;
}

/**
 * Minimal structural interface we need from the supabase client. Lets the
 * tests pass a mock without importing @supabase/supabase-js. The real
 * client is wider; we only call .channel() / .removeChannel().
 */
export interface SupabaseLike {
  channel: (name: string) => SupabaseChannelLike;
  removeChannel: (channel: unknown) => unknown;
}

export interface SupabaseChannelLike {
  on: (
    event: string,
    filter: {
      event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema: string;
      table: string;
      filter?: string;
    },
    handler: (payload: { new: RealtimeEvent }) => void
  ) => SupabaseChannelLike;
  subscribe: (cb?: (status: string) => void) => SupabaseChannelLike;
}

/**
 * Map raw Supabase channel statuses onto our 3-state UI vocabulary.
 * Exported so tests can assert the same mapping the UI relies on.
 */
export function mapChannelStatus(raw: string): ConnectionStatus | null {
  switch (raw) {
    case 'SUBSCRIBED':
      return 'connected';
    case 'CHANNEL_ERROR':
    case 'TIMED_OUT':
      return 'reconnecting';
    case 'CLOSED':
      return 'disconnected';
    default:
      return null;
  }
}

/**
 * Wire a realtime channel against a supabase-like client. Pure: no React,
 * no module-level state. Returns the unsubscribe function the caller is
 * responsible for invoking when done.
 */
export function attachEventsChannel(
  client: SupabaseLike,
  workspaceId: string,
  options: UseEventsChannelOptions
): () => void {
  const channel = client
    .channel(`events:workspace:${workspaceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `workspace_id=eq.${workspaceId}`,
      },
      (payload) => {
        options.onNewEvent(payload.new);
      }
    )
    .subscribe((status) => {
      const mapped = mapChannelStatus(status);
      if (mapped && options.onStatus) options.onStatus(mapped);
    });

  return () => {
    client.removeChannel(channel);
  };
}
