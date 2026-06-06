/**
 * Subject — RxJS-style subject (multicast event source)
 *
 * Inspired by: RxJS Subject
 *
 * Both Observable and Observer.
 * Multiple subscribers receive the same events.
 */

export type Observer<T> = (value: T) => void;
export type Unsubscribe = () => void;

export class Subject<T> {
  private observers: Set<Observer<T>> = new Set();
  private completed: boolean = false;
  private errorState: unknown = undefined;
  private hasError: boolean = false;

  /**
   * Subscribe to events. Returns unsubscribe function.
   */
  subscribe(observer: Observer<T>): Unsubscribe {
    if (this.completed) {
      return () => {};
    }
    this.observers.add(observer);
    if (this.hasError) {
      throw this.errorState;
    }
    return () => {
      this.observers.delete(observer);
    };
  }

  /**
   * Push a value to all subscribers.
   */
  next(value: T): void {
    if (this.completed) return;
    for (const o of this.observers) {
      try {
        o(value);
      } catch (err) {
        // continue to next observer
        console.error('Subject observer error:', err);
      }
    }
  }

  /**
   * Complete the subject. No more values will be emitted.
   */
  complete(): void {
    this.completed = true;
    this.observers.clear();
  }

  /**
   * Mark the subject as errored.
   */
  error(err: unknown): void {
    this.hasError = true;
    this.errorState = err;
    this.observers.clear();
  }

  /**
   * Number of active subscribers.
   */
  get observerCount(): number {
    return this.observers.size;
  }

  /**
   * Whether the subject is completed.
   */
  get isClosed(): boolean {
    return this.completed || this.hasError;
  }

  /**
   * Pipe values through a transformation.
   */
  pipe<R>(fn: (value: T) => R): Subject<R> {
    const out = new Subject<R>();
    this.subscribe((v) => out.next(fn(v)));
    return out;
  }

  /**
   * Map to async (returns Promise that resolves on first value).
   */
  first(): Promise<T> {
    return new Promise((resolve) => {
      const unsub = this.subscribe((v) => {
        resolve(v);
        unsub();
      });
    });
  }
}
