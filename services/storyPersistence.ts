/**
 * 故事持久化服务 - 策略模式
 * 
 * 职责分离：
 * - CreateNewStoryStrategy: 创建新故事
 * - UpdateExistingStoryStrategy: 更新现有故事
 * - StoryPersistenceService: 统一入口
 */

import { Story, StoryPage, CharacterInfo } from '../types';
import { generateStoryTitle, generateStoryCover } from './storyMetadata';

// ============================================
// 策略接口
// ============================================

export interface StoryPersistenceStrategy {
  persist(context: PersistenceContext): Promise<void>;
}

// ============================================
// 上下文数据
// ============================================

export interface PersistenceContext {
  storyId: string;
  completedPage: StoryPage;
  existingStory: Story | undefined;
  currentCharacter: CharacterInfo | null;
  
  // 回调方法
  addStory: (story: Story) => void;
  updateStory: (id: string, updates: Partial<Story>) => void;
  recordCharacter: (character: CharacterInfo, sceneType: string) => void;
  recordScene: (sceneType: string, emoji: string, characterName: string) => void;
  recordStory: (pages: number) => void;
}

// ============================================
// 具体策略：创建新故事
// ============================================

export class CreateNewStoryStrategy implements StoryPersistenceStrategy {
  async persist(context: PersistenceContext): Promise<void> {
    console.log('[CreateNewStory] Creating new story (first page)');
    
    const { storyId, completedPage, currentCharacter } = context;
    
    // 生成故事元数据
    const title = await generateStoryTitle([completedPage]);
    const cover = generateStoryCover([completedPage]);
    
    // 创建新故事
    const newStory: Story = {
      id: storyId,
      title,
      cover,
      pages: [completedPage],
      character: currentCharacter || undefined,
      mainScene: completedPage.scene.type,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    console.log('[CreateNewStory] Story created:', newStory.id);
    
    // 保存到 store
    context.addStory(newStory);
    
    // 记录统计数据
    this.recordStatistics(context);
  }
  
  private recordStatistics(context: PersistenceContext): void {
    const { completedPage, currentCharacter } = context;
    
    console.log('[CreateNewStory] Recording statistics...');
    
    if (currentCharacter) {
      console.log('[CreateNewStory] Recording character:', currentCharacter.name);
      context.recordCharacter(currentCharacter, completedPage.scene.type);
    } else {
      console.warn('[CreateNewStory] No character to record');
    }
    
    console.log('[CreateNewStory] Recording scene:', completedPage.scene.type);
    context.recordScene(
      completedPage.scene.type,
      completedPage.scene.backgroundEmoji,
      currentCharacter?.name || 'unknown'
    );
    
    context.recordStory(1);
    console.log('[CreateNewStory] Statistics recorded');
  }
}

// ============================================
// 具体策略：更新现有故事
// ============================================

export class UpdateExistingStoryStrategy implements StoryPersistenceStrategy {
  async persist(context: PersistenceContext): Promise<void> {
    console.log('[UpdateExistingStory] Updating existing story');
    
    const { existingStory, completedPage, currentCharacter } = context;
    
    if (!existingStory) {
      throw new Error('Existing story not found');
    }
    
    // 添加新页面
    const updatedPages = [...existingStory.pages, completedPage];
    
    // 生成更新的元数据
    const title = await generateStoryTitle(updatedPages);
    const cover = generateStoryCover(updatedPages);
    
    // 更新故事
    context.updateStory(existingStory.id, {
      pages: updatedPages,
      cover,
      title,
      updatedAt: Date.now()
    });
    
    console.log('[UpdateExistingStory] Story updated, total pages:', updatedPages.length);
    
    // 记录场景统计
    this.recordStatistics(context);
  }
  
  private recordStatistics(context: PersistenceContext): void {
    const { completedPage, currentCharacter } = context;
    
    console.log('[UpdateExistingStory] Recording scene statistics');
    context.recordScene(
      completedPage.scene.type,
      completedPage.scene.backgroundEmoji,
      currentCharacter?.name || 'unknown'
    );
  }
}

// ============================================
// 服务类：统一入口
// ============================================

export class StoryPersistenceService {
  private createStrategy = new CreateNewStoryStrategy();
  private updateStrategy = new UpdateExistingStoryStrategy();
  
  /**
   * 持久化故事页面（自动选择策略）
   */
  async persistPage(context: PersistenceContext): Promise<void> {
    const strategy = this.selectStrategy(context);
    await strategy.persist(context);
  }
  
  /**
   * 选择策略（无 if-else，使用多态）
   */
  private selectStrategy(context: PersistenceContext): StoryPersistenceStrategy {
    // 使用 ?? 运算符和三元表达式（简洁的条件选择）
    return context.existingStory ? this.updateStrategy : this.createStrategy;
  }
}

// ============================================
// 工厂函数
// ============================================

export const createStoryPersistenceService = () => {
  return new StoryPersistenceService();
};

