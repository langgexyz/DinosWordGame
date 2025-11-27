/**
 * Filter Operator - 过滤操作符（策略模式）
 * 
 * 每个操作符都是独立的类，不使用 if-else
 */

/**
 * 过滤操作符接口
 */
export interface FilterOperator<T> {
  /**
   * 评估值是否满足条件
   * 
   * @param fieldValue - 字段值
   * @param filterValue - 过滤器值
   * @returns 是否匹配
   */
  evaluate(fieldValue: T, filterValue: unknown): boolean;
  
  /**
   * 操作符名称（用于调试）
   */
  readonly name: string;
}

/**
 * 大于操作符（>）
 */
export class GTOperator<T extends number | string> implements FilterOperator<T> {
  readonly name = 'GT';
  
  evaluate(fieldValue: T, filterValue: unknown): boolean {
    if (typeof filterValue !== typeof fieldValue) return false;
    return fieldValue > (filterValue as T);
  }
}

/**
 * 大于等于操作符（>=）
 */
export class GTEOperator<T extends number | string> implements FilterOperator<T> {
  readonly name = 'GTE';
  
  evaluate(fieldValue: T, filterValue: unknown): boolean {
    if (typeof filterValue !== typeof fieldValue) return false;
    return fieldValue >= (filterValue as T);
  }
}

/**
 * 小于操作符（<）
 */
export class LTOperator<T extends number | string> implements FilterOperator<T> {
  readonly name = 'LT';
  
  evaluate(fieldValue: T, filterValue: unknown): boolean {
    if (typeof filterValue !== typeof fieldValue) return false;
    return fieldValue < (filterValue as T);
  }
}

/**
 * 小于等于操作符（<=）
 */
export class LTEOperator<T extends number | string> implements FilterOperator<T> {
  readonly name = 'LTE';
  
  evaluate(fieldValue: T, filterValue: unknown): boolean {
    if (typeof filterValue !== typeof fieldValue) return false;
    return fieldValue <= (filterValue as T);
  }
}

/**
 * 等于操作符（===）
 */
export class EQOperator<T> implements FilterOperator<T> {
  readonly name = 'EQ';
  
  evaluate(fieldValue: T, filterValue: unknown): boolean {
    return fieldValue === filterValue;
  }
}

/**
 * 不等于操作符（!==）
 */
export class NEOperator<T> implements FilterOperator<T> {
  readonly name = 'NE';
  
  evaluate(fieldValue: T, filterValue: unknown): boolean {
    return fieldValue !== filterValue;
  }
}

/**
 * IN 操作符（包含在数组中）
 */
export class INOperator<T> implements FilterOperator<T> {
  readonly name = 'IN';
  
  evaluate(fieldValue: T, filterValue: unknown): boolean {
    if (!Array.isArray(filterValue)) return false;
    return filterValue.includes(fieldValue);
  }
}

/**
 * NOT IN 操作符（不包含在数组中）
 */
export class NotINOperator<T> implements FilterOperator<T> {
  readonly name = 'NOT_IN';
  
  evaluate(fieldValue: T, filterValue: unknown): boolean {
    if (!Array.isArray(filterValue)) return false;
    return !filterValue.includes(fieldValue);
  }
}

/**
 * BETWEEN 操作符（在范围内）
 */
export class BetweenOperator<T extends number | string> implements FilterOperator<T> {
  readonly name = 'BETWEEN';
  
  evaluate(fieldValue: T, filterValue: unknown): boolean {
    if (!Array.isArray(filterValue) || filterValue.length !== 2) return false;
    
    const [min, max] = filterValue;
    
    if (typeof min !== typeof fieldValue || typeof max !== typeof fieldValue) {
      return false;
    }
    
    return fieldValue >= (min as T) && fieldValue <= (max as T);
  }
}

/**
 * CONTAINS 操作符（字符串包含或数组包含）
 */
export class ContainsOperator<T = unknown> implements FilterOperator<T> {
  readonly name = 'CONTAINS';
  
  evaluate(fieldValue: T, filterValue: unknown): boolean {
    // 字符串包含
    if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
      return fieldValue.includes(filterValue);
    }
    
    // 数组包含
    if (Array.isArray(fieldValue)) {
      return fieldValue.includes(filterValue);
    }
    
    return false;
  }
}

/**
 * STARTS_WITH 操作符（字符串开头匹配）
 */
export class StartsWithOperator implements FilterOperator<string> {
  readonly name = 'STARTS_WITH';
  
  evaluate(fieldValue: string, filterValue: unknown): boolean {
    if (typeof filterValue !== 'string') return false;
    return fieldValue.startsWith(filterValue);
  }
}

/**
 * ENDS_WITH 操作符（字符串结尾匹配）
 */
export class EndsWithOperator implements FilterOperator<string> {
  readonly name = 'ENDS_WITH';
  
  evaluate(fieldValue: string, filterValue: unknown): boolean {
    if (typeof filterValue !== 'string') return false;
    return fieldValue.endsWith(filterValue);
  }
}

/**
 * 操作符工厂（用于创建常用操作符实例）
 */
export const Operators = {
  GT: <T extends number | string>() => new GTOperator<T>(),
  GTE: <T extends number | string>() => new GTEOperator<T>(),
  LT: <T extends number | string>() => new LTOperator<T>(),
  LTE: <T extends number | string>() => new LTEOperator<T>(),
  EQ: <T>() => new EQOperator<T>(),
  NE: <T>() => new NEOperator<T>(),
  IN: <T>() => new INOperator<T>(),
  NOT_IN: <T>() => new NotINOperator<T>(),
  BETWEEN: <T extends number | string>() => new BetweenOperator<T>(),
  CONTAINS: () => new ContainsOperator(),
  STARTS_WITH: () => new StartsWithOperator(),
  ENDS_WITH: () => new EndsWithOperator(),
} as const;

