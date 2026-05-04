/**
 * Math Evaluation Utility
 * Wrapper around mathjs for safe mathematical expression evaluation
 */

import { evaluate } from 'mathjs';

export function evalMath(expression: string): { result: number } {
  try {
    const result = evaluate(expression);
    return { result: Number(result) };
  } catch (err) {
    throw new Error(`Invalid expression: ${expression}`);
  }
}
