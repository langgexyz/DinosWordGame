/**
 * Filter Composite - 过滤器组合（组合模式）
 * 
 * 通用的过滤器系统，支持单个条件和条件组合（AND/OR）
 * 不依赖任何具体数据结构，可用于过滤任何实现 Filterable 接口的数据
 */

import type { FilterOperator } from './FilterOperator';

/**
 * 可过滤的数据接口（解耦具体数据结构）
 */
export interface Filterable {
  [key: string]: unknown;
}

/**
 * 过滤条件接口（抽象基类）
 */
export interface FilterCondition {
  /**
   * 评估数据是否匹配过滤条件
   * 
   * @param data - 要评估的数据
   * @returns 是否匹配
   */
  evaluate(data: Filterable): boolean;
}

/**
 * 单个字段过滤器
 */
export class FieldFilter<T> implements FilterCondition {
  constructor(
    private readonly field: string,
    private readonly operator: FilterOperator<T>,
    private readonly value: unknown
  ) {}

  evaluate(data: Filterable): boolean {
    const fieldValue = data[this.field];
    
    // 字段不存在返回 false
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }
    
    return this.operator.evaluate(fieldValue as T, this.value);
  }

  // Getter 方便调试
  getField(): string {
    return this.field;
  }

  getOperatorName(): string {
    return this.operator.name;
  }

  getValue(): unknown {
    return this.value;
  }
}

/**
 * AND 逻辑组合器
 */
export class AndFilter implements FilterCondition {
  constructor(private readonly conditions: FilterCondition[]) {}

  evaluate(data: Filterable): boolean {
    // 空条件返回 true
    if (this.conditions.length === 0) return true;
    
    // 所有条件都满足
    return this.conditions.every(condition => condition.evaluate(data));
  }

  getConditions(): FilterCondition[] {
    return [...this.conditions];
  }
}

/**
 * OR 逻辑组合器
 */
export class OrFilter implements FilterCondition {
  constructor(private readonly conditions: FilterCondition[]) {}

  evaluate(data: Filterable): boolean {
    // 空条件返回 false
    if (this.conditions.length === 0) return false;
    
    // 任一条件满足
    return this.conditions.some(condition => condition.evaluate(data));
  }

  getConditions(): FilterCondition[] {
    return [...this.conditions];
  }
}

/**
 * NOT 逻辑反转器
 */
export class NotFilter implements FilterCondition {
  constructor(private readonly condition: FilterCondition) {}

  evaluate(data: Filterable): boolean {
    return !this.condition.evaluate(data);
  }

  getCondition(): FilterCondition {
    return this.condition;
  }
}

/**
 * 过滤器构建器（Fluent API）
 */
export class FilterBuilder<T extends Filterable = Filterable> {
  private conditions: FilterCondition[] = [];

  /**
   * 添加字段过滤条件
   */
  field<K extends keyof T, V>(
    field: K,
    operator: FilterOperator<V>,
    value: unknown
  ): FilterBuilder<T> {
    this.conditions.push(new FieldFilter(field as string, operator, value));
    return this;
  }

  /**
   * 添加 OR 条件
   */
  or(...filters: FilterCondition[]): FilterBuilder<T> {
    this.conditions.push(new OrFilter(filters));
    return this;
  }

  /**
   * 添加 AND 条件
   */
  and(...filters: FilterCondition[]): FilterBuilder<T> {
    this.conditions.push(new AndFilter(filters));
    return this;
  }

  /**
   * 添加自定义条件
   */
  custom(condition: FilterCondition): FilterBuilder<T> {
    this.conditions.push(condition);
    return this;
  }

  /**
   * 构建过滤器（默认使用 AND 组合）
   */
  build(): FilterCondition {
    if (this.conditions.length === 0) {
      throw new Error('FilterBuilder: No conditions added');
    }
    if (this.conditions.length === 1) {
      return this.conditions[0];
    }
    return new AndFilter(this.conditions);
  }

  /**
   * 构建 AND 组合
   */
  buildAnd(): AndFilter {
    return new AndFilter(this.conditions);
  }

  /**
   * 构建 OR 组合
   */
  buildOr(): OrFilter {
    return new OrFilter(this.conditions);
  }

  /**
   * 清空条件
   */
  clear(): FilterBuilder<T> {
    this.conditions = [];
    return this;
  }
}

/**
 * 空过滤器（Null Object Pattern）
 * 
 * 不进行任何过滤，所有数据都通过
 * 用于避免使用 null，提供类型安全的默认值
 */
export class NoFilter implements FilterCondition {
  evaluate(_data: Filterable): boolean {
    return true; // 所有数据都通过
  }
}

/**
 * 快捷创建函数
 */
export const Filter = {
  /**
   * 创建字段过滤器
   */
  field: <T>(
    field: string,
    operator: FilterOperator<T>,
    value: unknown
  ): FieldFilter<T> => {
    return new FieldFilter(field, operator, value);
  },

  /**
   * 创建 AND 组合
   */
  and: (...conditions: FilterCondition[]): AndFilter => {
    return new AndFilter(conditions);
  },

  /**
   * 创建 OR 组合
   */
  or: (...conditions: FilterCondition[]): OrFilter => {
    return new OrFilter(conditions);
  },

  /**
   * 创建 NOT 反转
   */
  not: (condition: FilterCondition): NotFilter => {
    return new NotFilter(condition);
  },

  /**
   * 创建构建器
   */
  builder: (): FilterBuilder => {
    return new FilterBuilder();
  },
  
  /**
   * 创建空过滤器（不过滤任何数据）
   */
  none: (): NoFilter => {
    return new NoFilter();
  },
} as const;

