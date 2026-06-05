/**
 * WorkflowReplay — event sourcing replay engine
 *
 * Inspired by: thunderbolt-design Event Sourcing
 * Source: /home/hermes/projects/thunderbolt-design/docs-site/event-sourcing.md
 *
 * Event-sourced workflow replay:
 * 1. Record all events (immutable log) as the workflow executes
 * 2. Each event has: id, type, aggregateId, payload, timestamp, version
 * 3. State is derived by folding events through a reducer
 * 4. Replay: re-apply events from start to reconstruct state
 * 5. Snapshot: take periodic state snapshots for fast recovery
 * 6. Replay from snapshot: load snapshot + apply events after it
 *
 * Key methods:
 *   - record(event): append event to log
 *   - fold(aggregateId, reducer, initialState): derive current state
 *   - replay(aggregateId, fromVersion?): re-apply events
 *   - snapshot(aggregateId, state, version): save state snapshot
 *   - replayFromSnapshot(aggregateId): load snapshot + tail events
 *   - getEvents(aggregateId, fromVersion?, toVersion?): query events
 */

export interface WorkflowEvent<T = unknown> {
  id: string;
  type: string;
  aggregateId: string;
  payload: T;
  timestamp: number;
  /** Monotonically increasing version per aggregate */
  version: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Optional correlation ID */
  correlationId?: string;
}

export interface Snapshot<S = unknown> {
  aggregateId: string;
  state: S;
  version: number;
  timestamp: number;
}

export type Reducer<S, E> = (state: S, event: WorkflowEvent<E>) => S;

export interface ReplayOptions {
  /** Skip events before this version */
  fromVersion?: number;
  /** Stop replay at this version */
  toVersion?: number;
  /** Custom reducer (default: identity accumulator) */
  reducer?: Reducer<unknown, unknown>;
  /** Initial state for replay */
  initialState?: unknown;
}

export interface ReplayResult<S = unknown> {
  aggregateId: string;
  state: S;
  eventsApplied: number;
  durationMs: number;
  fromVersion: number;
  toVersion: number;
}

export class WorkflowReplay<S = unknown, E = unknown> {
  private events: WorkflowEvent<E>[] = [];
  private snapshots: Map<string, Snapshot<S>> = new Map();
  private counter: number = 0;
  private maxLogSize: number = 10000;

  private nextId(): string {
    this.counter += 1;
    return `evt-${Date.now().toString(36)}-${this.counter}`;
  }

  /**
   * Record an event. Auto-assigns id, timestamp, and version (per aggregate).
   */
  record(type: string, aggregateId: string, payload: E, options: { metadata?: Record<string, unknown>; correlationId?: string } = {}): WorkflowEvent<E> {
    // Determine next version for this aggregate
    const aggregateEvents = this.events.filter((e) => e.aggregateId === aggregateId);
    const lastVersion = aggregateEvents.length > 0 ? aggregateEvents[aggregateEvents.length - 1].version : 0;
    const event: WorkflowEvent<E> = {
      id: this.nextId(),
      type,
      aggregateId,
      payload,
      timestamp: Date.now(),
      version: lastVersion + 1,
      metadata: options.metadata,
      correlationId: options.correlationId,
    };
    this.events.push(event);
    // Bound log
    if (this.events.length > this.maxLogSize) this.events.shift();
    return event;
  }

  /**
   * Get events for an aggregate, optionally filtered by version range.
   */
  getEvents(aggregateId: string, fromVersion?: number, toVersion?: number): WorkflowEvent<E>[] {
    let list = this.events.filter((e) => e.aggregateId === aggregateId);
    if (fromVersion !== undefined) list = list.filter((e) => e.version >= fromVersion);
    if (toVersion !== undefined) list = list.filter((e) => e.version <= toVersion);
    return [...list];
  }

  /** Get all events. */
  getAllEvents(): WorkflowEvent<E>[] {
    return [...this.events];
  }

  /** Total number of events. */
  totalEvents(): number {
    return this.events.length;
  }

  /**
   * Fold events through a reducer to derive current state.
   * Reducer signature: (state, event) => newState
   */
  fold(aggregateId: string, reducer: Reducer<S, E>, initialState: S, options: { fromVersion?: number; toVersion?: number } = {}): S {
    const events = this.getEvents(aggregateId, options.fromVersion, options.toVersion);
    let state = initialState;
    for (const event of events) {
      state = reducer(state, event);
    }
    return state;
  }

  /**
   * Replay events for an aggregate, with optional reducer + initial state.
   * Returns the resulting state and stats.
   */
  replay(aggregateId: string, options: { fromVersion?: number; toVersion?: number; reducer?: Reducer<S, E>; initialState?: S } = {}): ReplayResult<S> {
    const start = Date.now();
    const events = this.getEvents(aggregateId, options.fromVersion, options.toVersion);
    if (events.length === 0) {
      return {
        aggregateId,
        state: (options.initialState ?? null) as S,
        eventsApplied: 0,
        durationMs: 0,
        fromVersion: options.fromVersion ?? 0,
        toVersion: options.toVersion ?? 0,
      };
    }
    const fromVersion = options.fromVersion ?? 1;
    const toVersion = options.toVersion ?? events[events.length - 1].version;
    let state: S = (options.initialState ?? null) as S;
    if (options.reducer) {
      for (const event of events) {
        state = options.reducer(state, event);
      }
    } else {
      // Default: collect events into state array
      state = events as unknown as S;
    }
    return {
      aggregateId,
      state,
      eventsApplied: events.length,
      durationMs: Date.now() - start,
      fromVersion,
      toVersion,
    };
  }

  /**
   * Take a snapshot of the current state.
   */
  takeSnapshot(aggregateId: string, state: S, version: number): Snapshot<S> {
    const snapshot: Snapshot<S> = {
      aggregateId,
      state,
      version,
      timestamp: Date.now(),
    };
    this.snapshots.set(aggregateId, snapshot);
    return snapshot;
  }

  /** Get the latest snapshot for an aggregate. */
  getSnapshot(aggregateId: string): Snapshot<S> | undefined {
    return this.snapshots.get(aggregateId);
  }

  /**
   * Replay using the latest snapshot + events after it.
   * Faster than replay from start when many events exist.
   */
  replayFromSnapshot(aggregateId: string, options: { reducer?: Reducer<S, E>; toVersion?: number; initialState?: S } = {}): ReplayResult<S> {
    const start = Date.now();
    const snapshot = this.snapshots.get(aggregateId);
    if (!snapshot) {
      // No snapshot — replay from start
      return this.replay(aggregateId, options);
    }
    const events = this.getEvents(aggregateId, snapshot.version + 1, options.toVersion);
    let state = snapshot.state;
    if (options.reducer && events.length > 0) {
      for (const event of events) {
        state = options.reducer(state, event);
      }
    }
    return {
      aggregateId,
      state,
      eventsApplied: events.length,
      durationMs: Date.now() - start,
      fromVersion: snapshot.version + 1,
      toVersion: options.toVersion ?? (events.length > 0 ? events[events.length - 1].version : snapshot.version),
    };
  }

  /** Clear all events for an aggregate (use with caution). */
  purge(aggregateId: string): number {
    const before = this.events.length;
    this.events = this.events.filter((e) => e.aggregateId !== aggregateId);
    this.snapshots.delete(aggregateId);
    return before - this.events.length;
  }

  /** List aggregate IDs with at least one event. */
  listAggregates(): string[] {
    return Array.from(new Set(this.events.map((e) => e.aggregateId)));
  }

  /** Statistics. */
  stats(): {
    totalEvents: number;
    totalSnapshots: number;
    totalAggregates: number;
    oldestEventTimestamp?: number;
    newestEventTimestamp?: number;
  } {
    const aggregates = this.listAggregates();
    return {
      totalEvents: this.events.length,
      totalSnapshots: this.snapshots.size,
      totalAggregates: aggregates.length,
      oldestEventTimestamp: this.events.length > 0 ? this.events[0].timestamp : undefined,
      newestEventTimestamp: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : undefined,
    };
  }

  /** Set max log size (older events are dropped). */
  setMaxLogSize(size: number): void {
    this.maxLogSize = size;
    while (this.events.length > this.maxLogSize) this.events.shift();
  }
}
