/**
 * Reactive Data Source - 通用注册表实现
 */

import { Registry } from './types';

/**
 * 创建注册表
 * 
 * 注册表用于管理实体的单例模式，确保：
 * 1. 同一个 key 只有一个实例
 * 2. 所有使用方共享同一个实例
 * 3. 自动管理实例的生命周期
 * 
 * @example
 * ```typescript
 * const tokenRegistry = createRegistry<string, TokenEntity>();
 * 
 * // 获取或创建
 * const token = tokenRegistry.getOrCreate('ABC123', () => 
 *   createTokenEntity('ABC123', data)
 * );
 * 
 * // 稍后在其他地方获取同一个实例
 * const sameToken = tokenRegistry.get('ABC123');
 * console.log(token === sameToken); // true
 * ```
 */
export function createRegistry<K, V>(): Registry<K, V> {
  const map = new Map<K, V>();
  
  return {
    getOrCreate(key: K, factory: () => V): V {
      if (map.has(key)) {
        return map.get(key)!;
      }
      
      const instance = factory();
      map.set(key, instance);
      return instance;
    },
    
    get(key: K): V | undefined {
      return map.get(key);
    },
    
    has(key: K): boolean {
      return map.has(key);
    },
    
    delete(key: K): void {
      map.delete(key);
    },
    
    clear(): void {
      map.clear();
    }
  };
}

