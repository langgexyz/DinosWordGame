import { create } from 'zustand';
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import { indexedDBStorage } from './indexedDBStorage';
import type { CharacterUsage, SceneUsage, CharacterInfo } from '../types';

interface UsageStoreState {
  // 角色统计
  characters: Record<string, CharacterUsage>;
  
  // 场景统计
  scenes: Record<string, SceneUsage>;
  
  // 总计
  totalStories: number;
  totalPages: number;
  
  // Actions
  recordCharacter: (info: CharacterInfo, scene: string) => void;
  recordScene: (sceneType: string, emoji: string, character: string) => void;
  recordStory: (pages: number) => void;
  
  // Queries
  getMostUsedCharacters: (limit?: number) => CharacterUsage[];
  getMostUsedScenes: (limit?: number) => SceneUsage[];
  getCharacterScenes: (characterName: string) => string[];
  
  // Debug
  getStatsSummary: () => {
    charactersCount: number;
    scenesCount: number;
    totalStories: number;
    totalPages: number;
  };
}

export const useUsageStore = create<UsageStoreState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        characters: {},
        scenes: {},
        totalStories: 0,
        totalPages: 0,
        
        recordCharacter: (info: CharacterInfo, scene: string) => {
          const name = info.name.toLowerCase().trim();
          
          set((state) => {
            const existing = state.characters[name];
            const now = Date.now();
            
            // 计算 favoriteScenes（去重并限制前3个）
            const scenesSet = new Set(existing?.favoriteScenes || []);
            scenesSet.add(scene);
            const favoriteScenes = Array.from(scenesSet).slice(0, 3);
            
            return {
              characters: {
                ...state.characters,
                [name]: {
                  characterName: name,
                  totalStories: (existing?.totalStories || 0) + 1,
                  totalAppearances: (existing?.totalAppearances || 0) + 1,
                  lastUsed: now,
                  favoriteScenes,
                  emoji: info.emoji || existing?.emoji,
                  type: info.type || existing?.type
                }
              }
            };
          });
          
          console.log('[UsageStore] Recorded character:', name, 'in scene:', scene);
        },
        
        recordScene: (sceneType: string, emoji: string, character: string) => {
          const normalizedScene = sceneType.toLowerCase().trim();
          const normalizedCharacter = character.toLowerCase().trim();
          
          set((state) => {
            const existing = state.scenes[normalizedScene];
            const now = Date.now();
            
            // 关联角色（去重）
            const charactersSet = new Set(existing?.associatedCharacters || []);
            charactersSet.add(normalizedCharacter);
            const associatedCharacters = Array.from(charactersSet);
            
            return {
              scenes: {
                ...state.scenes,
                [normalizedScene]: {
                  sceneType: normalizedScene,
                  emoji,
                  usedCount: (existing?.usedCount || 0) + 1,
                  lastUsed: now,
                  associatedCharacters
                }
              }
            };
          });
          
          console.log('[UsageStore] Recorded scene:', normalizedScene, 'with character:', normalizedCharacter);
        },
        
        recordStory: (pages: number) => {
          set((state) => ({
            totalStories: state.totalStories + 1,
            totalPages: state.totalPages + pages
          }));
          
          console.log('[UsageStore] Recorded story with', pages, 'pages');
        },
        
        getMostUsedCharacters: (limit = 5) => {
          const chars = Object.values(get().characters);
          return chars
            .sort((a, b) => b.totalStories - a.totalStories)
            .slice(0, limit);
        },
        
        getMostUsedScenes: (limit = 5) => {
          const scenes = Object.values(get().scenes);
          return scenes
            .sort((a, b) => b.usedCount - a.usedCount)
            .slice(0, limit);
        },
        
        getCharacterScenes: (characterName: string) => {
          const normalized = characterName.toLowerCase().trim();
          return get().characters[normalized]?.favoriteScenes || [];
        },
        
        getStatsSummary: () => {
          const state = get();
          return {
            charactersCount: Object.keys(state.characters).length,
            scenesCount: Object.keys(state.scenes).length,
            totalStories: state.totalStories,
            totalPages: state.totalPages
          };
        }
      }),
      {
        name: 'dino-usage-storage',
        storage: createJSONStorage(() => indexedDBStorage),
        onRehydrateStorage: () => {
          console.log('[UsageStore] Starting hydration from IndexedDB...');
          return (state, error) => {
            if (error) {
              console.error('[UsageStore] Hydration error:', error);
            } else {
              const summary = state?.getStatsSummary();
              console.log('[UsageStore] Hydration complete:', summary);
            }
          };
        }
      }
    )
  )
);

