/**
 * List Data Source Subscription Strategy
 * 
 * 用于订阅另一个 ListDataSource 的策略（内存订阅）
 * 实现了数据源的级联订阅机制
 */

import type { SubscriptionStrategy } from './types';
import type { ListDataSource } from './ListDataSource';
import type { Filterable } from '../filters/FilterComposite';

/**
 * ListDataSource 订阅策略
 * 
 * 让一个 ListDataSource 订阅另一个 ListDataSource，实现数据源级联
 * 
 * @template T - 列表元素类型，必须实现 Filterable 接口
 * 
 * 特点：
 * - 内存订阅，轻量级
 * - 支持多级订阅（A -> B -> C）
 * - 自动传递数据变化
 * 
 * @example
 * ```typescript
 * // 1. 创建原始数据源（订阅 Zustand Store）
 * const rawSource = createListDataSource(
 *   new ZustandListDataSource(useTokenStore, state => 
 *     Object.values(state.tokens)
 *   )
 * );
 * 
 * // 2. 创建派生数据源 C（订阅 rawSource）
 * const listC = createListDataSource(
 *   new ListDataSourceSubscriptionStrategy(rawSource),
 *   withFilter(Filter.field('platform', Operators.EQ(), 'Pumpfun')),
 *   withSorter(new FieldSorter('createdAt', SortDirection.DESC))
 * );
 * 
 * // 3. 创建派生数据源 D（订阅 rawSource）
 * const listD = createListDataSource(
 *   new ListDataSourceSubscriptionStrategy(rawSource),
 *   withFilter(Filter.field('progress', Operators.GT(), 80))
 * );
 * 
 * // 数据流：Store -> rawSource -> listC
 * //                            -> listD
 * 
 * // 优势：
 * // - Store 只被订阅一次（通过 rawSource）
 * // - listC 和 listD 订阅 rawSource（内存订阅，轻量）
 * // - 各自应用不同的 filter/sorter
 * ```
 */
export class ListDataSourceSubscriptionStrategy<T extends Filterable> 
  implements SubscriptionStrategy<T[]> {
  
  /**
   * 策略名称（用于调试）
   */
  name = 'ListDataSourceSubscriptionStrategy';

  /**
   * 创建 ListDataSource 订阅策略
   * 
   * @param upstream - 上游 ListDataSource（数据来源）
   */
  constructor(private upstream: ListDataSource<T>) {}

  /**
   * 获取当前值（直接从上游获取）
   * 
   * @returns 上游数据源的当前值
   */
  getValue(): T[] {
    return this.upstream.getValue();
  }

  /**
   * 订阅上游数据变化
   * 
   * 当上游数据源更新时，会自动触发回调
   * 
   * @param callback - 数据变化回调
   * @returns 取消订阅函数
   */
  subscribe(callback: (value: T[]) => void): () => void {
    // 直接订阅上游 ListDataSource
    // 上游的任何变化都会自动传递到这里
    return this.upstream.subscribe(callback);
  }
}

