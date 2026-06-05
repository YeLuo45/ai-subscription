/**
 * WorkflowReplay.test.ts — Pure unit tests for event-sourcing replay engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowReplay, type Reducer, type WorkflowEvent } from '../WorkflowReplay';

interface CounterState {
  count: number;
  total: number;
}
type CounterEvent = { delta?: number; value?: number };

const counterReducer: Reducer<CounterState, CounterEvent> = (state, event) => {
  if (event.type === 'increment') return { count: state.count + 1, total: state.total + 1 };
  if (event.type === 'add') return { count: state.count + (event.payload.delta ?? 0), total: state.total + (event.payload.delta ?? 0) };
  if (event.type === 'set') return { ...state, count: event.payload.value ?? 0 };
  return state;
};

describe('WorkflowReplay — record and getEvents', () => {
  let wr: WorkflowReplay;
  beforeEach(() => {
    wr = new WorkflowReplay();
  });

  it('records an event', () => {
    const event = wr.record('increment', 'agg-1', {});
    expect(event.id).toMatch(/^evt-/);
    expect(event.type).toBe('increment');
    expect(event.aggregateId).toBe('agg-1');
    expect(event.version).toBe(1);
  });

  it('auto-increments version per aggregate', () => {
    const e1 = wr.record('inc', 'a', {});
    const e2 = wr.record('inc', 'a', {});
    const e3 = wr.record('inc', 'a', {});
    expect(e1.version).toBe(1);
    expect(e2.version).toBe(2);
    expect(e3.version).toBe(3);
  });

  it('per-aggregate version is independent', () => {
    const a1 = wr.record('inc', 'a', {});
    const b1 = wr.record('inc', 'b', {});
    const a2 = wr.record('inc', 'a', {});
    expect(a1.version).toBe(1);
    expect(b1.version).toBe(1);
    expect(a2.version).toBe(2);
  });

  it('getEvents filters by aggregateId', () => {
    wr.record('e', 'a', {});
    wr.record('e', 'b', {});
    wr.record('e', 'a', {});
    expect(wr.getEvents('a').length).toBe(2);
    expect(wr.getEvents('b').length).toBe(1);
  });

  it('getEvents filters by version range', () => {
    wr.record('e', 'a', {});
    wr.record('e', 'a', {});
    wr.record('e', 'a', {});
    expect(wr.getEvents('a', 2).length).toBe(2);
    expect(wr.getEvents('a', 1, 2).length).toBe(2);
    expect(wr.getEvents('a', 3, 10).length).toBe(1);
  });

  it('totalEvents returns count', () => {
    wr.record('e', 'a', {});
    wr.record('e', 'a', {});
    expect(wr.totalEvents()).toBe(2);
  });
});

describe('WorkflowReplay — fold', () => {
  it('folds events through reducer', () => {
    const wr = new WorkflowReplay();
    wr.record('increment', 'a', {});
    wr.record('increment', 'a', {});
    wr.record('increment', 'a', {});
    const state = wr.fold('a', counterReducer, { count: 0, total: 0 });
    expect(state.count).toBe(3);
  });

  it('folds with add events', () => {
    const wr = new WorkflowReplay();
    wr.record('add', 'a', { delta: 5 });
    wr.record('add', 'a', { delta: 10 });
    const state = wr.fold('a', counterReducer, { count: 0, total: 0 });
    expect(state.count).toBe(15);
  });

  it('respects fromVersion in fold', () => {
    const wr = new WorkflowReplay();
    wr.record('increment', 'a', {});
    wr.record('increment', 'a', {});
    wr.record('increment', 'a', {});
    const state = wr.fold('a', counterReducer, { count: 0, total: 0 }, { fromVersion: 2 });
    expect(state.count).toBe(2);
  });
});

describe('WorkflowReplay — replay', () => {
  it('replays events to derive state', () => {
    const wr = new WorkflowReplay();
    wr.record('increment', 'a', {});
    wr.record('increment', 'a', {});
    const result = wr.replay<CounterState, CounterEvent>('a', {
      reducer: counterReducer,
      initialState: { count: 0, total: 0 },
    });
    expect(result.eventsApplied).toBe(2);
    expect(result.state.count).toBe(2);
    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(2);
  });

  it('replay returns zero state for empty aggregate', () => {
    const wr = new WorkflowReplay();
    const result = wr.replay('nope', { initialState: null });
    expect(result.eventsApplied).toBe(0);
    expect(result.state).toBeNull();
  });

  it('replay collects events when no reducer provided', () => {
    const wr = new WorkflowReplay();
    wr.record('e1', 'a', { x: 1 });
    wr.record('e2', 'a', { x: 2 });
    const result = wr.replay('a', { initialState: [] });
    const events = result.state as unknown as WorkflowEvent[];
    expect(events.length).toBe(2);
  });
});

describe('WorkflowReplay — snapshots', () => {
  it('takes a snapshot', () => {
    const wr = new WorkflowReplay();
    const snapshot = wr.takeSnapshot('a', { count: 5 }, 5);
    expect(snapshot.state.count).toBe(5);
    expect(snapshot.version).toBe(5);
  });

  it('getSnapshot returns latest', () => {
    const wr = new WorkflowReplay();
    wr.takeSnapshot('a', { count: 1 }, 1);
    wr.takeSnapshot('a', { count: 2 }, 2);
    expect(wr.getSnapshot('a')?.state.count).toBe(2);
  });

  it('replayFromSnapshot loads state and applies tail events', () => {
    const wr = new WorkflowReplay();
    wr.record('increment', 'a', {});
    wr.record('increment', 'a', {});
    wr.record('increment', 'a', {});
    wr.takeSnapshot('a', { count: 1, total: 1 }, 1);
    const result = wr.replayFromSnapshot<CounterState, CounterEvent>('a', {
      reducer: counterReducer,
    });
    expect(result.eventsApplied).toBe(2); // events 2 and 3
    expect(result.state.count).toBe(3); // 1 from snapshot + 2 from tail
  });

  it('replayFromSnapshot without snapshot replays from start', () => {
    const wr = new WorkflowReplay();
    wr.record('increment', 'a', {});
    const result = wr.replayFromSnapshot<CounterState, CounterEvent>('a', {
      reducer: counterReducer,
      initialState: { count: 0, total: 0 },
    });
    expect(result.eventsApplied).toBe(1);
    expect(result.state.count).toBe(1);
  });
});

describe('WorkflowReplay — purge and aggregates', () => {
  it('purge removes all events for an aggregate', () => {
    const wr = new WorkflowReplay();
    wr.record('e', 'a', {});
    wr.record('e', 'a', {});
    wr.record('e', 'b', {});
    wr.takeSnapshot('a', {}, 2);
    const removed = wr.purge('a');
    expect(removed).toBe(2);
    expect(wr.getEvents('a').length).toBe(0);
    expect(wr.getEvents('b').length).toBe(1);
    expect(wr.getSnapshot('a')).toBeUndefined();
  });

  it('listAggregates returns unique aggregate ids', () => {
    const wr = new WorkflowReplay();
    wr.record('e', 'a', {});
    wr.record('e', 'a', {});
    wr.record('e', 'b', {});
    expect(wr.listAggregates().sort()).toEqual(['a', 'b']);
  });
});

describe('WorkflowReplay — stats', () => {
  it('reports counts and timestamps', () => {
    const wr = new WorkflowReplay();
    wr.record('e', 'a', {});
    wr.record('e', 'b', {});
    wr.takeSnapshot('a', {}, 1);
    const s = wr.stats();
    expect(s.totalEvents).toBe(2);
    expect(s.totalSnapshots).toBe(1);
    expect(s.totalAggregates).toBe(2);
    expect(s.oldestEventTimestamp).toBeDefined();
    expect(s.newestEventTimestamp).toBeDefined();
  });
});

describe('WorkflowReplay — maxLogSize', () => {
  it('caps log size', () => {
    const wr = new WorkflowReplay();
    wr.setMaxLogSize(5);
    for (let i = 0; i < 10; i++) wr.record('e', 'a', { i });
    expect(wr.totalEvents()).toBe(5);
  });

  it('removes oldest events when exceeding maxLogSize', () => {
    const wr = new WorkflowReplay();
    for (let i = 0; i < 5; i++) wr.record('e', 'a', { i });
    wr.setMaxLogSize(3);
    const events = wr.getAllEvents();
    expect(events[0].payload).toEqual({ i: 2 });
  });
});
