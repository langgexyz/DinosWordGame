# Filter System

通用的过滤器系统，可用于过滤任何数据（Token、User、Order 等）

## 🎯 设计原则

1. **策略模式**：每个操作符是独立的类，无 if-else
2. **组合模式**：支持嵌套的 AND/OR 逻辑
3. **类型安全**：不使用 any，完全类型安全
4. **完全解耦**：不依赖具体的数据结构（使用 `Filterable` 接口），可用于任何数据

## 📖 基本用法

### 1. 简单过滤

```typescript
import { Filter, Operators } from 'reactive-data-source/filters';

// 进度 > 50
const filter = Filter.field('progress', Operators.GT<number>(), 50);

// 评估
const token = { progress: 60 };
console.log(filter.evaluate(token)); // true
```

### 2. IN 操作（平台筛选）

```typescript
// 平台 IN ['Pumpfun', 'Bonk', 'Bags']
const platformFilter = Filter.field(
  'platform',
  Operators.IN<string>(),
  ['Pumpfun', 'Bonk', 'Bags']
);

const token = { platform: 'Pumpfun' };
console.log(platformFilter.evaluate(token)); // true
```

### 3. BETWEEN 操作（范围筛选）

```typescript
// 进度 BETWEEN [30, 70]
const progressFilter = Filter.field(
  'progress',
  Operators.BETWEEN<number>(),
  [30, 70]
);

const token = { progress: 50 };
console.log(progressFilter.evaluate(token)); // true
```

### 4. AND 逻辑组合

```typescript
// 进度 > 30 AND 市值 < 1000000
const filter = Filter.and(
  Filter.field('progress', Operators.GT<number>(), 30),
  Filter.field('marketCap', Operators.LT<number>(), 1000000)
);

const token = { progress: 50, marketCap: 500000 };
console.log(filter.evaluate(token)); // true
```

### 5. OR 逻辑组合

```typescript
// 平台 = 'Pumpfun' OR 平台 = 'Bonk'
const filter = Filter.or(
  Filter.field('platform', Operators.EQ<string>(), 'Pumpfun'),
  Filter.field('platform', Operators.EQ<string>(), 'Bonk')
);
```

### 6. 复杂嵌套逻辑

```typescript
// (进度 > 50 AND 市值 < 1000000) OR (KOL持有 > 10)
const filter = Filter.or(
  Filter.and(
    Filter.field('progress', Operators.GT<number>(), 50),
    Filter.field('marketCap', Operators.LT<number>(), 1000000)
  ),
  Filter.field('kolCount', Operators.GT<number>(), 10)
);
```

### 7. 使用构建器（Fluent API）

```typescript
const filter = Filter.builder()
  .field('progress', Operators.GTE<number>(), 30)
  .field('progress', Operators.LTE<number>(), 70)
  .field('platform', Operators.IN<string>(), ['Pumpfun', 'Bonk'])
  .buildAnd();
```

## 🎨 完整示例（根据截图）

```typescript
import { Filter, Operators } from 'reactive-data-source/filters';
import type { TokenStoreData } from 'reactive-data-source';

// 创建筛选条件（根据用户截图）
function createTokenFilter() {
  return Filter.and(
    // 平台 IN ['Pumpfun', 'Bonk', 'Bags']
    Filter.field(
      'platform',
      Operators.IN<string>(),
      ['Pumpfun', 'Bonk', 'Bags']
    ),
    
    // 进度 BETWEEN [30, 70]
    Filter.field(
      'progress',
      Operators.BETWEEN<number>(),
      [30, 70]
    ),
    
    // 市值 BETWEEN [100000, 1000000]
    Filter.field(
      'marketCap',
      Operators.BETWEEN<number>(),
      [100000, 1000000]
    ),
    
    // 1H成交额 BETWEEN [50000, 500000]
    Filter.field(
      'hourlyVolumeUsdt',
      Operators.BETWEEN<number>(),
      [50000, 500000]
    ),
    
    // TOP10% BETWEEN [0.1, 0.5]
    Filter.field(
      'top10HolderRatio',
      Operators.BETWEEN<number>(),
      [0.1, 0.5]
    ),
    
    // DEV持仓% BETWEEN [0.05, 0.2]
    Filter.field(
      'devTokenAmountRate',
      Operators.BETWEEN<number>(),
      [0.05, 0.2]
    ),
    
    // 捆绑 BETWEEN [0, 0.3]
    Filter.field(
      'bundleRatio',
      Operators.BETWEEN<number>(),
      [0, 0.3]
    ),
    
    // 狙击持仓% BETWEEN [0, 0.2]
    Filter.field(
      'sniperPositionRatio',
      Operators.BETWEEN<number>(),
      [0, 0.2]
    ),
    
    // 总手续费 BETWEEN [10, 1000] SOL
    Filter.field(
      'totalBribeFee',
      Operators.BETWEEN<number>(),
      [10, 1000]
    ),
    
    // KOL持有 >= 1
    Filter.field(
      'kolCount',
      Operators.GTE<number>(),
      1
    )
  );
}

// 使用过滤器
const filter = createTokenFilter();

// 过滤 token 列表
const tokens: TokenStoreData[] = [...];
const filteredTokens = tokens.filter(token => filter.evaluate(token));
```

## 🚀 扩展新的操作符

添加新操作符非常简单，无需修改现有代码：

```typescript
// 自定义操作符：匹配正则表达式
class RegexOperator implements FilterOperator<string> {
  readonly name = 'REGEX';
  
  evaluate(fieldValue: string, filterValue: unknown): boolean {
    if (typeof filterValue !== 'string') return false;
    const regex = new RegExp(filterValue);
    return regex.test(fieldValue);
  }
}

// 使用自定义操作符
const filter = Filter.field(
  'symbol',
  new RegexOperator(),
  '^[A-Z]{3,5}$'
);
```

## 💡 优势

### 1. 无 if-else，易扩展
```typescript
// ❌ 不好：使用 if-else
function evaluate(operator: string, a: number, b: number) {
  if (operator === 'GT') return a > b;
  if (operator === 'LT') return a < b;
  // ... 每次添加操作符都要修改这个函数
}

// ✅ 好：使用策略模式
const operator = Operators.GT<number>();
operator.evaluate(a, b); // 添加新操作符只需创建新类
```

### 2. 类型安全
```typescript
// 编译时检查类型
const filter = Filter.field(
  'progress',
  Operators.GT<number>(),  // 明确类型
  50  // TypeScript 会检查类型
);
```

### 3. 可组合、可嵌套
```typescript
// 任意深度的嵌套
const complexFilter = Filter.or(
  Filter.and(
    Filter.field('a', op1, val1),
    Filter.field('b', op2, val2)
  ),
  Filter.and(
    Filter.field('c', op3, val3),
    Filter.not(
      Filter.field('d', op4, val4)
    )
  )
);
```

### 4. 解耦
```typescript
// 不依赖具体数据结构，只依赖 Filterable 接口
interface Filterable {
  [key: string]: unknown;
}

// 可以过滤任何符合接口的数据
filter.evaluate(tokenData);
filter.evaluate(userData);
filter.evaluate(anyData);
```

## 📝 注意事项

1. **字段不存在**：如果字段不存在，返回 `false`
2. **类型不匹配**：如果类型不匹配，返回 `false`
3. **空条件**：
   - `AndFilter([])` 返回 `true`
   - `OrFilter([])` 返回 `false`

## 🌟 通用性示例

这个 Filter 系统不仅可以用于 Token，还可以用于任何数据：

```typescript
// 过滤用户
interface User extends Filterable {
  age: number;
  name: string;
  vip: boolean;
}

const userFilter = Filter.and(
  Filter.field('age', Operators.GTE<number>(), 18),
  Filter.field('vip', Operators.EQ<boolean>(), true)
);

const users: User[] = [...];
const filteredUsers = users.filter(user => userFilter.evaluate(user));

// 过滤订单
interface Order extends Filterable {
  amount: number;
  status: string;
}

const orderFilter = Filter.and(
  Filter.field('amount', Operators.GT<number>(), 1000),
  Filter.field('status', Operators.IN<string>(), ['pending', 'processing'])
);

const orders: Order[] = [...];
const filteredOrders = orders.filter(order => orderFilter.evaluate(order));
```

## 🔗 与 TokenListDataSource 集成

后续将创建 `TokenListDataSource`，使用这个 Filter 系统进行响应式过滤。

