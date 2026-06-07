/**
 * SetOps — set operations on arrays
 */

export class SetOps {
  /**
   * Union.
   */
  static union<T>(a: T[], b: T[]): T[] {
    return [...new Set([...a, ...b])];
  }

  /**
   * Intersection.
   */
  static intersection<T>(a: T[], b: T[]): T[] {
    const bSet = new Set(b);
    return [...new Set(a.filter((x) => bSet.has(x)))];
  }

  /**
   * Difference (a - b).
   */
  static difference<T>(a: T[], b: T[]): T[] {
    const bSet = new Set(b);
    return [...new Set(a.filter((x) => !bSet.has(x)))];
  }

  /**
   * Symmetric difference.
   */
  static symmetricDifference<T>(a: T[], b: T[]): T[] {
    return [...new Set([...SetOps.difference(a, b), ...SetOps.difference(b, a)])];
  }

  /**
   * Subset check.
   */
  static isSubset<T>(a: T[], b: T[]): boolean {
    const bSet = new Set(b);
    return a.every((x) => bSet.has(x));
  }

  /**
   * Superset check.
   */
  static isSuperset<T>(a: T[], b: T[]): boolean {
    return SetOps.isSubset(b, a);
  }

  /**
   * Disjoint.
   */
  static isDisjoint<T>(a: T[], b: T[]): boolean {
    const bSet = new Set(b);
    return !a.some((x) => bSet.has(x));
  }

  /**
   * Equal sets.
   */
  static equals<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;
    const aSet = new Set(a);
    return b.every((x) => aSet.has(x));
  }

  /**
   * Unique (remove duplicates).
   */
  static unique<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }

  /**
   * Cartesian product.
   */
  static cartesian<T, U>(a: T[], b: U[]): Array<[T, U]> {
    const result: Array<[T, U]> = [];
    for (const x of a) for (const y of b) result.push([x, y]);
    return result;
  }
}
