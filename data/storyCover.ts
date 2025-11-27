/**
 * 故事封面生成
 */

import { StoryPage, StoryCover } from '../types';

/**
 * 找出出现最多的emoji
 */
export function getMostFrequentEmoji(pages: StoryPage[]): string {
  const emojiCount = new Map<string, number>();
  
  pages.forEach(page => {
    const emoji = page.scene.backgroundEmoji;
    emojiCount.set(emoji, (emojiCount.get(emoji) || 0) + 1);
  });
  
  let maxCount = 0;
  let mostFrequent = '📖';
  
  emojiCount.forEach((count, emoji) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = emoji;
    }
  });
  
  return mostFrequent;
}

/**
 * 生成封面数据
 */
export function generateStoryCover(pages: StoryPage[]): StoryCover {
  return {
    previewImages: pages
      .filter(p => p.illustration !== null)
      .map(p => p.illustration!)
      .slice(0, 5),  // 最多取5张图片
    
    pageCount: pages.length,
    
    themeEmoji: getMostFrequentEmoji(pages),
    
    colorTheme: pages[0]?.scene.colorTheme || '#FFA500'
  };
}

