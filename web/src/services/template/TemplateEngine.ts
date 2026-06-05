/**
 * TemplateEngine — simple template renderer
 *
 * Inspired by: Mustache / Handlebars (tiny subset)
 *
 * Replaces placeholders in a template with values from a context.
 *   - {{name}} - simple variable
 *   - {{user.name}} - dot path access
 *   - {{#if condition}}...{{/if}} - conditional
 *   - {{#each items}}...{{/each}} - iteration
 *   - {{#unless x}}...{{/unless}} - inverse conditional
 *   - {{!-- comment --}} - comment
 *   - {{{html}}} - raw (no escape)
 *   - {{&value}} - alias for raw
 */

export type TemplateContext = Record<string, unknown>;

export interface RenderResult {
  output: string;
  warnings: string[];
}

export class TemplateEngine {
  private helpers: Record<string, (args: unknown[]) => string> = {};
  private warnings: string[] = [];

  /** Register a helper function. */
  registerHelper(name: string, fn: (...args: unknown[]) => string): void {
    this.helpers[name] = fn as (...args: unknown[]) => string;
  }

  /**
   * Render a template with a context.
   */
  render(template: string, context: TemplateContext = {}): string {
    this.warnings = [];
    try {
      return this.renderInternal(template, context);
    } catch (err) {
      return `<!-- template error: ${err instanceof Error ? err.message : String(err)} -->`;
    }
  }

  private renderInternal(template: string, context: TemplateContext): string {
    let result = template;
    // Comments
    result = result.replace(/\{\{!--[\s\S]*?--\}\}/g, '');
    // Raw (must come first)
    result = result.replace(/\{\{\{([\s\S]+?)\}\}\}/g, (_, expr) => this.resolvePath(context, String(expr).trim()));
    result = result.replace(/\{\{&([\s\S]+?)\}\}/g, (_, expr) => this.resolvePath(context, String(expr).trim()));
    // Sections
    result = this.renderSections(result, context);
    // Simple variables
    result = result.replace(/\{\{([^#/][\s\S]*?)\}\}/g, (_, expr) => {
      const trimmed = String(expr).trim();
      return this.resolvePath(context, trimmed);
    });
    return result;
  }

  private renderSections(template: string, context: TemplateContext): string {
    // {{#if X}}...{{/if}}
    template = this.replaceBlock(template, 'if', (args, ctx) => {
      const cond = this.resolveRaw(ctx, String(args[0] ?? '').trim());
      return cond ? this.renderInternal(args[1] as string, ctx) : '';
    }, context);
    // {{#unless X}}...{{/unless}}
    template = this.replaceBlock(template, 'unless', (args, ctx) => {
      const cond = this.resolveRaw(ctx, String(args[0] ?? '').trim());
      return cond ? '' : this.renderInternal(args[1] as string, ctx);
    }, context);
    // {{#each X}}...{{/each}}
    template = this.replaceBlock(template, 'each', (args, ctx) => {
      const arr = this.resolveRaw(ctx, String(args[0] ?? '').trim());
      if (!Array.isArray(arr)) return '';
      const body = String(args[1]);
      return arr.map((item) => {
        const itemCtx: TemplateContext = { ...ctx, '@': item, _: item };
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          Object.assign(itemCtx, item as TemplateContext);
        }
        return this.renderInternal(body, itemCtx);
      }).join('');
    }, context);
    return template;
  }

  private replaceBlock(template: string, tag: string, fn: (args: unknown[], ctx: TemplateContext) => string, ctx: TemplateContext): string {
    const openRe = new RegExp(`\\{\\{#${tag}\\s+([^}]+)\\}\\}([\\s\\S]*?)\\{\\{/${tag}\\}\\}`, 'g');
    return template.replace(openRe, (_, head, body) => {
      return fn([head, body], ctx);
    });
  }

  private resolvePath(context: TemplateContext, path: string): string {
    if (path === '' || path === undefined) return '';
    // Check for helper call: "helperName arg1 arg2"
    const parts = path.split(/\s+/);
    if (parts[0] && parts[0] in this.helpers) {
      const args = parts.slice(1).map((a) => this.resolveRaw(context, a));
      return this.helpers[parts[0]](...args);
    }
    const v = this.resolveRaw(context, path);
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  }

  private resolveRaw(context: TemplateContext, path: string): unknown {
    if (path === '' || path === undefined) return undefined;
    // `.` is alias for @ (current iteration item)
    if (path === '.') return context['@'] ?? context['_'];
    // Strip quotes
    if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
      return path.slice(1, -1);
    }
    if (/^-?\d+(\.\d+)?$/.test(path)) return parseFloat(path);
    if (path === 'true') return true;
    if (path === 'false') return false;
    // Dot path
    const segments = path.split('.');
    let current: any = context;
    for (const seg of segments) {
      if (current === null || current === undefined) return undefined;
      current = current[seg];
    }
    return current;
  }

  private pushContext(ctx: TemplateContext, entries: Array<[string, unknown]>): TemplateContext {
    const result: TemplateContext = { ...ctx };
    for (const [k, v] of entries) result[k] = v;
    return result;
  }
}
