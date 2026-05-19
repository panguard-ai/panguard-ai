'use client';

/**
 * useEventsChannel — React hook around `attachEventsChannel`.
 *
 * Lifecycle:
 *   - On mount (or workspaceId change), open a Supabase Realtime channel
 *     scoped to `events:workspace:<workspaceId>` and subscribe to INSERTs
 *     filtered by `workspace_id=eq.<workspaceId>` on the public.events
 *     table. The realtime broker enforces the filter server-side, and RLS
 *     enforces SELECT visibility, so a subscriber cannot receive other
 *     tenants' events even if it spoofs the workspace_id locally.
 *   - On unmount, remove the channel (no leaked WS connections through
 *     HMR / route changes).
 *
 * Callback identity:
 *   - `onNewEvent` / `onStatus` are stored in refs so the channel does not
 *     resubscribe when the caller passes inline arrow functions (common
 *     in client components). The channel only resubscribes when the
 *     workspaceId itself changes.
 */

import { useEffect, useRef } from 'react';
import { createClient } from '../supabase/client';
import {
  attachEventsChannel,
  type SupabaseLike,
  type UseEventsChannelOptions,
} from './events-channel';

export function useEventsChannel(workspaceId: string, options: UseEventsChannelOptions): void {
  const onNewEventRef = useRef(options.onNewEvent);
  const onStatusRef = useRef(options.onStatus);

  // Keep refs current without retriggering the effect.
  onNewEventRef.current = options.onNewEvent;
  onStatusRef.current = options.onStatus;

  useEffect(() => {
    if (!workspaceId) return;

    const client = createClient() as unknown as SupabaseLike;
    const unsubscribe = attachEventsChannel(client, workspaceId, {
      onNewEvent: (event) => onNewEventRef.current(event),
      onStatus: (status) => onStatusRef.current?.(status),
    });

    return unsubscribe;
  }, [workspaceId]);
}
