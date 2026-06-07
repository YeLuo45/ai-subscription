/**
 * MatrixLite — 2D matrix operations
 */

export class MatrixLite {
  private _data: number[][];
  private _rows: number;
  private _cols: number;

  constructor(data: number[][]) {
    this._data = data.map((r) => [...r]);
    this._rows = data.length;
    this._cols = data[0]?.length ?? 0;
  }

  static zeros(rows: number, cols: number): MatrixLite {
    return new MatrixLite(Array.from({ length: rows }, () => new Array(cols).fill(0)));
  }

  static identity(n: number): MatrixLite {
    const m = MatrixLite.zeros(n, n);
    for (let i = 0; i < n; i++) m._data[i][i] = 1;
    return m;
  }

  rows(): number { return this._rows; }
  cols(): number { return this._cols; }
  get(i: number, j: number): number { return this._data[i][j]; }
  set(i: number, j: number, v: number): void { this._data[i][j] = v; }
  toArray(): number[][] { return this._data.map((r) => [...r]); }

  add(other: MatrixLite): MatrixLite {
    if (this._rows !== other._rows || this._cols !== other._cols) throw new Error('Size mismatch');
    const result: number[][] = [];
    for (let i = 0; i < this._rows; i++) {
      result.push(this._data[i].map((v, j) => v + other._data[i][j]));
    }
    return new MatrixLite(result);
  }

  subtract(other: MatrixLite): MatrixLite {
    if (this._rows !== other._rows || this._cols !== other._cols) throw new Error('Size mismatch');
    const result: number[][] = [];
    for (let i = 0; i < this._rows; i++) {
      result.push(this._data[i].map((v, j) => v - other._data[i][j]));
    }
    return new MatrixLite(result);
  }

  scale(s: number): MatrixLite {
    return new MatrixLite(this._data.map((r) => r.map((v) => v * s)));
  }

  multiply(other: MatrixLite): MatrixLite {
    if (this._cols !== other._rows) throw new Error('Size mismatch');
    const result: number[][] = [];
    for (let i = 0; i < this._rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < other._cols; j++) {
        let sum = 0;
        for (let k = 0; k < this._cols; k++) {
          sum += this._data[i][k] * other._data[k][j];
        }
        row.push(sum);
      }
      result.push(row);
    }
    return new MatrixLite(result);
  }

  transpose(): MatrixLite {
    const result: number[][] = [];
    for (let j = 0; j < this._cols; j++) {
      const row: number[] = [];
      for (let i = 0; i < this._rows; i++) {
        row.push(this._data[i][j]);
      }
      result.push(row);
    }
    return new MatrixLite(result);
  }

  determinant(): number {
    if (this._rows !== this._cols) throw new Error('Square matrix required');
    const n = this._rows;
    if (n === 1) return this._data[0][0];
    if (n === 2) return this._data[0][0] * this._data[1][1] - this._data[0][1] * this._data[1][0];
    let det = 0;
    for (let j = 0; j < n; j++) {
      const sub: number[][] = [];
      for (let i = 1; i < n; i++) {
        sub.push(this._data[i].filter((_, k) => k !== j));
      }
      det += ((j % 2 === 0 ? 1 : -1) * this._data[0][j]) * new MatrixLite(sub).determinant();
    }
    return det;
  }

  trace(): number {
    if (this._rows !== this._cols) throw new Error('Square matrix required');
    let sum = 0;
    for (let i = 0; i < this._rows; i++) sum += this._data[i][i];
    return sum;
  }

  /**
   * Inverse (Gauss-Jordan, 2x2 + general via cofactor for small).
   */
  inverse(): MatrixLite {
    const n = this._rows;
    if (this._rows !== this._cols) throw new Error('Square matrix required');
    const det = this.determinant();
    if (det === 0) throw new Error('Singular matrix');
    if (n === 1) return new MatrixLite([[1 / this._data[0][0]]]);
    if (n === 2) {
      const a = this._data[0][0], b = this._data[0][1], c = this._data[1][0], d = this._data[1][1];
      return new MatrixLite([[d / det, -b / det], [-c / det, a / det]]);
    }
    // General: cofactor / transpose
    const cofactor: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        const sub: number[][] = [];
        for (let k = 0; k < n; k++) {
          if (k === i) continue;
          sub.push(this._data[k].filter((_, l) => l !== j));
        }
        row.push(((i + j) % 2 === 0 ? 1 : -1) * new MatrixLite(sub).determinant());
      }
      cofactor.push(row);
    }
    return new MatrixLite(cofactor).transpose().scale(1 / det);
  }
}
