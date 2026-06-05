/**
 * AgentRegistry — central tool/agent registry with capability matching
 *
 * Inspired by: claude-code-agent-development / Claude Code Tool Registry
 * Source pattern: /home/hermes/projects/claude-code-design/docs-site/tool-registry.md
 *
 * Central registry where agents and tools are declared, looked up by name,
 * or discovered by capability tags. Supports versioning, deprecation, and
 * runtime invocation with timeout, retry, and audit logging.
 *
 * Each Tool is a typed function declaration:
 *   - name (unique)
 *   - version (semver)
 *   - description
 *   - inputSchema (JSON-Schema-lite: type + required + properties)
 *   - outputSchema
 *   - handler (async function)
 *   - tags (for capability matching)
 *   - requires (list of permissions)
 *   - timeoutMs (default 30000)
 *   - deprecated (boolean)
 *
 * AgentRegistry methods:
 *   - register / unregister / get
 *   - findByTag / findByCapability
 *   - invoke (with timeout, audit, error capture)
 *   - validate (input against inputSchema)
 */

export type JsonSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

export interface JsonSchema {
  type: JsonSchemaType;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  description?: string;
}

export interface Tool {
  id: string;
  name: string;
  version: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
  tags: string[];
  requires: string[];
  timeoutMs: number;
  deprecated: boolean;
  /** Total invocations */
  invocationCount: number;
  /** Last error message */
  lastError?: string;
  /** Last invocation timestamp */
  lastInvokedAt?: number;
  /** Average duration in ms (running) */
  avgDurationMs: number;
}

export interface InvokeOptions {
  timeoutMs?: number;
  correlationId?: string;
}

export interface InvokeResult {
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
  timedOut: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AuditEntry {
  timestamp: number;
  toolId: string;
  toolName: string;
  toolVersion: string;
  success: boolean;
  durationMs: number;
  timedOut: boolean;
  error?: string;
  correlationId?: string;
}

export class AgentRegistry {
  private tools: Map<string, Tool> = new Map();
  private byName: Map<string, string> = new Map(); // name -> id
  private auditLog: AuditEntry[] = [];
  private counter: number = 0;

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.counter}`;
  }

  /**
   * Register a tool. Throws if name+version already exists.
   */
  register(spec: Omit<Tool, 'id' | 'invocationCount' | 'avgDurationMs'>): string {
    const key = `${spec.name}@${spec.version}`;
    if (this.byName.has(key)) {
      throw new Error(`Tool "${key}" already registered`);
    }
    const id = this.nextId('tool');
    const tool: Tool = {
      ...spec,
      id,
      invocationCount: 0,
      avgDurationMs: 0,
    };
    this.tools.set(id, tool);
    this.byName.set(key, id);
    return id;
  }

  /** Unregister a tool by id. */
  unregister(id: string): boolean {
    const tool = this.tools.get(id);
    if (!tool) return false;
    this.tools.delete(id);
    this.byName.delete(`${tool.name}@${tool.version}`);
    return true;
  }

  /** Get a tool by id. */
  get(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  /** Get a tool by name (latest version if multiple). */
  getByName(name: string, version?: string): Tool | undefined {
    if (version) {
      const id = this.byName.get(`${name}@${version}`);
      return id ? this.tools.get(id) : undefined;
    }
    // Return latest version
    let best: Tool | undefined;
    for (const t of this.tools.values()) {
      if (t.name === name && (!best || this.compareVersion(t.version, best.version) > 0)) {
        best = t;
      }
    }
    return best;
  }

  /** List all tools. */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /** Find tools by tag. */
  findByTag(tag: string): Tool[] {
    return this.list().filter((t) => t.tags.includes(tag));
  }

  /** Find tools that match ALL given tags. */
  findByCapabilities(capabilities: string[]): Tool[] {
    return this.list().filter((t) => capabilities.every((c) => t.tags.includes(c)));
  }

  /** Number of registered tools. */
  size(): number {
    return this.tools.size;
  }

  /**
   * Invoke a tool by name (or id). Returns InvokeResult.
   * - Validates input against inputSchema
   * - Runs with timeout
   * - Updates invocation count, lastError, avg duration
   * - Appends audit entry
   */
  async invoke(nameOrId: string, input: Record<string, unknown>, options: InvokeOptions = {}): Promise<InvokeResult> {
    const tool = nameOrId.startsWith('tool-') ? this.tools.get(nameOrId) : this.getByName(nameOrId);
    if (!tool) {
      return { success: false, error: `tool "${nameOrId}" not found`, durationMs: 0, timedOut: false };
    }
    if (tool.deprecated) {
      return { success: false, error: `tool "${tool.name}@${tool.version}" is deprecated`, durationMs: 0, timedOut: false };
    }
    const validation = this.validate(input, tool.inputSchema);
    if (!validation.valid) {
      return { success: false, error: `validation failed: ${validation.errors.join('; ')}`, durationMs: 0, timedOut: false };
    }
    const timeoutMs = options.timeoutMs ?? tool.timeoutMs;
    const start = Date.now();
    let timedOut = false;
    tool.invocationCount += 1;
    tool.lastInvokedAt = start;

    try {
      const result = await Promise.race([
        tool.handler(input),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            timedOut = true;
            reject(new Error(`tool "${tool.name}" timed out after ${timeoutMs}ms`));
          }, timeoutMs),
        ),
      ]);
      const durationMs = Date.now() - start;
      tool.avgDurationMs = tool.invocationCount === 1
        ? durationMs
        : (tool.avgDurationMs * (tool.invocationCount - 1) + durationMs) / tool.invocationCount;
      this.auditLog.push({
        timestamp: start,
        toolId: tool.id,
        toolName: tool.name,
        toolVersion: tool.version,
        success: true,
        durationMs,
        timedOut: false,
        correlationId: options.correlationId,
      });
      return { success: true, output: result, durationMs, timedOut: false };
    } catch (err) {
      const durationMs = Date.now() - start;
      const errMsg = err instanceof Error ? err.message : String(err);
      tool.lastError = errMsg;
      this.auditLog.push({
        timestamp: start,
        toolId: tool.id,
        toolName: tool.name,
        toolVersion: tool.version,
        success: false,
        durationMs,
        timedOut,
        error: errMsg,
        correlationId: options.correlationId,
      });
      return { success: false, error: errMsg, durationMs, timedOut };
    }
  }

  /**
   * Validate input against a JSON-Schema-lite definition.
   * Supports: type check, required, basic property presence.
   */
  validate(input: Record<string, unknown>, schema: JsonSchema): ValidationResult {
    const errors: string[] = [];
    if (schema.type && !this.matchesType(input, schema.type)) {
      errors.push(`expected type ${schema.type}, got ${typeof input}`);
    }
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in input)) {
          errors.push(`missing required property "${key}"`);
        }
      }
    }
    if (schema.properties && typeof input === 'object' && input !== null) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in input) {
          const v = (input as Record<string, unknown>)[key];
          if (propSchema.type && !this.matchesType(v, propSchema.type)) {
            errors.push(`property "${key}" expected type ${propSchema.type}, got ${typeof v}`);
          }
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  private matchesType(value: unknown, expected: JsonSchemaType): boolean {
    if (expected === 'null') return value === null;
    if (expected === 'string') return typeof value === 'string';
    if (expected === 'number') return typeof value === 'number';
    if (expected === 'boolean') return typeof value === 'boolean';
    if (expected === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value);
    if (expected === 'array') return Array.isArray(value);
    return false;
  }

  /**
   * Compare two semver strings. Returns positive if a > b, negative if a < b, 0 if equal.
   */
  private compareVersion(a: string, b: string): number {
    const aParts = a.split('.').map((n) => parseInt(n, 10) || 0);
    const bParts = b.split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const av = aParts[i] ?? 0;
      const bv = bParts[i] ?? 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  /** Get audit log. */
  getAuditLog(limit?: number): AuditEntry[] {
    if (limit === undefined) return [...this.auditLog];
    return this.auditLog.slice(-limit);
  }

  /** Clear audit log. */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /** Statistics. */
  stats(): {
    totalTools: number;
    deprecatedTools: number;
    totalInvocations: number;
    successfulInvocations: number;
    failedInvocations: number;
    timedOutInvocations: number;
    auditEntries: number;
  } {
    const tools = this.list();
    const totalInvocations = tools.reduce((s, t) => s + t.invocationCount, 0);
    const successEntries = this.auditLog.filter((a) => a.success).length;
    const failureEntries = this.auditLog.filter((a) => !a.success).length;
    const timeoutEntries = this.auditLog.filter((a) => a.timedOut).length;
    return {
      totalTools: tools.length,
      deprecatedTools: tools.filter((t) => t.deprecated).length,
      totalInvocations,
      successfulInvocations: successEntries,
      failedInvocations: failureEntries,
      timedOutInvocations: timeoutEntries,
      auditEntries: this.auditLog.length,
    };
  }
}
