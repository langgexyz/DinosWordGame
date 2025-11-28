/**
 * 故事书库组件
 * 显示所有已创作的故事
 */

import React from 'react';
import { StoryCard } from './StoryCard';
import { Button } from '../Button';
import { useListDataSource } from '../../hooks/useBookDataSource';
import { storiesSortedByTimeDataSource } from '../../data/storyDataSource';
import { useStoryStore } from '../../stores/storyStore';
import type { Story } from '../../types';
import { PageHeader } from '../layout/PageHeader';
import { PageContainer } from '../layout/PageContainer';

interface StoryLibraryProps {
  onBack: () => void;
  onOpenStory: (story: Story) => void;
  onContinueStory?: (story: Story) => void;
  onCreateNew: () => void;
}

export const StoryLibrary: React.FC<StoryLibraryProps> = ({ 
  onBack, 
  onOpenStory,
  onContinueStory,
  onCreateNew 
}) => {
  // 使用响应式数据源
  const allStories = useListDataSource(storiesSortedByTimeDataSource);
  const { removeStory } = useStoryStore();
  
  console.log('[StoryLibrary] allStories from data source:', allStories.length);
  
  // 过滤掉空故事（没有任何页面的故事）
  const stories = allStories.filter(story => story.pages.length > 0);
  
  console.log('[StoryLibrary] After filtering empty stories:', stories.length);
  if (stories.length > 0) {
    console.log('[StoryLibrary] Stories:', stories.map(s => ({ id: s.id, pages: s.pages.length })));
  }
  
  return (
    <PageContainer className="flex flex-col">
      {/* Header */}
      <PageHeader 
        title="📚 My Story Library"
        onBack={onBack}
        rightContent={
          <div className="text-xs md:text-sm text-slate-500 bg-white/80 px-3 py-1 rounded-full font-medium">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
          </div>
        }
      />
      
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">

        {/* 书架内容 */}
        {stories.length > 0 ? (
          <div className="relative">
            {/* 木质书架横线效果 */}
            <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-amber-700 to-amber-600 rounded-full shadow-lg opacity-20" />
            
            {/* 故事网格 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-8">
              {stories.map((story) => (
                <StoryCard 
                  key={story.id}
                  story={story}
                  onOpen={() => onOpenStory(story)}
                  onContinue={onContinueStory ? () => onContinueStory(story) : undefined}
                  onDelete={() => removeStory(story.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* 空状态 */
          <div className="text-center py-12 md:py-20">
            <div className="text-6xl md:text-8xl mb-4 opacity-20 animate-bounce">📚</div>
            <p className="text-lg md:text-xl text-slate-400 mb-6">
              Your library is empty. Let's create your first story!
            </p>
            <Button 
              onClick={onCreateNew}
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white px-6 md:px-8 py-3 md:py-4 text-lg md:text-xl rounded-2xl shadow-lg"
            >
              Start Creating ✨
            </Button>
          </div>
        )}
        </div>
      </div>
    </PageContainer>
  );
};
