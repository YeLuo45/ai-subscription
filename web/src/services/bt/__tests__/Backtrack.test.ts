/**
 * Backtrack.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Backtrack } from '../Backtrack';

describe('Backtrack — basic', () => {
  it('permutations 3', () => {
    const r = Backtrack.permutations([1, 2, 3]);
    expect(r.length).toBe(6);
  });

  it('permutations 1', () => {
    expect(Backtrack.permutations([1])).toEqual([[1]]);
  });

  it('subsets 3', () => {
    const r = Backtrack.subsets([1, 2, 3]);
    expect(r.length).toBe(8);
  });

  it('subsets 0', () => {
    expect(Backtrack.subsets([])).toEqual([[]]);
  });
});

describe('Backtrack — problems', () => {
  it('nQueens 4 has 2 solutions', () => {
    const r = Backtrack.nQueens(4);
    expect(r.length).toBe(2);
  });

  it('nQueens 8 has 92 solutions', () => {
    expect(Backtrack.nQueens(8).length).toBe(92);
  });

  it('sudoku solve', () => {
    const board = [
      [5, 3, 0, 0, 7, 0, 0, 0, 2],
      [6, 0, 0, 1, 9, 5, 0, 0, 8],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ];
    expect(Backtrack.sudokuSolve(board)).toBe(true);
    expect(board[0][2]).toBe(4);
  });
});

describe('Backtrack — strings', () => {
  it('parens 3', () => {
    expect(Backtrack.generateParens(3).length).toBe(5);
  });

  it('parens 1', () => {
    expect(Backtrack.generateParens(1)).toEqual(['()']);
  });

  it('wordBreak', () => {
    const r = Backtrack.wordBreak('catsanddog', new Set(['cat', 'cats', 'and', 'sand', 'dog']));
    expect(r.sort()).toEqual(['cat sand dog', 'cats and dog']);
  });
});
