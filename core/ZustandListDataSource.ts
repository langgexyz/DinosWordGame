/**
 * Zustand List Data Source - Zustand Store 列表数据源策略
 * 
 * 专门用于订阅 Zustand Store 中的列表数据
 * 与 ZustandDataSource 共享同一套订阅机制，确保数据一致性
 */

import type { SubscriptionStrategy } from './types';
import type { Store } from './ZustandDataSource';

/**
 * Zustand 列表数据源策略
 * 
 * @template State - Store 状态类型
 * @template T - 列表元素类型
 * 
 * @example
 * ```typescript
 * // 订阅 Token Store 的所有 Token（返回数组）
 * const strategy = new ZustandListDataSource(
 *   useTokenStore,
 *   state => Object.values(state.tokens) // 返回 TokenStoreData[]
 * );
 * 
 * // 用于 ListDataSource
 * const listSource = createListDataSource({
 *   strategy,
 *   filter: Filter.field('progress', Operators.GT(), 30)
 * });
 * ```
 */
export class ZustandListDataSource<State, T> implements SubscriptionStrategy<T[]> {
  name = 'ZustandListDataSource';
  
  /**
   * 创建 Zustand 列表数据源策略
   * 
   * @param store - Zustand Store API
   * @param selector - 选择器函数（返回列表数据）
   */
  constructor(
    private store: Store<State>,
    private selector: (state: State) => T[]
  ) {}

  getValue(): T[] {
    const state = this.store.getState();
    return this.selector(state);
  }

  subscribe(callback: (value: T[]) => void): () => void {
    // 订阅 Store 变化
    // 使用 subscribeWithSelector 提供的 selector 订阅功能
    // 默认使用 Object.is 进行浅比较，selector 每次返回新数组引用会触发更新
    return this.store.subscribe(
      this.selector,
      (newValue) => callback(newValue)
    );
  }
}

