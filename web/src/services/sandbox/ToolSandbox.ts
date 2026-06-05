/**
 * ToolSandbox — permission-controlled tool execution
 *
 * Inspired by: claude-code-design / Claude Code Tool Permissions
 * Source: /home/hermes/projects/claude-code-design/docs-site/permissions.md
 *
 * Wraps a tool handler in a permission/approval/sandbox envelope.
 * Supports:
 *   - Permission policies (allow/deny/ask rules)
 *   - Approval flow (interactive confirm)
 *   - Input sanitization (block dangerous patterns)
 *   - Resource limits (max output size, timeout, memory)
 *   - Audit log
 *   - Destructive operation detection (rm, drop, delete, format)
 */

export type PermissionAction = 'allow' | 'deny' | 'ask';

export interface PermissionRule {
  /** Match by tool name (glob: prefix* or exact) */
  toolPattern: string;
  /** Match by action (e.g., 'read', 'write', 'delete') */
  actionPattern?: string;
  /** Decision */
  action: PermissionAction;
  /** Optional reason */
  reason?: string;
  /** Optional priority (lower = higher priority) */
  priority?: number;
}

export interface ToolSandboxOptions {
  /** Whether to enable approval flow */
  approvalEnabled: boolean;
  /** Maximum output bytes (truncate beyond) */
  maxOutputBytes: number;
  /** Default timeout in ms */
  defaultTimeoutMs: number;
  /** Whether to enable input sanitization */
  sanitizeInput: boolean;
  /** Whether to detect and block destructive operations */
  blockDestructive: boolean;
}

export interface SandboxResult<T = unknown> {
  success: boolean;
  output?: T;
  error?: string;
  action: PermissionAction;
  durationMs: number;
  truncated: boolean;
  blocked: boolean;
  reason?: string;
}

export interface ApprovalRequest {
  toolName: string;
  action: string;
  input: Record<string, unknown>;
  rule?: PermissionRule;
}

export type ApprovalResponder = (req: ApprovalRequest) => Promise<boolean>;

export interface AuditEntry {
  timestamp: number;
  toolName: string;
  action: PermissionAction;
  success: boolean;
  durationMs: number;
  blocked: boolean;
  error?: string;
}

const DESTRUCTIVE_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bdrop\s+table\b/i,
  /\bdrop\s+database\b/i,
  /\bformat\s+[a-z]:/i,
  /\bshutdown\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /delete\s+from\s+\*/i,
  /truncate\s+table\b/i,
];

const DANGEROUS_INPUT_PATTERNS = [
  /<script\b[^>]*>/i,
  /javascript:/i,
  /on\w+\s*=\s*['"]/i,
  /\.\.\//g, // path traversal
  /\$\([^)]*\)/g, // command substitution
  /`[^`]*`/g, // backtick execution
];

export class ToolSandbox {
  private rules: PermissionRule[] = [];
  private auditLog: AuditEntry[] = [];
  private approvalResponder?: ApprovalResponder;
  private options: ToolSandboxOptions;

  constructor(options: Partial<ToolSandboxOptions> = {}) {
    this.options = {
      approvalEnabled: false,
      maxOutputBytes: 1024 * 1024, // 1MB
      defaultTimeoutMs: 30000,
      sanitizeInput: true,
      blockDestructive: true,
      ...options,
    };
  }

  /** Add a permission rule. Higher priority (lower number) is matched first. */
  addRule(rule: PermissionRule): void {
    this.rules.push({ ...rule, priority: rule.priority ?? 100 });
    this.rules.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }

  /** Remove rules by tool pattern. Returns count removed. */
  removeRules(toolPattern: string): number {
    const before = this.rules.length;
    this.rules = this.rules.filter((r) => r.toolPattern !== toolPattern);
    return before - this.rules.length;
  }

  /** List all rules. */
  listRules(): PermissionRule[] {
    return [...this.rules];
  }

  /** Set the approval responder (interactive confirm). */
  setApprovalResponder(responder: ApprovalResponder): void {
    this.approvalResponder = responder;
  }

  /** Update sandbox options. */
  setOptions(options: Partial<ToolSandboxOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /** Get current options. */
  getOptions(): ToolSandboxOptions {
    return { ...this.options };
  }

  /** Match a tool + action against the rule list. */
  matchRule(toolName: string, action: string): PermissionRule | undefined {
    for (const rule of this.rules) {
      if (this.matchesPattern(toolName, rule.toolPattern)) {
        if (!rule.actionPattern || this.matchesPattern(action, rule.actionPattern)) {
          return rule;
        }
      }
    }
    return undefined;
  }

  /** Glob-style pattern match (* = any, ? = single char). */
  private matchesPattern(value: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (!pattern.includes('*') && !pattern.includes('?')) {
      return value === pattern;
    }
    const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return regex.test(value);
  }

  /**
   * Execute a tool handler within the sandbox.
   * - Checks permission rules
   * - Sanitizes input
   * - Detects destructive patterns
   * - Runs handler with timeout
   * - Truncates output
   * - Records audit
   */
  async execute<T = unknown>(
    toolName: string,
    action: string,
    input: Record<string, unknown>,
    handler: (input: Record<string, unknown>) => Promise<T>,
  ): Promise<SandboxResult<T>> {
    const start = Date.now();
    const rule = this.matchRule(toolName, action);

    // 1. Permission check
    let decision: PermissionAction = rule?.action ?? 'allow';
    let blocked = false;
    let reason: string | undefined = rule?.reason;

    if (decision === 'deny') {
      blocked = true;
      const result: SandboxResult<T> = {
        success: false, error: `denied by rule: ${rule?.reason ?? 'no reason'}`,
        action: 'deny', durationMs: Date.now() - start, truncated: false, blocked: true, reason,
      };
      this.audit(result, toolName, start);
      return result;
    }

    if (decision === 'ask') {
      if (!this.options.approvalEnabled || !this.approvalResponder) {
        // Default to deny if approval is required but no responder
        const result: SandboxResult<T> = {
          success: false, error: 'approval required but no responder',
          action: 'ask', durationMs: Date.now() - start, truncated: false, blocked: true, reason: 'no approval responder',
        };
        this.audit(result, toolName, start);
        return result;
      }
      const approved = await this.approvalResponder({ toolName, action, input, rule });
      if (!approved) {
        const result: SandboxResult<T> = {
          success: false, error: 'user denied approval',
          action: 'ask', durationMs: Date.now() - start, truncated: false, blocked: true, reason: 'denied by user',
        };
        this.audit(result, toolName, start);
        return result;
      }
    }

    // 2. Sanitize input
    let sanitizedInput = input;
    if (this.options.sanitizeInput) {
      const sanError = this.sanitize(input);
      if (sanError) {
        const result: SandboxResult<T> = {
          success: false, error: sanError, action: decision, durationMs: Date.now() - start, truncated: false, blocked: true, reason: 'input sanitization',
        };
        this.audit(result, toolName, start);
        return result;
      }
    }

    // 3. Destructive check
    if (this.options.blockDestructive) {
      const inputStr = JSON.stringify(input);
      for (const pattern of DESTRUCTIVE_PATTERNS) {
        if (pattern.test(inputStr)) {
          const result: SandboxResult<T> = {
            success: false, error: `destructive operation detected: ${pattern.source}`,
            action: decision, durationMs: Date.now() - start, truncated: false, blocked: true, reason: 'destructive',
          };
          this.audit(result, toolName, start);
          return result;
        }
      }
    }

    // 4. Execute with timeout
    let timedOut = false;
    let output: T | undefined;
    let error: string | undefined;
    try {
      output = await Promise.race([
        handler(sanitizedInput),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            timedOut = true;
            reject(new Error(`handler timed out after ${this.options.defaultTimeoutMs}ms`));
          }, this.options.defaultTimeoutMs),
        ),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    // 5. Truncate output
    let truncated = false;
    if (output !== undefined) {
      const str = typeof output === 'string' ? output : JSON.stringify(output);
      if (str && str.length > this.options.maxOutputBytes) {
        output = (str.substring(0, this.options.maxOutputBytes) + '...[truncated]') as unknown as T;
        truncated = true;
      }
    }

    const success = !error && !timedOut;
    const result: SandboxResult<T> = {
      success,
      output,
      error: timedOut ? 'handler timeout' : error,
      action: decision,
      durationMs: Date.now() - start,
      truncated,
      blocked: false,
      reason,
    };
    this.audit(result, toolName, start);
    return result;
  }

  /** Sanitize input — check for dangerous patterns. Returns error message or null. */
  private sanitize(input: Record<string, unknown>): string | null {
    const str = JSON.stringify(input);
    for (const pattern of DANGEROUS_INPUT_PATTERNS) {
      const match = str.match(pattern);
      if (match) {
        return `dangerous input pattern detected: ${pattern.source} (matched: ${match[0].substring(0, 30)})`;
      }
    }
    return null;
  }

  private audit(result: SandboxResult, toolName: string, start: number): void {
    this.auditLog.push({
      timestamp: start,
      toolName,
      action: result.action,
      success: result.success,
      durationMs: result.durationMs,
      blocked: result.blocked,
      error: result.error,
    });
    // Bound log
    if (this.auditLog.length > 1000) this.auditLog.shift();
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
    totalRules: number;
    totalExecutions: number;
    blocked: number;
    denied: number;
    approved: number;
    truncated: number;
  } {
    return {
      totalRules: this.rules.length,
      totalExecutions: this.auditLog.length,
      blocked: this.auditLog.filter((a) => a.blocked).length,
      denied: this.auditLog.filter((a) => a.action === 'deny').length,
      approved: this.auditLog.filter((a) => a.success).length,
      truncated: this.auditLog.filter((a) => a.durationMs >= 0).length - this.auditLog.filter((a) => a.success).length,
    };
  }
}

export const DEFAULT_PERMISSION_RULES: PermissionRule[] = [
  { toolPattern: 'fs:read', action: 'allow', reason: 'reading is safe', priority: 10 },
  { toolPattern: 'fs:write', action: 'ask', reason: 'writing requires approval', priority: 50 },
  { toolPattern: 'fs:delete', action: 'deny', reason: 'deletion is forbidden by default', priority: 10 },
  { toolPattern: 'net:fetch', actionPattern: 'GET', action: 'allow', reason: 'GET is safe', priority: 20 },
  { toolPattern: 'net:fetch', action: 'ask', reason: 'non-GET network ops require approval', priority: 30 },
  { toolPattern: 'shell:exec', action: 'deny', reason: 'shell exec is forbidden by default', priority: 5 },
];
