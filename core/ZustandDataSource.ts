/**
 * Reactive Data Source - Zustand 数据源实现
 */

import { SubscriptionStrategy } from './types';

/**
 * Store 接口
 * 
 * 定义响应式 Store 的标准接口（兼容 Zustand）
 * 
 * @template S - Store 状态类型
 * 
 * @example
 * ```typescript
 * const store: Store<TokenStoreState> = useTokenStore;
 * const data = store.getState();
 * const unsubscribe = store.subscribe(
 *   (state) => state.tokens['ABC123'],
 *   (newValue) => console.log('Token updated:', newValue)
 * );
 * ```
 */
export interface Store<S> {
  /**
   * 订阅 store 中的特定数据
   * @param selector - 选择器函数，从状态中提取需要的数据
   * @param listener - 数据变化监听器
   * @returns 取消订阅函数
   */
  subscribe<U>(
    selector: (state: S) => U,
    listener: (selectedState: U, previousSelectedState: U) => void
  ): () => void;
  
  /**
   * 获取当前状态
   * @returns 当前的完整状态
   */
  getState(): S;
}

/**
 * Zustand 数据源
 * 
 * 将 Zustand Store 作为数据源，订阅 Store 中的数据变化
 * 
 * @template T - 数据类型
 * @template S - Store 状态类型
 * 
 * @example
 * ```typescript
 * interface TokenStore {
 *   prices: Record<string, string>;
 * }
 * 
 * const dataSource = new ZustandDataSource<string, TokenStore>(
 *   useTokenStore,
 *   (state) => state.prices['ABC123']
 * );
 * 
 * const priceAtomicSource = createAtomicDataSource('0', dataSource, 60);
 * ```
 */
export class ZustandDataSource<T, S = unknown> implements SubscriptionStrategy<T> {
  name = 'ZustandDataSource';
  
  constructor(
    private store: Store<S>,
    private selector: (state: S) => T | undefined
  ) {}
  
  getValue(): T {
    const state = this.store.getState();
    const value = this.selector(state);
    
    if (value === undefined) {
      // 如果值为 undefined，返回默认值
      // 这里根据类型返回合适的默认值
      return undefined as T;
    }
    
    return value;
  }
  
  subscribe(onChange: (value: T) => void): () => void {
    return this.store.subscribe(
      this.selector,
      (newValue: T | undefined) => {
        if (newValue !== undefined) {
          onChange(newValue);
        }
      }
    );
  }
}

