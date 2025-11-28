/**
 * 故事库 Store
 * 使用 Zustand + IndexedDB 管理故事集合
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDBStorage } from './indexedDBStorage';
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
      
      addStory: (story) => {
        console.log('[StoryStore] addStory called, story:', story.id, 'pages:', story.pages.length);
        set((state) => {
          const newStories = [...state.stories, story];
          console.log('[StoryStore] After add, total stories:', newStories.length);
          return { stories: newStories };
        });
      },
      
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
      // 使用 IndexedDB 存储（支持大容量，可以保存图片）
      storage: createJSONStorage(() => indexedDBStorage),
      // 不再需要 partialize，图片可以直接保存！
      onRehydrateStorage: () => {
        console.log('[StoryStore] Starting hydration from IndexedDB...');
        return (state, error) => {
          if (error) {
            console.error('[StoryStore] Hydration error:', error);
          } else {
            console.log('[StoryStore] Hydration complete, stories count:', state?.stories?.length || 0);
            if (state?.stories) {
              console.log('[StoryStore] Loaded stories:', state.stories.map(s => ({ id: s.id, pages: s.pages.length })));
            }
          }
        };
      }
    }
  )
);

