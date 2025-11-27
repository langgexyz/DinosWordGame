/**
 * Capacity - 数据容量管理
 * 
 * 用于限制数据源保留的数据量，防止内存无限增长。
 * 与 Filter、Sorter 是平行概念：
 * - Filter: 过滤数据（保留符合条件的）
 * - Sorter: 排序数据（按某字段排序）
 * - Capacity: 限制数量（保留最多 N 条）
 * 
 * ## 三种容量策略
 * 
 * 1. **NoCapacity** - 无限制（默认）
 * 2. **FixedCapacity** - 固定容量（保留最新 N 条）
 * 3. **DownstreamRequiredCapacity** - 基于下游需求的动态容量
 * 
 * @example
 * ```typescript
 * // 无限制
 * const capacity = new NoCapacity();
 * 
 * // 固定容量：最多保留 50 条
 * const capacity = new FixedCapacity(50);
 * 
 * // 动态容量：根据下游位置自动计算
 * const capacity = new DownstreamRequiredCapacity(
 *   (item) => ({ value: item.createdAt, type: 'timestamp' })
 * );
 * ```
 */

/**
 * 数据位置
 * 
 * 用于标识数据在全局流中的位置
 * 通常是时间戳、递增ID、序列号等可比较的值
 */
export interface Position {
  /**
   * 位置值（可比较大小）
   */
  readonly value: number;
  
  /**
   * 位置类型
   */
  readonly type: 'timestamp' | 'id' | 'sequence';
}

/**
 * 位置提取器
 * 从数据项中提取位置
 */
export type PositionExtractor<T> = (item: T) => Position;

/**
 * 默认位置提取器（基于 createdAt）
 */
export const defaultPositionExtractor: PositionExtractor<any> = (item) => ({
  value: item.createdAt ?? 0,
  type: 'timestamp'
});

/**
 * 下游需求协议
 * 
 * 下游数据源实现此协议，告诉上游：
 * "我当前显示的最后一项是什么"
 * 
 * 上游根据所有下游的最后一项，计算应该保留的数据范围
 */
export interface DownstreamRequirementProtocol<T> {
  /**
   * 获取当前显示的最后一项（最早的那条）
   * 
   * 例如：显示最新50条，按时间倒序，则返回第50条（最旧的）
   * 
   * @returns 最后一项，如果列表为空返回 null
   */
  getLastItem(): T | null;
}

/**
 * 容量接口
 * 
 * 定义数据源应该保留多少数据
 * 
 * @template T - 数据项类型
 */
export interface Capacity<T = unknown> {
  /**
   * 获取最大容量
   * 
   * @returns 最大保留数量，Infinity 表示无限制
   */
  getMaxCount(): number;
  
  /**
   * 判断应该保留哪些数据
   * 
   * 所有 Capacity 都必须实现此方法：
   * - FixedCapacity: 保留最新的 maxCount 条
   * - NoCapacity: 保留全部
   * - DownstreamRequiredCapacity: 根据下游位置保留
   * 
   * @param data - 原始数据
   * @returns 应该保留的数据
   */
  shouldRetain(data: T[]): T[];
  
  /**
   * 注册下游数据源
   * 
   * 当下游订阅上游时调用
   * 对于不需要管理下游的 Capacity（如 FixedCapacity），此方法为空实现
   * 对于需要管理下游的 Capacity（如 DownstreamRequiredCapacity），此方法记录下游引用
   * 
   * @param downstream - 下游数据源（实现 DownstreamRequirementProtocol）
   */
  registerDownstream<U>(downstream: DownstreamRequirementProtocol<U>): void;
  
  /**
   * 注销下游数据源
   * 
   * 当下游取消订阅时调用
   * 
   * @param downstream - 下游数据源
   */
  unregisterDownstream<U>(downstream: DownstreamRequirementProtocol<U>): void;
  
  /**
   * 容量名称（用于调试和日志）
   */
  readonly name: string;
}

/**
 * 无容量限制（默认）
 * 
 * 表示不对数据量做任何限制，保留所有数据
 * 
 * @example
 * ```typescript
 * const capacity = new NoCapacity();
 * capacity.getMaxCount(); // Infinity
 * capacity.shouldRetain(data); // 返回全部数据
 * ```
 */
export class NoCapacity implements Capacity<unknown> {
  readonly name = 'NoCapacity';
  
  getMaxCount(): number {
    return Infinity;
  }
  
  shouldRetain<T>(data: T[]): T[] {
    return data; // 保留全部
  }
  
  registerDownstream(): void {
    // 空实现：NoCapacity 不需要管理下游
  }
  
  unregisterDownstream(): void {
    // 空实现
  }
}

/**
 * 固定容量
 * 
 * 限制数据源最多保留指定数量的数据
 * 通常保留"最新的 N 条"（按 createdAt 或其他时间字段）
 * 
 * @example
 * ```typescript
 * // 最多保留 50 条
 * const capacity = new FixedCapacity(50);
 * 
 * // 带自定义名称（用于调试）
 * const capacity = new FixedCapacity(50, 'NewCreatedList');
 * ```
 */
export class FixedCapacity implements Capacity<unknown> {
  private readonly maxCount: number;
  readonly name: string;
  
  /**
   * @param maxCount - 最大保留数量（必须 > 0）
   * @param name - 容量名称（可选，用于调试）
   */
  constructor(maxCount: number, name?: string) {
    if (maxCount <= 0) {
      throw new Error(`FixedCapacity maxCount must be > 0, got: ${maxCount}`);
    }
    
    this.maxCount = maxCount;
    this.name = name || `Fixed(${maxCount})`;
  }
  
  getMaxCount(): number {
    return this.maxCount;
  }
  
  shouldRetain<T>(data: T[]): T[] {
    if (data.length <= this.maxCount) {
      return data;
    }
    
    // 简单截取前 maxCount 条（数据应已被 Sorter 排序）
    // Capacity 只负责限制数量，不负责排序
    return data.slice(0, this.maxCount);
  }
  
  registerDownstream(): void {
    // 空实现：FixedCapacity 不需要管理下游
  }
  
  unregisterDownstream(): void {
    // 空实现
  }
}

/**
 * 基于下游需求的动态容量
 * 
 * 工作原理：
 * 1. 上游创建时不需要传入任何下游引用
 * 2. 运行时，当下游订阅时自动注册
 * 3. 查询所有下游的 getLastItem()
 * 4. 计算 Min(所有 lastItem.position)
 * 5. 保留 rawData 中 >= minPosition 的数据
 * 
 * 这是一个"运行时"策略，随下游滚动动态变化
 * 
 * @example
 * ```typescript
 * // 上游使用
 * const upstreamSource = createListDataSource(
 *   strategy,
 *   withCapacity(new DownstreamRequiredCapacity(
 *     (item) => ({ value: item.createdAt, type: 'timestamp' })
 *   ))
 * );
 * 
 * // 下游订阅时自动注册
 * const downstreamSource = createListDataSource(
 *   new ListDataSourceSubscriptionStrategy(upstreamSource),
 *   withFilter(myFilter),
 *   withCapacity(50)
 * );
 * ```
 */
export class DownstreamRequiredCapacity<T> implements Capacity<T> {
  private readonly positionExtractor: PositionExtractor<T>;
  private readonly downstreams: Set<DownstreamRequirementProtocol<T>>;
  readonly name: string;
  
  /**
   * @param positionExtractor - 位置提取器（从数据项中提取位置）
   * @param name - 容量名称（可选，用于调试）
   */
  constructor(
    positionExtractor: PositionExtractor<T> = defaultPositionExtractor,
    name?: string
  ) {
    this.positionExtractor = positionExtractor;
    this.downstreams = new Set();
    this.name = name || 'DownstreamRequired';
  }
  
  getMaxCount(): number {
    return Infinity; // 动态计算，不预设数量
  }
  
  /**
   * 注册下游（实际实现）
   */
  registerDownstream<U>(downstream: DownstreamRequirementProtocol<U>): void {
    this.downstreams.add(downstream as unknown as DownstreamRequirementProtocol<T>);
    console.log(`[${this.name}] 注册下游，总数: ${this.downstreams.size}`);
  }
  
  /**
   * 注销下游（实际实现）
   */
  unregisterDownstream<U>(downstream: DownstreamRequirementProtocol<U>): void {
    this.downstreams.delete(downstream as unknown as DownstreamRequirementProtocol<T>);
    console.log(`[${this.name}] 注销下游，总数: ${this.downstreams.size}`);
  }
  
  /**
   * 计算应该保留的数据（核心方法）
   */
  shouldRetain(data: T[]): T[] {
    if (this.downstreams.size === 0) {
      // 没有下游，保留全部
      return data;
    }
    
    // 1. 查询所有下游的 lastItem
    let minPosition: number | null = null;
    
    this.downstreams.forEach(downstream => {
      const lastItem = downstream.getLastItem();
      
      if (lastItem) {
        const pos = this.positionExtractor(lastItem);
        
        if (minPosition === null || pos.value < minPosition) {
          minPosition = pos.value;
        }
      }
    });
    
    if (minPosition === null) {
      // 所有下游都没数据，保留全部
      return data;
    }
    
    // 2. 在 rawData 中保留 >= minPosition 的数据
    const minPos = minPosition; // 类型缩窄
    const retained = data.filter(item => {
      const pos = this.positionExtractor(item);
      return pos.value >= minPos!;
    });
    
    console.log(
      `[${this.name}] 最小位置: ${minPos}, ` +
      `保留: ${retained.length}/${data.length} 条`
    );
    
    return retained;
  }
}
