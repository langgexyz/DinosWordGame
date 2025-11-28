/**
 * 故事元数据生成服务
 * 
 * 职责：
 * - 生成故事标题
 * - 生成故事封面
 */

import { StoryPage } from '../types';
import { generateStoryTitle as generateAITitle } from './gemini';

// ============================================
// 标题生成
// ============================================

export const generateStoryTitle = async (pages: StoryPage[]): Promise<string> => {
  try {
    return await generateAITitle(pages);
  } catch (error) {
    console.error('[StoryMetadata] Title generation failed:', error);
    // 降级策略：使用默认标题
    return generateFallbackTitle(pages);
  }
};

const generateFallbackTitle = (pages: StoryPage[]): string => {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const scene = pages[0]?.scene.type || 'adventure';
  return `${capitalize(scene)} Story ${date}`;
};

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ============================================
// 封面生成
// ============================================

export interface StoryCover {
  pageCount: number;
  images: (string | null)[];
  mainImage: string | null;
}

export const generateStoryCover = (pages: StoryPage[]): StoryCover => {
  const images = pages.map(p => p.illustration || null);
  const mainImage = images.find(img => img !== null) || null;
  
  return {
    pageCount: pages.length,
    images,
    mainImage
  };
};

