/**
 * Sort Operator - 排序操作符
 * 
 * 使用策略模式实现可组合的排序系统
 * 支持单字段排序、多字段排序、自定义排序等
 */

/**
 * 排序方向枚举
 */
export enum SortDirection {
  /** 升序 (0 → 9, A → Z) */
  ASC = 'asc',
  
  /** 降序 (9 → 0, Z → A) */
  DESC = 'desc'
}

/**
 * Null 值位置枚举
 * 
 * 用于控制 null/undefined 值在排序结果中的位置
 */
export enum NullPosition {
  /** Null 值排在最前面 */
  FIRST = 'first',
  
  /** Null 值排在最后面 */
  LAST = 'last'
}

/**
 * 排序器接口
 * 
 * 所有排序器都实现此接口
 * 
 * @template T - 被排序的数据类型
 */
export interface Sorter<T> {
  /**
   * 比较两个元素
   * 
   * @param a - 第一个元素
   * @param b - 第二个元素
   * @returns 
   *   - 负数：a 应该排在 b 前面
   *   - 正数：a 应该排在 b 后面
   *   - 0：a 和 b 相等
   */
  compare(a: T, b: T): number;
}

/**
 * 字段排序器
 * 
 * 按指定字段排序
 * 
 * @template T - 对象类型
 * @template K - 字段名类型
 * 
 * @example
 * ```typescript
 * // 按进度降序排序，null 值排在最后
 * const sorter = new FieldSorter<TokenData, 'progress'>(
 *   'progress', 
 *   SortDirection.DESC,
 *   NullPosition.LAST
 * );
 * ```
 */
export class FieldSorter<T, K extends keyof T> implements Sorter<T> {
  readonly direction: SortDirection;

  constructor(
    private field: K,
    direction: SortDirection = SortDirection.ASC,
    private nullPosition: NullPosition = NullPosition.LAST
  ) {
    this.direction = direction;
  }

  compare(a: T, b: T): number {
    const aValue = a[this.field];
    const bValue = b[this.field];

    // 处理 undefined/null
    const aIsNull = aValue === undefined || aValue === null;
    const bIsNull = bValue === undefined || bValue === null;

    if (aIsNull && bIsNull) return 0;
    
    // 根据 nullPosition 决定 null 值的位置
    const nullsFirst = this.nullPosition === NullPosition.FIRST;
    if (aIsNull) return nullsFirst ? -1 : 1;
    if (bIsNull) return nullsFirst ? 1 : -1;

    // 比较值
    let result = 0;
    if (aValue < bValue) {
      result = -1;
    } else if (aValue > bValue) {
      result = 1;
    }

    // 根据方向调整结果
    return this.direction === SortDirection.ASC ? result : -result;
  }
}

/**
 * 多字段排序器（组合模式）
 * 
 * 先按第一个排序器排序，如果相等则按第二个排序器排序，以此类推
 * 
 * @example
 * ```typescript
 * // 先按进度降序，进度相同则按市值降序
 * const sorter = new MultiSorter<TokenData>([
 *   new FieldSorter('progress', SortDirection.DESC),
 *   new FieldSorter('marketCap', SortDirection.DESC)
 * ]);
 * ```
 */
export class MultiSorter<T> implements Sorter<T> {
  constructor(private sorters: Sorter<T>[]) {}

  compare(a: T, b: T): number {
    for (const sorter of this.sorters) {
      const result = sorter.compare(a, b);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  }
}

/**
 * 自定义排序器
 * 
 * 使用自定义比较函数进行排序
 * 
 * @example
 * ```typescript
 * // 按 KOL 数量和进度的乘积排序
 * const sorter = new CustomSorter<TokenData>((a, b) => {
 *   const scoreA = (a.kolCount || 0) * (a.progress || 0);
 *   const scoreB = (b.kolCount || 0) * (b.progress || 0);
 *   return scoreB - scoreA;
 * });
 * ```
 */
export class CustomSorter<T> implements Sorter<T> {
  constructor(private compareFn: (a: T, b: T) => number) {}

  compare(a: T, b: T): number {
    return this.compareFn(a, b);
  }
}

/**
 * 反向排序器
 * 
 * 反转另一个排序器的结果
 * 
 * @example
 * ```typescript
 * const ascSorter = new FieldSorter('progress', SortDirection.ASC);
 * const descSorter = new ReverseSorter(ascSorter); // 等同于 DESC
 * ```
 */
export class ReverseSorter<T> implements Sorter<T> {
  constructor(private sorter: Sorter<T>) {}

  compare(a: T, b: T): number {
    return -this.sorter.compare(a, b);
  }
}

/**
 * 空值优先排序器
 * 
 * 包装另一个排序器，使 null/undefined 值排在前面或后面
 */
export class NullSorter<T> implements Sorter<T> {
  constructor(
    private sorter: Sorter<T>,
    private nullsFirst: boolean = false
  ) {}

  compare(a: T, b: T): number {
    const aIsNull = a === null || a === undefined;
    const bIsNull = b === null || b === undefined;

    if (aIsNull && bIsNull) return 0;
    if (aIsNull) return this.nullsFirst ? -1 : 1;
    if (bIsNull) return this.nullsFirst ? 1 : -1;

    return this.sorter.compare(a, b);
  }
}

/**
 * 空排序器（Null Object Pattern）
 * 
 * 不进行任何排序，保持原有顺序
 * 用于避免使用 null，提供类型安全的默认值
 */
export class NoSorter<T> implements Sorter<T> {
  compare(_a: T, _b: T): number {
    return 0; // 保持原有顺序
  }
}

/**
 * 排序器构建器（Builder 模式）
 * 
 * 提供流畅的 API 来创建排序器
 * 
 * @example
 * ```typescript
 * // 单字段排序
 * const s1 = Sorter.field<TokenData, 'progress'>('progress', SortDirection.DESC);
 * 
 * // 多字段排序
 * const s2 = Sorter.multi<TokenData>(
 *   Sorter.field('progress', SortDirection.DESC),
 *   Sorter.field('marketCap', SortDirection.DESC)
 * );
 * 
 * // 自定义排序
 * const s3 = Sorter.custom<TokenData>((a, b) => 
 *   (b.kolCount || 0) - (a.kolCount || 0)
 * );
 * ```
 */
export class SorterBuilder {
  /**
   * 创建字段排序器
   * 
   * @param field - 字段名
   * @param direction - 排序方向（默认升序）
   */
  static field<T, K extends keyof T>(
    field: K,
    direction: SortDirection = SortDirection.ASC
  ): FieldSorter<T, K> {
    return new FieldSorter<T, K>(field, direction);
  }

  /**
   * 创建多字段排序器
   * 
   * @param sorters - 排序器数组
   */
  static multi<T>(...sorters: Sorter<T>[]): MultiSorter<T> {
    return new MultiSorter<T>(sorters);
  }

  /**
   * 创建自定义排序器
   * 
   * @param compareFn - 比较函数
   */
  static custom<T>(compareFn: (a: T, b: T) => number): CustomSorter<T> {
    return new CustomSorter<T>(compareFn);
  }

  /**
   * 创建反向排序器
   * 
   * @param sorter - 被反转的排序器
   */
  static reverse<T>(sorter: Sorter<T>): ReverseSorter<T> {
    return new ReverseSorter<T>(sorter);
  }

  /**
   * 创建空值优先排序器
   * 
   * @param sorter - 基础排序器
   * @param nullsFirst - 是否空值在前（默认 false，空值在后）
   */
  static nulls<T>(sorter: Sorter<T>, nullsFirst: boolean = false): NullSorter<T> {
    return new NullSorter<T>(sorter, nullsFirst);
  }
}

