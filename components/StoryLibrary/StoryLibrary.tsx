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
  
  // 过滤掉空故事（没有任何页面的故事）
  const stories = allStories.filter(story => story.pages.length > 0);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4 md:p-6">
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6 md:mb-8 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="text-2xl md:text-3xl hover:scale-110 transition-transform"
          >
            ←
          </button>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-2">
            📚 我的故事书架
          </h1>
          <div className="text-sm md:text-base text-slate-500 bg-white px-3 py-1 rounded-full">
            {stories.length} 个
          </div>
        </header>

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
              书架空空的，快去创作你的第一个故事吧！
            </p>
            <Button 
              onClick={onCreateNew}
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white px-6 md:px-8 py-3 md:py-4 text-lg md:text-xl rounded-2xl shadow-lg"
            >
              开始创作 ✨
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
