/**
 * 故事库 Store
 * 使用 Zustand 管理故事集合
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Story } from '../types';

interface StoryStoreState {
  stories: Story[];
  addStory: (story: Story) => void;
  updateStory: (id: string, updates: Partial<Story>) => void;
  removeStory: (id: string) => void;
  getStory: (id: string) => Story | undefined;
}

export const useStoryStore = create<StoryStoreState>()(
  persist(
    (set, get) => ({
      stories: [],
      
      addStory: (story) => set((state) => ({
        stories: [...state.stories, story]
      })),
      
      updateStory: (id, updates) => set((state) => ({
        stories: state.stories.map(story =>
          story.id === id 
            ? { ...story, ...updates, updatedAt: Date.now() }
            : story
        )
      })),
      
      removeStory: (id) => set((state) => ({
        stories: state.stories.filter(story => story.id !== id)
      })),
      
      getStory: (id) => {
        return get().stories.find(story => story.id === id);
      }
    }),
    {
      name: 'dino-story-storage',
      // 自定义存储策略：过滤掉图片数据，只保存文本
      partialize: (state) => ({
        stories: state.stories.map(story => ({
          ...story,
          pages: story.pages.map(page => ({
            ...page,
            illustration: undefined // 不保存图片到 localStorage
          })),
          cover: {
            ...story.cover,
            previewImages: [] // 不保存封面图片
          }
        }))
      }),
    }
  )
);

