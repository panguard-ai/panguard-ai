/**
 * Unit tests for the Supabase Realtime events channel wiring.
 *
 * We don't try to e2e the WebSocket transport — that lives in WS6
 * Playwright runs against a live Supabase project. Here we exercise the
 * pure `attachEventsChannel` helper to verify:
 *
 *   - the channel name is workspace-scoped: events:workspace:<id>
 *   - the postgres_changes subscription is filtered server-side to the
 *     workspace_id, so RLS + filter together prevent cross-tenant leak
 *   - the handler unwraps payload.new and forwards it to onNewEvent
 *   - the unsubscribe fn calls removeChannel on the supabase client
 *   - mapChannelStatus matches the UI state machine
 */

import { describe, it, expect, vi } from 'vitest';
import {
  attachEventsChannel,
  mapChannelStatus,
  type RealtimeEvent,
  type SupabaseLike,
  type SupabaseChannelLike,
} from '../src/lib/realtime/events-channel';

/**
 * Build a mock supabase client that records every interaction so each
 * test can assert on it directly. The mock channel returns `this` from
 * .on/.subscribe to keep the fluent API working.
 */
function makeMockClient() {
  const handlers: Array<(payload: { new: RealtimeEvent }) => void> = [];
  const statusCallbacks: Array<(status: string) => void> = [];

  const channel = {
    on: vi.fn((_event, _filter, handler) => {
      handlers.push(handler);
      return channel as SupabaseChannelLike;
    }),
    subscribe: vi.fn((cb?: (status: string) => void) => {
      if (cb) statusCallbacks.push(cb);
      return channel as SupabaseChannelLike;
    }),
  };

  const client: SupabaseLike & {
    channel: ReturnType<typeof vi.fn>;
    removeChannel: ReturnType<typeof vi.fn>;
  } = {
    channel: vi.fn(() => channel as SupabaseChannelLike),
    removeChannel: vi.fn(),
  };

  return {
    client,
    channel,
    /** Fire a fake INSERT payload through the registered handler(s). */
    emitInsert(payload: RealtimeEvent) {
      for (const h of handlers) h({ new: payload });
    },
    /** Fire a fake status change through the subscribe callback(s). */
    emitStatus(status: string) {
      for (const cb of statusCallbacks) cb(status);
    },
  };
}

const WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';

const SAMPLE_EVENT: RealtimeEvent = {
  id: '22222222-2222-2222-2222-222222222222',
  workspace_id: WORKSPACE_ID,
  endpoint_id: null,
  event_type: 'scan.rule_match',
  severity: 'critical',
  rule_id: 'ATR-2026-00440',
  target: 'skill.md@abc123',
  target_hash: null,
  payload_summary: 'SK exfil pattern matched',
  metadata: {},
  occurred_at: '2026-05-12T12:00:00Z',
  ingested_at: '2026-05-12T12:00:01Z',
};

describe('attachEventsChannel', () => {
  it('opens a channel named events:workspace:<id>', () => {
    const { client } = makeMockClient();
    attachEventsChannel(client, WORKSPACE_ID, { onNewEvent: vi.fn() });
    expect(client.channel).toHaveBeenCalledWith(`events:workspace:${WORKSPACE_ID}`);
  });

  it('subscribes to postgres_changes filtered to the workspace_id', () => {
    const { client, channel } = makeMockClient();
    attachEventsChannel(client, WORKSPACE_ID, { onNewEvent: vi.fn() });

    expect(channel.on).toHaveBeenCalledTimes(1);
    const [event, filter] = channel.on.mock.calls[0]!;
    expect(event).toBe('postgres_changes');
    expect(filter).toEqual({
      event: 'INSERT',
      schema: 'public',
      table: 'events',
      filter: `workspace_id=eq.${WORKSPACE_ID}`,
    });
  });

  it('forwards payload.new to onNewEvent', () => {
    const { client, emitInsert } = makeMockClient();
    const onNewEvent = vi.fn();
    attachEventsChannel(client, WORKSPACE_ID, { onNewEvent });

    emitInsert(SAMPLE_EVENT);

    expect(onNewEvent).toHaveBeenCalledTimes(1);
    expect(onNewEvent).toHaveBeenCalledWith(SAMPLE_EVENT);
  });

  it('relays mapped status updates to onStatus', () => {
    const { client, emitStatus } = makeMockClient();
    const onStatus = vi.fn();
    attachEventsChannel(client, WORKSPACE_ID, {
      onNewEvent: vi.fn(),
      onStatus,
    });

    emitStatus('SUBSCRIBED');
    emitStatus('CHANNEL_ERROR');
    emitStatus('CLOSED');

    expect(onStatus.mock.calls.map((c) => c[0])).toEqual([
      'connected',
      'reconnecting',
      'disconnected',
    ]);
  });

  it('ignores unrecognised raw statuses (UI keeps last-known)', () => {
    const { client, emitStatus } = makeMockClient();
    const onStatus = vi.fn();
    attachEventsChannel(client, WORKSPACE_ID, {
      onNewEvent: vi.fn(),
      onStatus,
    });

    emitStatus('SOME_FUTURE_STATUS');
    expect(onStatus).not.toHaveBeenCalled();
  });

  it('omits onStatus calls when no onStatus callback was supplied', () => {
    const { client, emitStatus } = makeMockClient();
    // Should not throw even though no onStatus is wired.
    attachEventsChannel(client, WORKSPACE_ID, { onNewEvent: vi.fn() });
    expect(() => emitStatus('SUBSCRIBED')).not.toThrow();
  });

  it('unsubscribe calls removeChannel exactly once', () => {
    const { client, channel } = makeMockClient();
    const unsubscribe = attachEventsChannel(client, WORKSPACE_ID, {
      onNewEvent: vi.fn(),
    });

    unsubscribe();

    expect(client.removeChannel).toHaveBeenCalledTimes(1);
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });

  it('uses the workspaceId verbatim in both channel name and filter', () => {
    // Defensive: even if the workspaceId is unusual (e.g. uppercase, or a
    // dev-fixture string), we don't transform it. RLS + filter operate on
    // exact uuid equality.
    const { client, channel } = makeMockClient();
    const id = 'TEST-FIXTURE-WS-1';
    attachEventsChannel(client, id, { onNewEvent: vi.fn() });

    expect(client.channel).toHaveBeenCalledWith(`events:workspace:${id}`);
    const [, filter] = channel.on.mock.calls[0]!;
    expect(filter.filter).toBe(`workspace_id=eq.${id}`);
  });
});

describe('mapChannelStatus', () => {
  it('maps SUBSCRIBED to connected', () => {
    expect(mapChannelStatus('SUBSCRIBED')).toBe('connected');
  });

  it.each(['CHANNEL_ERROR', 'TIMED_OUT'])('maps %s to reconnecting', (raw) => {
    expect(mapChannelStatus(raw)).toBe('reconnecting');
  });

  it('maps CLOSED to disconnected', () => {
    expect(mapChannelStatus('CLOSED')).toBe('disconnected');
  });

  it('returns null for unknown statuses (caller keeps last-known)', () => {
    expect(mapChannelStatus('UNKNOWN')).toBeNull();
    expect(mapChannelStatus('')).toBeNull();
  });
});
