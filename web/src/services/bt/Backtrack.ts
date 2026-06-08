/**
 * Backtrack — backtracking algorithms
 */

export class Backtrack {
  /**
   * Generate all permutations of array.
   */
  static permutations<T>(arr: T[]): T[][] {
    const result: T[][] = [];
    const used = new Array(arr.length).fill(false);
    const cur: T[] = [];
    function bt() {
      if (cur.length === arr.length) {
        result.push([...cur]);
        return;
      }
      for (let i = 0; i < arr.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        cur.push(arr[i]);
        bt();
        cur.pop();
        used[i] = false;
      }
    }
    bt();
    return result;
  }

  /**
   * Generate all subsets.
   */
  static subsets<T>(arr: T[]): T[][] {
    const result: T[][] = [];
    const cur: T[] = [];
    function bt(start: number) {
      result.push([...cur]);
      for (let i = start; i < arr.length; i++) {
        cur.push(arr[i]);
        bt(i + 1);
        cur.pop();
      }
    }
    bt(0);
    return result;
  }

  /**
   * N-Queens solver. Returns solutions.
   */
  static nQueens(n: number): number[][] {
    const solutions: number[][] = [];
    const queens: number[] = new Array(n).fill(-1);
    function isSafe(row: number, col: number): boolean {
      for (let i = 0; i < row; i++) {
        if (queens[i] === col) return false;
        if (Math.abs(queens[i] - col) === Math.abs(i - row)) return false;
      }
      return true;
    }
    function bt(row: number) {
      if (row === n) {
        solutions.push([...queens]);
        return;
      }
      for (let col = 0; col < n; col++) {
        if (isSafe(row, col)) {
          queens[row] = col;
          bt(row + 1);
          queens[row] = -1;
        }
      }
    }
    bt(0);
    return solutions;
  }

  /**
   * Sudoku solver (9x9).
   * Modifies board in place. Returns true if solvable.
   */
  static sudokuSolve(board: number[][]): boolean {
    function isValid(r: number, c: number, num: number): boolean {
      for (let i = 0; i < 9; i++) {
        if (board[r][i] === num) return false;
        if (board[i][c] === num) return false;
        const br = 3 * Math.floor(r / 3) + Math.floor(i / 3);
        const bc = 3 * Math.floor(c / 3) + (i % 3);
        if (board[br][bc] === num) return false;
      }
      return true;
    }
    function bt(): boolean {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) {
            for (let num = 1; num <= 9; num++) {
              if (isValid(r, c, num)) {
                board[r][c] = num;
                if (bt()) return true;
                board[r][c] = 0;
              }
            }
            return false;
          }
        }
      }
      return true;
    }
    return bt();
  }

  /**
   * Generate all valid parentheses.
   */
  static generateParens(n: number): string[] {
    const result: string[] = [];
    function bt(cur: string, open: number, close: number) {
      if (cur.length === 2 * n) {
        result.push(cur);
        return;
      }
      if (open < n) bt(cur + '(', open + 1, close);
      if (close < open) bt(cur + ')', open, close + 1);
    }
    bt('', 0, 0);
    return result;
  }

  /**
   * Word break (all sentences).
   */
  static wordBreak(s: string, dict: Set<string>): string[] {
    const result: string[] = [];
    function bt(start: number, cur: string[]) {
      if (start === s.length) {
        result.push(cur.join(' '));
        return;
      }
      for (let end = start + 1; end <= s.length; end++) {
        const word = s.substring(start, end);
        if (dict.has(word)) {
          cur.push(word);
          bt(end, cur);
          cur.pop();
        }
      }
    }
    bt(0, []);
    return result;
  }
}
