/**
 * Observable — lazy pull-based stream
 *
 * Inspired by: RxJS Observable
 *
 * Lazy: subscribers pull values via subscription.
 * Operators: map, filter, take, skip, reduce.
 */

export type Observer<T> = (value: T) => void;
export type Producer<T> = (push: (value: T) => void, complete: () => void, error: (err: unknown) => void) => () => void;
export type Unsubscribe = () => void;

export class Observable<T> {
  private producer: Producer<T>;

  constructor(producer: Producer<T>) {
    this.producer = producer;
  }

  /**
   * Subscribe to the observable.
   */
  subscribe(observer: Observer<T>): Unsubscribe {
    let completed = false;
    const push = (v: T) => {
      if (!completed) observer(v);
    };
    const complete = () => { completed = true; };
    const error = (_err: unknown) => { completed = true; };
    return this.producer(push, complete, error);
  }

  /**
   * Transform each value.
   */
  map<R>(fn: (value: T) => R): Observable<R> {
    return new Observable<R>((push) => this.subscribe((v) => push(fn(v))));
  }

  /**
   * Filter values.
   */
  filter(pred: (value: T) => boolean): Observable<T> {
    return new Observable<T>((push) => this.subscribe((v) => { if (pred(v)) push(v); }));
  }

  /**
   * Take first N values.
   */
  take(n: number): Observable<T> {
    return new Observable<T>((push, complete) => {
      let count = 0;
      let unsub: (() => void) | null = null;
      unsub = this.subscribe((v) => {
        if (count < n) {
          push(v);
          count += 1;
          if (count >= n) {
            complete();
            if (unsub) unsub();
          }
        }
      });
      return () => { if (unsub) unsub(); };
    });
  }

  /**
   * Skip first N values.
   */
  skip(n: number): Observable<T> {
    return new Observable<T>((push) => {
      let count = 0;
      return this.subscribe((v) => {
        if (count >= n) push(v);
        count += 1;
      });
    });
  }

  /**
   * Reduce to a single value.
   */
  reduce<R>(fn: (acc: R, value: T) => R, initial: R): R {
    let acc = initial;
    this.subscribe((v) => { acc = fn(acc, v); });
    return acc;
  }

  /**
   * Collect all values into an array.
   */
  toArray(): T[] {
    const arr: T[] = [];
    this.subscribe((v) => { arr.push(v); });
    return arr;
  }

  /**
   * Create from values.
   */
  static from<T>(values: T[]): Observable<T> {
    return new Observable<T>((push) => {
      for (const v of values) push(v);
      return () => {};
    });
  }

  /**
   * Create from a promise.
   */
  static fromPromise<T>(p: Promise<T>): Observable<T> {
    return new Observable<T>((push, complete, error) => {
      p.then((v) => { push(v); complete(); }, (e) => error(e));
      return () => {};
    });
  }
}
