/**
 * Deferred — manually resolvable Promise
 *
 * Inspired by: jQuery Deferred
 *
 * Promise that can be resolved or rejected from outside.
 */

export interface DeferredPromise<T> extends Promise<T> {
  resolve(value: T | PromiseLike<T>): void;
  reject(reason: unknown): void;
  readonly state: 'pending' | 'fulfilled' | 'rejected';
}

export class Deferred<T> implements DeferredPromise<T> {
  private _resolve!: (value: T | PromiseLike<T>) => void;
  private _reject!: (reason: unknown) => void;
  private _state: 'pending' | 'fulfilled' | 'rejected' = 'pending';
  readonly promise: Promise<T>;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  resolve(value: T | PromiseLike<T>): void {
    if (this._state !== 'pending') return;
    this._state = 'fulfilled';
    this._resolve(value);
  }

  reject(reason: unknown): void {
    if (this._state !== 'pending') return;
    this._state = 'rejected';
    this._reject(reason);
  }

  get state(): 'pending' | 'fulfilled' | 'rejected' {
    return this._state;
  }

  // Promise interface methods
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | TResult> {
    return this.promise.catch(onrejected);
  }
  finally(onfinally?: (() => void) | null): Promise<T> {
    return this.promise.finally(onfinally);
  }
  readonly [Symbol.toStringTag] = 'Promise';

  static resolved<T>(value: T): Deferred<T> {
    const d = new Deferred<T>();
    d.resolve(value);
    return d;
  }

  static rejected<T>(reason: unknown): Deferred<T> {
    const d = new Deferred<T>();
    d.reject(reason);
    return d;
  }
}
