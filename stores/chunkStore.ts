import { create } from 'zustand';
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import { indexedDBStorage } from './indexedDBStorage';
import type { ChunkUsage, ProficiencyLevel, ChunkStatistics } from '../types';

interface ChunkStoreState {
  // 数据
  chunks: Record<string, ChunkUsage>;
  
  // Actions
  recordChunk: (
    chunk: string,
    context: string,
    relatedChunks: string[]
  ) => void;
  
  // Queries
  getChunkProficiency: (chunk: string) => ProficiencyLevel;
  getChunksByProficiency: (level: ProficiencyLevel) => ChunkUsage[];
  getWeakChunks: (limit?: number) => ChunkUsage[];
  getRecentChunks: (limit?: number) => ChunkUsage[];
  getLearningProgress: () => ChunkStatistics;
  
  // 智能推荐
  suggestChunksForReview: () => string[];
  
  // Debug
  getChunksSummary: () => {
    total: number;
    new: number;
    learning: number;
    familiar: number;
    mastered: number;
  };
}

// 辅助函数：根据使用次数计算熟练度
function calculateProficiency(totalUsed: number): ProficiencyLevel {
  if (totalUsed <= 2) return 'new';
  if (totalUsed <= 5) return 'learning';
  if (totalUsed <= 10) return 'familiar';
  return 'mastered';
}

// 辅助函数：判断是否是短语（包含空格）
function isPhrase(chunk: string): boolean {
  return chunk.trim().includes(' ');
}

export const useChunkStore = create<ChunkStoreState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        chunks: {},
        
        recordChunk: (chunk: string, context: string, relatedChunks: string[]) => {
          const normalizedChunk = chunk.toLowerCase().trim();
          const now = Date.now();
          
          set((state) => {
            const existing = state.chunks[normalizedChunk];
            
            // 更新上下文（最多保留5个）
            const contexts = existing?.contexts || [];
            if (!contexts.includes(context)) {
              contexts.push(context);
              if (contexts.length > 5) {
                contexts.shift(); // 移除最旧的
              }
            }
            
            // 更新相关 chunks（去重）
            const relatedSet = new Set(existing?.relatedChunks || []);
            relatedChunks.forEach(rc => {
              const normalized = rc.toLowerCase().trim();
              if (normalized !== normalizedChunk) {
                relatedSet.add(normalized);
              }
            });
            const relatedChunksArray = Array.from(relatedSet).slice(0, 10); // 最多10个
            
            // 计算新的使用次数和熟练度
            const totalUsed = (existing?.totalUsed || 0) + 1;
            const proficiencyLevel = calculateProficiency(totalUsed);
            
            return {
              chunks: {
                ...state.chunks,
                [normalizedChunk]: {
                  chunk: normalizedChunk,
                  category: isPhrase(normalizedChunk) ? 'phrase' : 'word',
                  totalUsed,
                  lastUsed: now,
                  firstUsed: existing?.firstUsed || now,
                  contexts,
                  relatedChunks: relatedChunksArray,
                  proficiencyLevel
                }
              }
            };
          });
          
          console.log('[ChunkStore] Recorded chunk:', normalizedChunk, 'total:', get().chunks[normalizedChunk]?.totalUsed);
        },
        
        getChunkProficiency: (chunk: string) => {
          const normalizedChunk = chunk.toLowerCase().trim();
          return get().chunks[normalizedChunk]?.proficiencyLevel || 'new';
        },
        
        getChunksByProficiency: (level: ProficiencyLevel) => {
          return Object.values(get().chunks)
            .filter(c => c.proficiencyLevel === level)
            .sort((a, b) => b.totalUsed - a.totalUsed);
        },
        
        getWeakChunks: (limit = 10) => {
          // 返回使用次数少且很久没用的 chunks
          const now = Date.now();
          return Object.values(get().chunks)
            .filter(c => c.proficiencyLevel === 'new' || c.proficiencyLevel === 'learning')
            .sort((a, b) => {
              // 优先级：使用次数少 + 时间久
              const scoreA = a.totalUsed + (now - a.lastUsed) / (24 * 60 * 60 * 1000);
              const scoreB = b.totalUsed + (now - b.lastUsed) / (24 * 60 * 60 * 1000);
              return scoreA - scoreB;
            })
            .slice(0, limit);
        },
        
        getRecentChunks: (limit = 10) => {
          return Object.values(get().chunks)
            .sort((a, b) => b.lastUsed - a.lastUsed)
            .slice(0, limit);
        },
        
        getLearningProgress: () => {
          const chunks = Object.values(get().chunks);
          
          return {
            totalChunks: chunks.length,
            newChunks: chunks.filter(c => c.proficiencyLevel === 'new').length,
            learningChunks: chunks.filter(c => c.proficiencyLevel === 'learning').length,
            familiarChunks: chunks.filter(c => c.proficiencyLevel === 'familiar').length,
            masteredChunks: chunks.filter(c => c.proficiencyLevel === 'mastered').length
          };
        },
        
        suggestChunksForReview: () => {
          const now = Date.now();
          const DAY_MS = 24 * 60 * 60 * 1000;
          
          const chunks = Object.values(get().chunks);
          
          // 筛选需要复习的 chunks
          const needReview = chunks.filter(chunk => {
            const daysSinceLastUse = (now - chunk.lastUsed) / DAY_MS;
            
            // 根据熟练度决定复习间隔
            if (chunk.proficiencyLevel === 'new') {
              return daysSinceLastUse > 1;  // 新的：1天后复习
            } else if (chunk.proficiencyLevel === 'learning') {
              return daysSinceLastUse > 3;  // 学习中：3天后复习
            } else if (chunk.proficiencyLevel === 'familiar') {
              return daysSinceLastUse > 7;  // 熟悉：7天后复习
            } else {
              return daysSinceLastUse > 14; // 掌握：14天后复习
            }
          });
          
          // 按优先级排序（越久没用越优先）
          return needReview
            .sort((a, b) => a.lastUsed - b.lastUsed)
            .slice(0, 5)
            .map(c => c.chunk);
        },
        
        getChunksSummary: () => {
          const progress = get().getLearningProgress();
          return {
            total: progress.totalChunks,
            new: progress.newChunks,
            learning: progress.learningChunks,
            familiar: progress.familiarChunks,
            mastered: progress.masteredChunks
          };
        }
      }),
      {
        name: 'dino-chunk-storage',
        storage: createJSONStorage(() => indexedDBStorage),
        onRehydrateStorage: () => {
          console.log('[ChunkStore] Starting hydration from IndexedDB...');
          return (state, error) => {
            if (error) {
              console.error('[ChunkStore] Hydration error:', error);
            } else {
              const summary = state?.getChunksSummary();
              console.log('[ChunkStore] Hydration complete:', summary);
            }
          };
        }
      }
    )
  )
);

