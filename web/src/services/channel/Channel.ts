/**
 * Channel — Go-style buffered channel
 *
 * Inspired by: Go channels
 *
 * Async send/recv with optional buffer.
 * send() blocks if buffer full; recv() blocks if empty.
 */

export class Channel<T> {
  private buffer: T[] = [];
  private capacity: number;
  private senders: Array<{ value: T; resolve: () => void }> = [];
  private receivers: Array<(value: T) => void> = [];
  private closed: boolean = false;

  constructor(capacity: number = 0) {
    this.capacity = Math.max(0, capacity);
  }

  /**
   * Send a value. Awaits if buffer is full.
   */
  async send(value: T): Promise<void> {
    if (this.closed) throw new Error('Send on closed channel');
    if (this.receivers.length > 0) {
      // Direct handoff
      const recv = this.receivers.shift()!;
      recv(value);
      return;
    }
    if (this.buffer.length < this.capacity) {
      this.buffer.push(value);
      return;
    }
    // Block sender
    return new Promise<void>((resolve) => {
      this.senders.push({ value, resolve });
    });
  }

  /**
   * Try to send without blocking. Returns true if delivered.
   */
  trySend(value: T): boolean {
    if (this.closed) return false;
    if (this.receivers.length > 0) {
      const recv = this.receivers.shift()!;
      recv(value);
      return true;
    }
    if (this.buffer.length < this.capacity) {
      this.buffer.push(value);
      return true;
    }
    return false;
  }

  /**
   * Receive a value. Awaits if empty.
   */
  async recv(): Promise<T> {
    if (this.closed && this.buffer.length === 0) {
      throw new Error('Receive on closed empty channel');
    }
    if (this.buffer.length > 0) {
      const v = this.buffer.shift()!;
      this.drainSenders();
      return v;
    }
    if (this.senders.length > 0) {
      const s = this.senders.shift()!;
      s.resolve();
      this.drainSenders();
      return s.value;
    }
    // Block receiver
    return new Promise<T>((resolve) => {
      this.receivers.push(resolve);
    });
  }

  /**
   * Try to receive without blocking.
   */
  tryRecv(): T | null {
    if (this.buffer.length > 0) {
      const v = this.buffer.shift()!;
      this.drainSenders();
      return v;
    }
    return null;
  }

  private drainSenders(): void {
    while (this.buffer.length < this.capacity && this.senders.length > 0) {
      const s = this.senders.shift()!;
      this.buffer.push(s.value);
      s.resolve();
    }
  }

  /**
   * Close the channel.
   */
  close(): void {
    this.closed = true;
    // Reject all pending senders
    while (this.senders.length > 0) {
      // ignore the values
      this.senders.shift();
    }
  }

  /**
   * Buffer size.
   */
  get length(): number {
    return this.buffer.length;
  }

  /**
   * Number of waiting senders.
   */
  get senderCount(): number {
    return this.senders.length;
  }

  /**
   * Number of waiting receivers.
   */
  get receiverCount(): number {
    return this.receivers.length;
  }

  /**
   * Is closed.
   */
  get isClosed(): boolean {
    return this.closed;
  }
}
