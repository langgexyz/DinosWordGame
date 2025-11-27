/**
 * List Data Source - 列表响应式数据源
 * 
 * 管理列表级别的响应式数据，支持：
 * - Filter 过滤
 * - Sorter 排序
 * - 自动更新（通过 SubscriptionStrategy）
 * - 组件订阅
 * - 管道机制（级联订阅）
 * - 与 AtomicDataSource 共享同一数据源策略
 * 
 * ## 管道机制（Pipe Architecture）
 * 
 * 支持通过不同的 Strategy 实现数据源级联：
 * 
 * ```typescript
 * // 1. 原始数据源（订阅 Store）
 * const rawSource = createListDataSource(
 *   new ZustandListDataSource(useTokenStore, selector)
 * );
 * 
 * // 2. 派生数据源（订阅原始数据源）
 * const listC = createListDataSource(
 *   new ListDataSourceSubscriptionStrategy(rawSource),
 *   withFilter(filterC),
 *   withSorter(sorterC)
 * );
 * 
 * const listD = createListDataSource(
 *   new ListDataSourceSubscriptionStrategy(rawSource),
 *   withFilter(filterD)
 * );
 * 
 * // 数据流：Store -> rawSource -> listC
 * //                            -> listD
 * // 优势：Store 只订阅一次，listC/listD 各自应用不同转换
 * ```
 */

import type { FilterCondition, Filterable } from './filters/FilterComposite';
import { NoFilter } from './filters/FilterComposite';
import type { Sorter } from './filters/SortOperator';
import { NoSorter } from './filters/SortOperator';
import type { SubscriptionStrategy } from './types';
import type { Capacity, DownstreamRequirementProtocol } from './Capacity';
import { NoCapacity, FixedCapacity, DownstreamRequiredCapacity } from './Capacity';

/**
 * 列表订阅回调
 */
export type ListSubscriber<T> = (items: T[]) => void;

/**
 * 列表数据源接口（支持管道机制）
 * 
 * @template T - 列表元素类型，必须实现 Filterable 接口才能被过滤
 * 
 * 设计理念：
 * - 原始数据源：订阅底层 Store/WebSocket（只订阅一次）
 * - 转换数据源：订阅上游 ListDataSource，应用 filter/sorter
 * - 支持多个消费者订阅同一个源，各自应用不同的转换
 * - 实现 DownstreamRequirementProtocol：告诉上游当前显示的最后一项
 */
export interface ListDataSource<T extends Filterable> extends DownstreamRequirementProtocol<T> {
  /**
   * 获取当前处理后的列表（已过滤、已排序）
   */
  getValue(): T[];

  /**
   * 订阅列表变化
   * 
   * @param callback - 回调函数
   * @returns 取消订阅函数
   */
  subscribe(callback: ListSubscriber<T>): () => void;

  /**
   * 设置过滤器
   * 
   * @param filter - 过滤条件（传 NoFilter 表示不过滤）
   */
  setFilter(filter: FilterCondition): void;

  /**
   * 获取当前过滤器
   */
  getFilter(): FilterCondition;

  /**
   * 设置排序器
   * 
   * @param sorter - 排序器（传 NoSorter 表示保持原序）
   */
  setSorter(sorter: Sorter<T>): void;

  /**
   * 获取当前排序器
   */
  getSorter(): Sorter<T>;

  /**
   * 获取容量配置
   * 
   * @returns 容量实例
   */
  getCapacity(): Capacity<T>;

  /**
   * 销毁数据源（取消所有订阅）
   */
  destroy(): void;
}

/**
 * 列表数据源配置（Functional Options Pattern）
 * 
 * @template T - 列表元素类型，必须实现 Filterable 接口
 */
export interface ListDataSourceConfig<T extends Filterable> {
  filter: FilterCondition;
  sorter: Sorter<T>;
  capacity: Capacity<T>;
  enableLog: boolean;
}

  /**
 * 列表数据源 Option（Functional Options Pattern）
   * 
 * @template T - 列表元素类型
 */
export type ListDataSourceOption<T extends Filterable> = (config: ListDataSourceConfig<T>) => void;

/**
 * 设置过滤条件
 * 
 * @param filter - 过滤条件（默认 NoFilter）
 * @returns Option 函数
 */
export function withFilter<T extends Filterable>(filter: FilterCondition): ListDataSourceOption<T> {
  return (config) => {
    config.filter = filter;
  };
}

  /**
 * 设置排序器
 * 
 * @param sorter - 排序器（默认 NoSorter）
 * @returns Option 函数
 */
export function withSorter<T extends Filterable>(sorter: Sorter<T>): ListDataSourceOption<T> {
  return (config) => {
    config.sorter = sorter;
  };
}

  /**
 * 启用日志
 * 
 * @param enabled - 是否启用日志（默认 true）
 * @returns Option 函数
 */
export function withEnableLog<T extends Filterable>(enabled: boolean = true): ListDataSourceOption<T> {
  return (config) => {
    config.enableLog = enabled;
  };
}

/**
 * 设置容量限制
 * 
 * @param capacity - Capacity 实例或数字（自动转换为 FixedCapacity）
 * @returns Option 函数
 * 
 * @example
 * ```typescript
 * // 方式1：传入数字（最常用）
 * createListDataSource(
 *   strategy,
 *   withCapacity(50) // 最多保留 50 条
 * );
 * 
 * // 方式2：传入 Capacity 实例
 * createListDataSource(
 *   strategy,
 *   withCapacity(new FixedCapacity(50, 'MyList'))
 * );
 * 
 * // 方式3：无限制
 * createListDataSource(
 *   strategy,
 *   withCapacity(new NoCapacity())
 * );
 * ```
 */
export function withCapacity<T extends Filterable>(
  capacity: Capacity<T> | number
): ListDataSourceOption<T> {
  return (config) => {
    if (typeof capacity === 'number') {
      config.capacity = new FixedCapacity(capacity) as Capacity<T>;
    } else {
      config.capacity = capacity;
    }
  };
}

/**
 * 创建列表数据源（采用 Functional Options Pattern）
 * 
 * @template T - 列表元素类型，必须实现 Filterable 接口
 * @param strategy - 数据源订阅策略（必需参数）
 * @param options - 可变参数列表，每个参数都是一个配置函数
 * @returns ListDataSource 实例
 * 
 * @example
 * ```typescript
 * import { ZustandListDataSource } from './ZustandListDataSource';
 * import { ListDataSourceSubscriptionStrategy } from './ListDataSourceSubscriptionStrategy';
 * 
 * // ========== 用法 1: 直接订阅 Store ==========
 * const listSource = createListDataSource(
 *   new ZustandListDataSource(
 *     useTokenStore,
 *     state => Object.values(state.tokens)
 *   ),
 *   withFilter(Filter.field('progress', Operators.GT(), 30)),
 *   withSorter(new FieldSorter('createdAt', SortDirection.DESC))
 * );
 * 
 * // ========== 用法 2: 管道机制（推荐）==========
 * // 步骤 1: 创建原始数据源（只订阅 Store 一次）
 * const rawSource = createListDataSource(
 *   new ZustandListDataSource(useTokenStore, state => Object.values(state.tokens))
 * );
 * 
 * // 步骤 2: 创建派生数据源（订阅 rawSource，各自应用不同转换）
 * const listC = createListDataSource(
 *   new ListDataSourceSubscriptionStrategy(rawSource),
 *   withFilter(Filter.field('platform', Operators.EQ(), 'Pumpfun')),
 *   withSorter(new FieldSorter('createdAt', SortDirection.DESC))
 * );
 * 
 * const listD = createListDataSource(
 *   new ListDataSourceSubscriptionStrategy(rawSource),
 *   withFilter(Filter.field('progress', Operators.GT(), 80))
 * );
 * 
 * // 数据流：Store -> rawSource -> listC
 * //                            -> listD
 * // 优势：Store 只订阅一次，listC/listD 共享数据源
 * 
 * // ========== 基本操作 ==========
 * // 订阅列表变化
 * const unsubscribe = listSource.subscribe((tokens) => {
 *   console.log('Filtered tokens:', tokens);
 * });
 * 
 * // 获取当前列表
 * const tokens = listSource.getValue();
 * 
 * // 动态更新过滤器
 * listSource.setFilter(newFilter);
 * 
 * // 销毁
 * listSource.destroy();
 * ```
 */
export function createListDataSource<T extends Filterable>(
  strategy: SubscriptionStrategy<T[]>,
  ...options: ListDataSourceOption<T>[]
): ListDataSource<T> {
  // 默认配置（使用 Null Object Pattern）
  const config: ListDataSourceConfig<T> = {
    filter: new NoFilter(),
    sorter: new NoSorter<T>(),
    capacity: new NoCapacity() as Capacity<T>,
    enableLog: false,
  };

  // 应用所有 options
  options.forEach(option => option(config));

  const { filter, sorter, capacity, enableLog } = config;

  // 运行时检查：DownstreamRequiredCapacity 的约束
  if (capacity instanceof DownstreamRequiredCapacity) {
    if (!(filter instanceof NoFilter)) {
      throw new Error(
        '[ListDataSource] DownstreamRequiredCapacity 不能与 Filter 同时使用。\n' +
        '原因：使用 DownstreamRequiredCapacity 的数据源是上游角色（Raw Source），\n' +
        '其职责是为下游提供数据，不应包含业务逻辑（Filter/Sorter）。\n' +
        '请在下游数据源中使用 Filter。'
      );
    }
    
    if (!(sorter instanceof NoSorter)) {
      throw new Error(
        '[ListDataSource] DownstreamRequiredCapacity 不能与 Sorter 同时使用。\n' +
        '原因：使用 DownstreamRequiredCapacity 的数据源是上游角色（Raw Source），\n' +
        '其职责是为下游提供数据，不应包含业务逻辑（Filter/Sorter）。\n' +
        '请在下游数据源中使用 Sorter。'
      );
    }
  }

  // 当前过滤器（默认NoFilter，表示不过滤）
  let currentFilter: FilterCondition = filter;

  // 当前排序器（默认NoSorter，表示保持原序）
  let currentSorter: Sorter<T> = sorter;

  // 当前原始数据（从 strategy 获取）
  let rawData: T[] = [];

  // 当前处理后的数据（已过滤、已排序）
  // 直接返回此引用给 useSyncExternalStore，只有在数据变化时才会更新引用
  let currentData: T[] = [];

  // 订阅者列表
  const subscribers = new Set<ListSubscriber<T>>();

  /**
   * 完整的数据处理流程
   * 
   * 顺序：Filter → Sorter → Capacity
   */
  const processData = (data: T[]): T[] => {
    if (enableLog) {
      console.log(`[ListDataSource] Processing ${data.length} items`);
    }

    let result = data;

    // 1. Filter - 过滤数据
    result = result.filter(item => {
      try {
        const passed = currentFilter.evaluate(item);
        if (enableLog && !passed) {
          console.log(`[Filter] Item filtered out:`, item);
        }
        return passed;
      } catch (error) {
        if (enableLog) {
          console.error('[Filter] Evaluation error:', error, 'for item:', item);
        }
        return false;
      }
    });

    if (enableLog) {
      console.log(`[Filter] After filter: ${result.length} items`);
    }

    // 2. Sorter - 排序数据
    result = result.sort((a, b) => {
      try {
        return currentSorter.compare(a, b);
      } catch (error) {
        if (enableLog) {
          console.error('[Sorter] Comparison error:', error);
        }
        return 0;
      }
    });

    if (enableLog) {
      console.log(`[Sorter] After sort: ${result.length} items`);
    }

    // 3. Capacity - 限制数量
    result = capacity.shouldRetain(result);

    if (enableLog) {
      console.log(`[Capacity] After capacity (${capacity.name}): ${result.length} items`);
    }

    return result;
  };

  /**
   * 通知所有订阅者
   */
  const notifySubscribers = (data: T[]) => {
    rawData = data;
    
    // 应用完整的处理流程：Filter → Sorter → Capacity
    const processedData = processData(data);
    currentData = processedData;

    if (enableLog) {
      console.log(`[ListDataSource] Notifying ${subscribers.size} subscriber(s)`);
    }

    subscribers.forEach(callback => {
      try {
        callback([...processedData]);
      } catch (error) {
        console.error('[ListDataSource] Subscriber callback error:', error);
      }
    });
  };

  /**
   * 处理 strategy 的数据更新
   */
  const handleStrategyUpdate = (newData: T[]) => {
    if (enableLog) {
      console.log(`[ListDataSource] Strategy updated: ${newData.length} items`);
    }
    notifySubscribers(newData);
  };

  // 订阅 strategy
  const unsubscribeStrategy = strategy.subscribe(handleStrategyUpdate);

  // 获取初始数据并应用处理
  const initialData = strategy.getValue();
  rawData = initialData;
  currentData = processData(initialData);

  if (enableLog) {
    console.log(`[ListDataSource] Initialized:`);
    console.log(`  - Original: ${initialData.length} items`);
    console.log(`  - After processing: ${currentData.length} items`);
  }

  // 创建返回对象（先声明，用于注册）
  const listDataSource: ListDataSource<T> = {
    getValue(): T[] {
      // 直接返回当前数据的引用，不创建新数组
      // useSyncExternalStore 依赖引用比较来检测变化
      return currentData;
    },

    /**
     * 实现 DownstreamRequirementProtocol
     * 返回当前显示的最后一项（最早的那条）
     */
    getLastItem(): T | null {
      if (currentData.length === 0) {
        return null;
      }
      
      // 假设 currentData 已按时间倒序排序（最新的在前）
      // 则最后一项就是最旧的那条
      return currentData[currentData.length - 1];
    },

    subscribe(callback: ListSubscriber<T>): () => void {
      subscribers.add(callback);

      if (enableLog) {
        console.log(`[ListDataSource] Subscriber added (total: ${subscribers.size})`);
      }

      // 注册到上游的 Capacity（如果需要）
      capacity.registerDownstream(listDataSource);

      // 立即调用一次回调
      try {
        callback([...currentData]);
      } catch (error) {
        console.error('[ListDataSource] Initial callback error:', error);
      }

      // 返回取消订阅函数
      return () => {
        subscribers.delete(callback);

        // 从上游的 Capacity 注销
        capacity.unregisterDownstream(listDataSource);

        if (enableLog) {
          console.log(`[ListDataSource] Subscriber removed (total: ${subscribers.size})`);
        }
      };
    },

    setFilter(filter: FilterCondition): void {
      if (enableLog) {
        console.log('[ListDataSource] Filter updated:', filter);
      }

      currentFilter = filter;
      
      // 重新应用完整的处理流程
      const processedData = processData(rawData);
      currentData = processedData;

      // 通知订阅者
      subscribers.forEach(callback => {
        try {
          callback([...processedData]);
        } catch (error) {
          console.error('[ListDataSource] Subscriber callback error:', error);
        }
      });
    },

    getFilter(): FilterCondition {
      return currentFilter;
    },

    setSorter(sorter: Sorter<T>): void {
      if (enableLog) {
        console.log('[ListDataSource] Sorter updated:', sorter);
      }

      currentSorter = sorter;
      
      // 重新应用完整的处理流程
      const processedData = processData(rawData);
      currentData = processedData;

      // 通知订阅者
      subscribers.forEach(callback => {
        try {
          callback([...processedData]);
        } catch (error) {
          console.error('[ListDataSource] Subscriber callback error:', error);
        }
      });
    },

    getSorter(): Sorter<T> {
      return currentSorter;
    },

    getCapacity(): Capacity<T> {
      return capacity;
    },

    destroy(): void {
      if (enableLog) {
        console.log('[ListDataSource] Destroying...');
      }

      // 取消订阅 strategy
      unsubscribeStrategy();

      // 清空所有订阅者
      subscribers.clear();

      // 清空数据
      rawData = [];
      currentData = [];

      if (enableLog) {
        console.log('[ListDataSource] Destroyed');
      }
    },
  };
  
  return listDataSource;
}

