/**
 * 故事数据源
 * 基于 Core 的响应式数据架构
 */

import { createListDataSource, withSorter } from '../core/ListDataSource';
import { ZustandListDataSource } from '../core/ZustandListDataSource';
import { ListDataSourceSubscriptionStrategy } from '../core/ListDataSourceSubscriptionStrategy';
import { CustomSorter } from '../core/filters/SortOperator';
import { useStoryStore } from '../stores/storyStore';
import type { Story } from '../types';
import type { Filterable } from '../core/filters/FilterComposite';

// 扩展 Story 实现 Filterable 接口
export interface FilterableStory extends Story, Filterable {
  // Story 已经有 id, 添加 Filterable 需要的其他属性
}

// 转换函数：Story -> FilterableStory
function toFilterableStory(story: Story): FilterableStory {
  return {
    ...story,
    // Filterable 接口需要的属性已经在 Story 中
  } as FilterableStory;
}

// 创建基础故事列表数据源
export const storyListDataSource = createListDataSource<FilterableStory>(
  new ZustandListDataSource(
    useStoryStore,
    (state) => state.stories.map(toFilterableStory)
  )
);

// 按时间倒序排序的数据源（最新的在前）
export const storiesSortedByTimeDataSource = createListDataSource(
  new ListDataSourceSubscriptionStrategy(storyListDataSource),
  withSorter(new CustomSorter<FilterableStory>((a, b) => b.createdAt - a.createdAt))
);

