/**
 * Stopwatch — high-resolution timer
 *
 * Inspired by: Java Stopwatch / performance.now
 *
 * High-resolution elapsed time measurement.
 */

export class Stopwatch {
  private startTime: number = 0;
  private endTime: number = 0;
  private running: boolean = false;

  /**
   * Start the stopwatch. Returns this for chaining.
   */
  start(): this {
    this.startTime = performance.now();
    this.endTime = 0;
    this.running = true;
    return this;
  }

  /**
   * Stop the stopwatch.
   */
  stop(): this {
    if (!this.running) throw new Error('Stopwatch not started');
    this.endTime = performance.now();
    this.running = false;
    return this;
  }

  /**
   * Reset.
   */
  reset(): this {
    this.startTime = 0;
    this.endTime = 0;
    this.running = false;
    return this;
  }

  /**
   * Get elapsed time in milliseconds.
   */
  elapsedMs(): number {
    if (!this.startTime) return 0;
    if (this.running) return performance.now() - this.startTime;
    return this.endTime - this.startTime;
  }

  /**
   * Elapsed in seconds.
   */
  elapsedSec(): number {
    return this.elapsedMs() / 1000;
  }

  /**
   * Elapsed in nanoseconds (approximate).
   */
  elapsedNs(): bigint {
    return BigInt(Math.floor(this.elapsedMs() * 1_000_000));
  }

  /**
   * Whether running.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Create and start in one call.
   */
  static startNew(): Stopwatch {
    return new Stopwatch().start();
  }

  /**
   * Measure a function and return result + elapsed.
   */
  static async measure<T>(fn: () => Promise<T>): Promise<{ result: T; elapsedMs: number }> {
    const sw = Stopwatch.startNew();
    try {
      const result = await fn();
      sw.stop();
      return { result, elapsedMs: sw.elapsedMs() };
    } catch (err) {
      sw.stop();
      throw err;
    }
  }
}
