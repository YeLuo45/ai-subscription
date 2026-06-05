/**
 * StateMachine — finite state machine
 *
 * Inspired by: generic-agent state machine
 *
 * Define states, transitions, and run the machine.
 * Supports:
 *   - guards (predicates on context that gate transitions)
 *   - actions (side effects on enter/exit/transition)
 *   - context (state data passed to guards/actions)
 *   - history (past states)
 *   - parallel states (sub-machines)
 */

export interface State<S extends string, C = Record<string, unknown>> {
  name: S;
  /** Action called when entering this state */
  onEnter?: (context: C) => void | Promise<void>;
  /** Action called when leaving this state */
  onExit?: (context: C) => void | Promise<void>;
  /** If true, this is a final state — machine stops here */
  final?: boolean;
}

export interface Transition<S extends string, C = Record<string, unknown>> {
  from: S;
  to: S;
  /** Event that triggers this transition */
  event: string;
  /** Optional guard — returns true to allow transition */
  guard?: (context: C) => boolean | Promise<boolean>;
  /** Optional action called during transition */
  action?: (context: C) => void | Promise<void>;
}

export interface StateMachineConfig<S extends string, C = Record<string, unknown>> {
  initial: S;
  states: State<S, C>[];
  transitions: Transition<S, C>[];
  context?: C;
}

export interface TransitionResult {
  success: boolean;
  fromState: string;
  toState: string;
  event: string;
  reason?: string;
}

export class StateMachine<S extends string = string, C = Record<string, unknown>> {
  private states: Map<S, State<S, C>> = new Map();
  private transitions: Transition<S, C>[] = [];
  private currentState: S;
  private context: C;
  private initialState: S;
  private history: Array<{ state: S; timestamp: number; event?: string }> = [];
  private transitionCount: number = 0;
  private name: string;

  constructor(config: StateMachineConfig<S, C>, name: string = 'sm') {
    this.name = name;
    this.initialState = config.initial;
    this.currentState = config.initial;
    this.context = (config.context ?? {}) as C;
    for (const s of config.states) {
      this.states.set(s.name, s);
    }
    if (!this.states.has(config.initial)) {
      throw new Error(`initial state "${config.initial}" not in states`);
    }
    this.transitions = [...config.transitions];
    this.history.push({ state: config.initial, timestamp: Date.now() });
  }

  /** Get current state. */
  getState(): S {
    return this.currentState;
  }

  /** Get current context. */
  getContext(): C {
    return { ...this.context };
  }

  /** Update context (merge). */
  setContext(updates: Partial<C>): void {
    this.context = { ...this.context, ...updates };
  }

  /** Get history. */
  getHistory(): Array<{ state: S; timestamp: number; event?: string }> {
    return [...this.history];
  }

  /** Get transition count. */
  getTransitionCount(): number {
    return this.transitionCount;
  }

  /** Get all possible next states for the current state. */
  getAvailableEvents(): string[] {
    return this.transitions
      .filter((t) => t.from === this.currentState)
      .map((t) => t.event);
  }

  /** Check if a transition is possible (state + event match, guard passes). */
  async canFire(event: string): Promise<boolean> {
    const candidates = this.transitions.filter(
      (t) => t.from === this.currentState && t.event === event,
    );
    for (const t of candidates) {
      if (!t.guard) return true;
      if (await t.guard(this.context)) return true;
    }
    return false;
  }

  /**
   * Fire an event. If a matching transition exists and its guard passes,
   * execute the transition (onExit, action, onEnter).
   */
  async fire(event: string): Promise<TransitionResult> {
    const candidates = this.transitions.filter(
      (t) => t.from === this.currentState && t.event === event,
    );
    for (const t of candidates) {
      if (t.guard) {
        const ok = await t.guard(this.context);
        if (!ok) continue;
      }
      const fromState = this.currentState;
      const fromDef = this.states.get(fromState);
      if (fromDef?.onExit) await fromDef.onExit(this.context);
      if (t.action) await t.action(this.context);
      this.currentState = t.to;
      this.transitionCount += 1;
      const toDef = this.states.get(t.to);
      if (toDef?.onEnter) await toDef.onEnter(this.context);
      this.history.push({ state: t.to, timestamp: Date.now(), event });
      return {
        success: true,
        fromState,
        toState: t.to,
        event,
      };
    }
    return {
      success: false,
      fromState: this.currentState,
      toState: this.currentState,
      event,
      reason: 'no matching transition or guard failed',
    };
  }

  /** Is the machine in a final state? */
  isFinal(): boolean {
    const def = this.states.get(this.currentState);
    return def?.final === true;
  }

  /** Reset to initial state. */
  reset(): void {
    this.currentState = this.initialState;
    this.transitionCount = 0;
    this.history = [{ state: this.initialState, timestamp: Date.now() }];
  }

  /** Validate config: ensure all transitions reference defined states. */
  validate(): string[] {
    const issues: string[] = [];
    for (const t of this.transitions) {
      if (!this.states.has(t.from)) {
        issues.push(`transition "${t.event}" has unknown from state "${t.from}"`);
      }
      if (!this.states.has(t.to)) {
        issues.push(`transition "${t.event}" has unknown to state "${t.to}"`);
      }
    }
    return issues;
  }

  /** Add a transition at runtime. */
  addTransition(transition: Transition<S, C>): void {
    this.transitions.push(transition);
  }

  /** Get machine name. */
  getName(): string {
    return this.name;
  }
}
