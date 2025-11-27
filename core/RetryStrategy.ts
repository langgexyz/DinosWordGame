/**
 * RetryStrategy - 重试策略
 * 
 * 定义图片可用性检查的重试行为
 * 支持自定义重试逻辑，满足不同场景需求
 */

/**
 * 重试策略接口
 */
export interface RetryStrategy {
  /**
   * 计算下次重试的延迟时间
   * @param retryCount - 当前重试次数（从 1 开始）
   * @returns 延迟时间（毫秒）
   */
  getDelay(retryCount: number): number;
  
  /**
   * 是否应该继续重试
   * @param retryCount - 当前重试次数
   * @param elapsedTime - 已经过的时间（毫秒）
   * @returns true 继续重试，false 放弃
   */
  shouldRetry(retryCount: number, elapsedTime: number): boolean;
}

/**
 * 渐进式延迟策略（默认）
 * 
 * 每次重试的延迟时间呈指数增长
 * 例如：100ms → 200ms → 400ms → 800ms → 1600ms...
 * 
 * 适用场景：
 * - CDN 同步延迟（逐渐增加等待时间）
 * - 网络波动（快速重试 → 慢速重试）
 */
export class ProgressiveDelayStrategy implements RetryStrategy {
  constructor(
    private initialDelay: number = 100,      // 初始延迟
    private growthFactor: number = 2,        // 增长系数
    private maxDelay: number = 8000,         // 最大延迟
    private maxRetries: number = 20,         // 最大重试次数
    private timeout: number = 30000          // 总超时时间
  ) {}
  
  getDelay(retryCount: number): number {
    // 计算延迟：initialDelay * (growthFactor ^ (retryCount - 1))
    // 但不超过 maxDelay
    const delay = this.initialDelay * Math.pow(this.growthFactor, retryCount - 1);
    return Math.min(delay, this.maxDelay);
  }
  
  shouldRetry(retryCount: number, elapsedTime: number): boolean {
    return retryCount < this.maxRetries && elapsedTime < this.timeout;
  }
}

/**
 * 固定延迟策略
 * 
 * 每次重试的延迟时间固定不变
 * 例如：1000ms → 1000ms → 1000ms → 1000ms...
 * 
 * 适用场景：
 * - 已知资源准备时间（如图片处理需要固定时间）
 * - 简单的轮询检查
 */
export class FixedDelayStrategy implements RetryStrategy {
  constructor(
    private delay: number = 1000,            // 固定延迟
    private maxRetries: number = 10,         // 最大重试次数
    private timeout: number = 30000          // 总超时时间
  ) {}
  
  getDelay(): number {
    return this.delay;
  }
  
  shouldRetry(retryCount: number, elapsedTime: number): boolean {
    return retryCount < this.maxRetries && elapsedTime < this.timeout;
  }
}

/**
 * 线性递增策略
 * 
 * 每次重试的延迟时间线性增长
 * 例如：500ms → 1000ms → 1500ms → 2000ms...
 * 
 * 适用场景：
 * - 资源准备时间逐渐增加
 * - 渐进式负载控制
 */
export class LinearDelayStrategy implements RetryStrategy {
  constructor(
    private baseDelay: number = 500,         // 基础延迟
    private increment: number = 500,         // 每次增量
    private maxRetries: number = 15,         // 最大重试次数
    private timeout: number = 30000          // 总超时时间
  ) {}
  
  getDelay(retryCount: number): number {
    // 计算延迟：baseDelay + (retryCount - 1) * increment
    return this.baseDelay + (retryCount - 1) * this.increment;
  }
  
  shouldRetry(retryCount: number, elapsedTime: number): boolean {
    return retryCount < this.maxRetries && elapsedTime < this.timeout;
  }
}

/**
 * 默认重试策略（渐进式延迟）
 */
export const DEFAULT_RETRY_STRATEGY = new ProgressiveDelayStrategy();

