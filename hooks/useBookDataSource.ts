/**
 * 绘本数据源 Hook
 * 封装 ListDataSource 的使用逻辑
 */

import { useState, useEffect } from 'react';
import type { ListDataSource } from '../core/ListDataSource';
import type { Filterable } from '../core/filters/FilterComposite';

/**
 * 订阅 ListDataSource 并返回当前值
 */
export function useListDataSource<T extends Filterable>(
  dataSource: ListDataSource<T>
): T[] {
  const [value, setValue] = useState<T[]>(() => dataSource.getValue());
  
  useEffect(() => {
    // 订阅数据变化
    const unsubscribe = dataSource.subscribe((newValue) => {
      setValue(newValue);
    });
    
    // 清理订阅
    return unsubscribe;
  }, [dataSource]);
  
  return value;
}

