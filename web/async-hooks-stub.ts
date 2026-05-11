// Stub for Node.js async_hooks module in browser builds
// All AsyncLocalStorage operations become no-ops

export class AsyncLocalStorage<T> {
  getStore(): T | undefined {
    return undefined;
  }
  run<R>(store: T, callback: () => R): R {
    return callback();
  }
  enterWith(_store: T): void {
    // no-op
  }
  exit<R>(callback: () => R): R {
    return callback();
  }
  disable(): void {
    // no-op
  }
}
