/**
 * Reactive Data Source - 定时器数据源
 * 
 * 用于需要定时更新的响应式数据（如相对时间显示）
 */

import type { SubscriptionStrategy } from './types';

/**
 * 定时器数据源
 * 
 * 以固定间隔调用计算函数，触发数据更新
 * 适用于时间相关的响应式数据
 * 
 * @example
 * ```typescript
 * const timeSource = new TimerDataSource(
 *   () => calculateTimeAgo(timestamp),
 *   1000  // 每秒更新
 * );
 * ```
 */
export class TimerDataSource<T> implements SubscriptionStrategy<T> {
  readonly name: string;
  
  private timer: ReturnType<typeof setTimeout> | null = null;
  private callbacks = new Set<(value: T) => void>();
  
  constructor(
    private computeValue: () => T,
    private getInterval: number | (() => number),  // 支持动态interval
    name?: string
  ) {
    const initialInterval = typeof getInterval === 'function' ? getInterval() : getInterval;
    this.name = name || `TimerDataSource(${initialInterval}ms)`;
  }
  
  /**
   * 获取当前值（同步计算）
   */
  getValue(): T {
    return this.computeValue();
  }
  
  /**
   * 获取当前的interval值
   */
  private currentInterval(): number {
    return typeof this.getInterval === 'function' ? this.getInterval() : this.getInterval;
  }
  
  /**
   * 订阅定时器数据源
   * 
   * 第一个订阅者时启动定时器
   * 最后一个订阅者取消时停止定时器
   */
  subscribe(callback: (value: T) => void): () => void {
    // 添加到回调列表
    this.callbacks.add(callback);
    
    // 第一个订阅者，启动定时器
    if (this.callbacks.size === 1) {
      this.startTimer();
    }
    
    // 立即计算并通知当前值
    const initialValue = this.computeValue();
    callback(initialValue);
    
    // 返回取消订阅函数
    return () => {
      this.callbacks.delete(callback);
      
      // 最后一个订阅者取消，停止定时器
      if (this.callbacks.size === 0) {
        this.stopTimer();
      }
    };
  }
  
  /**
   * 启动定时器
   */
  private startTimer(): void {
    if (this.timer) return;
    
    const interval = this.currentInterval();
    
    // 使用 setTimeout 递归调用，避免 setInterval 的回调堆积
    const tick = () => {
      if (!this.timer) return; // 已停止
      
      const value = this.computeValue();
      const nextInterval = this.currentInterval(); // 重新计算interval
      
      // 通知所有订阅者
      this.callbacks.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error('[TimerDataSource] Callback error:', error);
        }
      });
      
      // 使用最新的interval调度下一次执行
      this.timer = setTimeout(tick, nextInterval);
    };
    
    // 启动第一次执行
    this.timer = setTimeout(tick, interval);
  }
  
  /**
   * 停止定时器
   */
  private stopTimer(): void {
    if (!this.timer) return;
    
    clearTimeout(this.timer);
    this.timer = null;
  }
}
