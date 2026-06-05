/**
 * FederationManager — multi-device sync with TLS abstraction
 *
 * Inspired by: ruflo-design Multi-Device Federation
 * Source: /home/hermes/projects/ruflo-design/docs-site/federation.md
 *
 * Coordinates multiple device "nodes" in a federation. Each node has:
 *   - id (unique)
 *   - name (display)
 *   - publicKey (for authentication)
 *   - status: online, offline, syncing, error
 *   - lastSeen timestamp
 *   - capabilities (set of features)
 *
 * Federation operations:
 *   - addNode / removeNode
 *   - connect(nodeId): establish link (simulated)
 *   - disconnect(nodeId): tear down link
 *   - sendMessage(from, to, message): routed delivery
 *   - broadcast(from, message, filter): fan-out
 *   - sync(from, to): state sync
 *
 * TLS abstraction: a pluggable transport that handles encryption.
 * For tests, an InMemoryTransport is used.
 */

export type NodeStatus = 'online' | 'offline' | 'syncing' | 'error' | 'connecting';

export interface FederationNode {
  id: string;
  name: string;
  publicKey: string;
  status: NodeStatus;
  lastSeen: number;
  capabilities: string[];
  /** Number of messages sent */
  messagesSent: number;
  /** Number of messages received */
  messagesReceived: number;
  /** Optional metadata */
  metadata: Record<string, unknown>;
}

export interface FederationMessage {
  id: string;
  from: string;
  to: string;
  /** Encrypted payload (base64) */
  payload: string;
  /** Optional correlation ID for trace linking */
  correlationId?: string;
  timestamp: number;
  /** Optional reply-to message id */
  replyTo?: string;
}

export interface BroadcastResult {
  delivered: number;
  failed: number;
  messageId: string;
  results: Array<{ nodeId: string; success: boolean; error?: string }>;
}

export interface Transport {
  /** Encode a payload (e.g., encrypt for TLS) */
  encode(payload: string, recipientPublicKey: string): string;
  /** Decode a payload (e.g., decrypt from TLS) */
  decode(payload: string, senderPublicKey: string): string;
  /** Whether the transport is "secure" (TLS-like) */
  isSecure: boolean;
}

/** Simple base64-like transport for testing. */
export class InMemoryTransport implements Transport {
  public isSecure: boolean = false;
  encode(payload: string): string {
    return Buffer.from(payload).toString('base64');
  }
  decode(payload: string): string {
    return Buffer.from(payload, 'base64').toString('utf-8');
  }
}

/** XOR-based "encryption" for testing — NOT real crypto. */
export class SimpleCipherTransport implements Transport {
  public isSecure: boolean = true;
  private key: string;
  constructor(key: string = 'shared-secret') {
    this.key = key;
  }
  encode(payload: string): string {
    return Buffer.from(this.xor(payload)).toString('base64');
  }
  decode(payload: string): string {
    return this.xor(Buffer.from(payload, 'base64').toString('utf-8'));
  }
  private xor(input: string): string {
    let out = '';
    for (let i = 0; i < input.length; i++) {
      out += String.fromCharCode(input.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length));
    }
    return out;
  }
}

export interface FederationOptions {
  /** Maximum message size in bytes */
  maxMessageBytes: number;
  /** Whether to require TLS (secure transport) */
  requireSecure: boolean;
  /** Heartbeat interval in ms (for liveness) */
  heartbeatMs: number;
  /** Maximum time since lastSeen before marking offline */
  offlineThresholdMs: number;
}

export class FederationManager {
  private nodes: Map<string, FederationNode> = new Map();
  private messages: FederationMessage[] = [];
  private transport: Transport;
  private options: FederationOptions;
  private counter: number = 0;
  private syncLog: Array<{ from: string; to: string; timestamp: number; itemsTransferred: number }> = [];

  constructor(transport: Transport, options: Partial<FederationOptions> = {}) {
    this.transport = transport;
    this.options = {
      maxMessageBytes: 64 * 1024,
      requireSecure: false,
      heartbeatMs: 30_000,
      offlineThresholdMs: 90_000,
      ...options,
    };
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.counter}`;
  }

  /**
   * Add a node to the federation.
   */
  addNode(spec: Omit<FederationNode, 'id' | 'lastSeen' | 'messagesSent' | 'messagesReceived' | 'status'> & { id?: string }): string {
    const id = spec.id ?? this.nextId('node');
    if (this.nodes.has(id)) {
      throw new Error(`Node "${id}" already exists`);
    }
    this.nodes.set(id, {
      id,
      name: spec.name,
      publicKey: spec.publicKey,
      capabilities: spec.capabilities,
      metadata: spec.metadata,
      status: 'offline',
      lastSeen: 0,
      messagesSent: 0,
      messagesReceived: 0,
    });
    return id;
  }

  /** Remove a node. */
  removeNode(id: string): boolean {
    return this.nodes.delete(id);
  }

  /** Get a node by id. */
  getNode(id: string): FederationNode | undefined {
    return this.nodes.get(id);
  }

  /** List all nodes. */
  listNodes(): FederationNode[] {
    return Array.from(this.nodes.values()).map((n) => ({ ...n }));
  }

  /** List nodes by status. */
  listByStatus(status: NodeStatus): FederationNode[] {
    return this.listNodes().filter((n) => n.status === status);
  }

  /** Number of nodes. */
  size(): number {
    return this.nodes.size;
  }

  /**
   * Connect a node (simulate handshake). Sets status to online.
   */
  connect(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    node.status = 'online';
    node.lastSeen = Date.now();
    return true;
  }

  /** Disconnect a node. */
  disconnect(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    node.status = 'offline';
    return true;
  }

  /**
   * Send a message from one node to another.
   * Validates both nodes exist and are online. Encodes payload via transport.
   */
  sendMessage(from: string, to: string, payload: string, options: { correlationId?: string; replyTo?: string } = {}): FederationMessage {
    if (this.options.requireSecure && !this.transport.isSecure) {
      throw new Error('secure transport required but current transport is not secure');
    }
    const fromNode = this.nodes.get(from);
    const toNode = this.nodes.get(to);
    if (!fromNode) throw new Error(`sender node "${from}" not found`);
    if (!toNode) throw new Error(`recipient node "${to}" not found`);
    if (fromNode.status !== 'online') throw new Error(`sender node "${from}" is ${fromNode.status}`);
    if (toNode.status !== 'online') throw new Error(`recipient node "${to}" is ${toNode.status}`);

    if (payload.length > this.options.maxMessageBytes) {
      throw new Error(`payload exceeds maxMessageBytes (${payload.length} > ${this.options.maxMessageBytes})`);
    }

    const encoded = this.transport.encode(payload, toNode.publicKey);
    const message: FederationMessage = {
      id: this.nextId('msg'),
      from,
      to,
      payload: encoded,
      correlationId: options.correlationId,
      replyTo: options.replyTo,
      timestamp: Date.now(),
    };
    this.messages.push(message);
    fromNode.messagesSent += 1;
    toNode.messagesReceived += 1;
    return message;
  }

  /**
   * Broadcast a message to all online nodes (except the sender).
   * Returns per-node delivery results.
   */
  broadcast(from: string, payload: string, filter?: (node: FederationNode) => boolean): BroadcastResult {
    const fromNode = this.nodes.get(from);
    if (!fromNode) throw new Error(`sender node "${from}" not found`);
    const targets = this.listNodes().filter((n) => n.id !== from && n.status === 'online' && (!filter || filter(n)));
    const results: Array<{ nodeId: string; success: boolean; error?: string }> = [];
    let delivered = 0;
    let failed = 0;
    for (const target of targets) {
      try {
        this.sendMessage(from, target.id, payload);
        results.push({ nodeId: target.id, success: true });
        delivered += 1;
      } catch (err) {
        results.push({ nodeId: target.id, success: false, error: err instanceof Error ? err.message : String(err) });
        failed += 1;
      }
    }
    return {
      delivered,
      failed,
      messageId: this.nextId('bc'),
      results,
    };
  }

  /**
   * Sync state from one node to another. Simulates state transfer.
   */
  sync(from: string, to: string, items: number = 1): boolean {
    const fromNode = this.nodes.get(from);
    const toNode = this.nodes.get(to);
    if (!fromNode || !toNode) return false;
    if (fromNode.status !== 'online' || toNode.status !== 'online') return false;
    fromNode.status = 'syncing';
    toNode.status = 'syncing';
    try {
      this.syncLog.push({ from, to, timestamp: Date.now(), itemsTransferred: items });
      return true;
    } finally {
      fromNode.status = 'online';
      toNode.status = 'online';
    }
  }

  /**
   * Mark nodes as offline if their lastSeen exceeds the threshold.
   * Returns the number of nodes marked offline.
   */
  sweepOffline(): number {
    const now = Date.now();
    let count = 0;
    for (const node of this.nodes.values()) {
      if (node.status === 'online' && node.lastSeen > 0 && (now - node.lastSeen) > this.options.offlineThresholdMs) {
        node.status = 'offline';
        count += 1;
      }
    }
    return count;
  }

  /** Get message log. */
  getMessages(filter?: { from?: string; to?: string; limit?: number }): FederationMessage[] {
    let list = [...this.messages];
    if (filter?.from) list = list.filter((m) => m.from === filter.from);
    if (filter?.to) list = list.filter((m) => m.to === filter.to);
    if (filter?.limit) list = list.slice(-filter.limit);
    return list;
  }

  /** Get sync log. */
  getSyncLog(): Array<{ from: string; to: string; timestamp: number; itemsTransferred: number }> {
    return [...this.syncLog];
  }

  /** Get current transport. */
  getTransport(): Transport {
    return this.transport;
  }

  /** Get options. */
  getOptions(): FederationOptions {
    return { ...this.options };
  }

  /** Statistics. */
  stats(): {
    totalNodes: number;
    onlineNodes: number;
    offlineNodes: number;
    totalMessages: number;
    totalSyncs: number;
  } {
    return {
      totalNodes: this.nodes.size,
      onlineNodes: this.listByStatus('online').length,
      offlineNodes: this.listByStatus('offline').length,
      totalMessages: this.messages.length,
      totalSyncs: this.syncLog.length,
    };
  }
}
