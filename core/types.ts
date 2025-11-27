/**
 * Reactive Data Source - 核心类型定义
 * 
 * 一个轻量级的响应式 UI 库，专为 Token 数据订阅和组件更新设计
 */

/**
 * 原子数据源接口
 * 表示一个可订阅的响应式数据单元
 */
export interface AtomicDataSource<T> {
  /**
   * 获取当前值（同步，无延迟）
   */
  getValue(): T;
  
  /**
   * 订阅数据变化
   * @param callback - 数据变化时的回调函数
   * @returns 取消订阅函数
   */
  subscribe(callback: (value: T) => void): () => void;
}

/**
 * 数据源订阅策略接口
 * 定义如何订阅外部数据源（Store/WebSocket/API等）
 */
export interface SubscriptionStrategy<T> {
  /**
   * 获取当前值（同步）
   * @returns 当前数据值
   */
  getValue(): T;
  
  /**
   * 订阅数据源
   * @param onChange - 数据变化时的回调
   * @returns 取消订阅函数
   */
  subscribe(onChange: (value: T) => void): () => void;
  
  /**
   * 策略名称（用于调试）
   */
  name?: string;
}

/**
 * 实体注册表接口
 * 管理实体的单例模式
 */
export interface Registry<K, V> {
  /**
   * 获取或创建实体
   */
  getOrCreate(key: K, factory: () => V): V;
  
  /**
   * 获取已存在的实体
   */
  get(key: K): V | undefined;
  
  /**
   * 检查实体是否存在
   */
  has(key: K): boolean;
  
  /**
   * 清理实体
   */
  delete(key: K): void;
  
  /**
   * 清空所有实体
   */
  clear(): void;
}

/**
 * 图片就绪检查结果
 */
export type ImageReadyResult = 
  | 'ready'     // 图片已就绪，可以显示
  | 'checking'  // 正在检查中
  | 'timeout';  // 检查超时，放弃加载

/**
 * 图片就绪状态
 */
export interface ImageReadyState {
  /** 检查结果 */
  result: ImageReadyResult;
  
  /** 
   * 加载耗时（ms）- 从开始检查到 ready 的时间
   * - 接近 0: 图片已缓存，立即就绪
   * - 较大值: 需要实际加载
   */
  loadTime: number;
  
  /** 重试次数 */
  retryCount: number;
}

