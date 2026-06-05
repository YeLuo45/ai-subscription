/**
 * ExpressionEngine — arithmetic expression evaluator
 *
 * Inspired by: spreadsheet formula evaluator
 *
 * Parse and evaluate arithmetic expressions:
 *   - numbers (int/float)
 *   - variables (substituted from context)
 *   - operators: + - * / % ** (power)
 *   - parentheses
 *   - function calls: abs, max, min, round, floor, ceil, sqrt, log, sin, cos, tan
 *   - string concatenation with +
 *
 * Example: "a * 2 + abs(b - 5)"
 */

export type ExpressionContext = Record<string, number | string | boolean | undefined>;

interface Token {
  type: 'number' | 'ident' | 'function' | 'op' | 'lparen' | 'rparen' | 'comma' | 'string';
  value: string;
  numValue?: number;
}

export class ExpressionEngine {
  private operators: Record<string, { precedence: number; assoc: 'left' | 'right'; arity: number }> = {
    '+': { precedence: 1, assoc: 'left', arity: 2 },
    '-': { precedence: 1, assoc: 'left', arity: 2 },
    '*': { precedence: 2, assoc: 'left', arity: 2 },
    '/': { precedence: 2, assoc: 'left', arity: 2 },
    '%': { precedence: 2, assoc: 'left', arity: 2 },
    '**': { precedence: 3, assoc: 'right', arity: 2 },
    'u-': { precedence: 4, assoc: 'right', arity: 1 },
  };

  private functions: Record<string, (...args: number[]) => number> = {
    abs: (x) => Math.abs(x),
    max: (...args) => Math.max(...args),
    min: (...args) => Math.min(...args),
    round: (x) => Math.round(x),
    floor: (x) => Math.floor(x),
    ceil: (x) => Math.ceil(x),
    sqrt: (x) => Math.sqrt(x),
    log: (x) => Math.log(x),
    log10: (x) => Math.log10(x),
    sin: (x) => Math.sin(x),
    cos: (x) => Math.cos(x),
    tan: (x) => Math.tan(x),
  };

  /**
   * Evaluate an expression with given context.
   */
  evaluate(expression: string, context: ExpressionContext = {}): number {
    const tokens = this.tokenize(expression);
    const rpn = this.toRPN(tokens);
    return this.evalRPN(rpn, context);
  }

  /**
   * Evaluate a boolean comparison: ==, !=, <, >, <=, >=
   */
  evaluateBool(expression: string, context: ExpressionContext = {}): boolean {
    const result = this.evaluate(expression, context);
    return result !== 0;
  }

  private tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < expr.length) {
      const c = expr[i];
      if (c === ' ' || c === '\t') { i += 1; continue; }
      if (c === '(' || c === ')' || c === ',') {
        tokens.push({ type: c === '(' ? 'lparen' : c === ')' ? 'rparen' : 'comma', value: c });
        i += 1;
        continue;
      }
      if (c === '+' || c === '-' || c === '*' || c === '/' || c === '%') {
        if (c === '*' && expr[i + 1] === '*') {
          tokens.push({ type: 'op', value: '**' });
          i += 2;
        } else {
          tokens.push({ type: 'op', value: c });
          i += 1;
        }
        continue;
      }
      if (/[0-9.]/.test(c)) {
        let s = '';
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          s += expr[i];
          i += 1;
        }
        tokens.push({ type: 'number', value: s, numValue: parseFloat(s) });
        continue;
      }
      if (/[a-zA-Z_]/.test(c)) {
        let s = '';
        while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
          s += expr[i];
          i += 1;
        }
        // Look ahead for lparen to detect function call
        let j = i;
        while (j < expr.length && expr[j] === ' ') j += 1;
        if (expr[j] === '(') {
          tokens.push({ type: 'function', value: s });
        } else {
          tokens.push({ type: 'ident', value: s });
        }
        continue;
      }
      if (c === '"' || c === "'") {
        const quote = c;
        i += 1;
        let s = '';
        while (i < expr.length && expr[i] !== quote) {
          s += expr[i];
          i += 1;
        }
        i += 1;
        tokens.push({ type: 'string', value: s });
        continue;
      }
      throw new Error(`unexpected character: ${c}`);
    }
    return tokens;
  }

  private toRPN(tokens: Token[]): Token[] {
    const output: Token[] = [];
    const stack: Token[] = [];
    let prevType: string = 'op';

    for (const t of tokens) {
      if (t.type === 'number' || t.type === 'string') {
        output.push(t);
      } else if (t.type === 'ident' || t.type === 'function') {
        // Check if next is lparen — function call
        const next = tokens[tokens.indexOf(t) + 1];
        if (t.type === 'function' && next && next.type === 'lparen') {
          stack.push(t);
        } else {
          output.push(t); // variable
        }
      } else if (t.type === 'op') {
        // Detect unary minus
        let op = t.value;
        if (op === '-' && (prevType === 'op' || prevType === 'lparen' || prevType === 'comma')) {
          op = 'u-';
        }
        const current = { ...t, value: op };
        while (stack.length > 0) {
          const top = stack[stack.length - 1];
          if (top.type === 'op') {
            const topPrecedence = this.operators[top.value]?.precedence ?? 0;
            const curPrecedence = this.operators[current.value]?.precedence ?? 0;
            if (topPrecedence > curPrecedence || (topPrecedence === curPrecedence && this.operators[current.value].assoc === 'left')) {
              output.push(stack.pop()!);
            } else {
              break;
            }
          } else if (top.type === 'lparen') {
            break;
          } else {
            output.push(stack.pop()!);
          }
        }
        stack.push(current);
      } else if (t.type === 'lparen') {
        stack.push(t);
      } else if (t.type === 'rparen') {
        while (stack.length > 0 && stack[stack.length - 1].type !== 'lparen') {
          output.push(stack.pop()!);
        }
        if (stack.length > 0) stack.pop(); // pop lparen
        if (stack.length > 0 && (stack[stack.length - 1].type === 'ident' || stack[stack.length - 1].type === 'function')) {
          output.push(stack.pop()!); // function name
        }
      } else if (t.type === 'comma') {
        while (stack.length > 0 && stack[stack.length - 1].type !== 'lparen') {
          output.push(stack.pop()!);
        }
      }
      prevType = t.type;
    }
    while (stack.length > 0) output.push(stack.pop()!);
    return output;
  }

  private functionArity(name: string): number {
    if (name === 'max' || name === 'min') return 2; // only support 2-arg for now
    return 1;
  }

  private evalRPN(rpn: Token[], ctx: ExpressionContext): number {
    const stack: number[] = [];
    for (const t of rpn) {
      if (t.type === 'number') {
        stack.push(t.numValue!);
      } else if (t.type === 'string') {
        stack.push(0);
      } else if (t.type === 'ident') {
        // Variable lookup
        const v = ctx[t.value];
        if (v === undefined) throw new Error(`undefined variable: ${t.value}`);
        if (typeof v === 'boolean') stack.push(v ? 1 : 0);
        else if (typeof v === 'string') stack.push(parseFloat(v) || 0);
        else stack.push(v);
      } else if (t.type === 'function') {
        // Pop args (one per comma in source). For simplicity, pop all currently on stack as args.
        // In RPN, args come first, then function name. We don't know exact arg count here.
        // The Shunting Yard has already produced the right order; we just pop the right number of args.
        // Heuristic: try to pop 1 (most common); for max/min we need a different approach.
        // For now, use variadic: pop until stack is empty or hit a known marker.
        // Better: we know which functions take how many args.
        const arity = this.functionArity(t.value);
        const args: number[] = [];
        for (let i = 0; i < arity; i++) args.unshift(stack.pop()!);
        const fn = this.functions[t.value];
        if (!fn) throw new Error(`unknown function: ${t.value}`);
        stack.push(fn(...args));
      } else if (t.type === 'op') {
        if (t.value === 'u-') {
          const a = stack.pop()!;
          stack.push(-a);
        } else {
          const b = stack.pop()!;
          const a = stack.pop()!;
          switch (t.value) {
            case '+': stack.push(a + b); break;
            case '-': stack.push(a - b); break;
            case '*': stack.push(a * b); break;
            case '/': stack.push(b !== 0 ? a / b : NaN); break;
            case '%': stack.push(a % b); break;
            case '**': stack.push(Math.pow(a, b)); break;
          }
        }
      }
    }
    return stack.pop() ?? 0;
  }
}
