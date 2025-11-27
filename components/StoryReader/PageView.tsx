/**
 * 单页视图组件
 * 显示故事的一页内容（图片+文字+朗读）
 */

import React from 'react';
import { StoryPage } from '../../types';
import { SpeakerButton } from '../SpeakerButton';

interface PageViewProps {
  page: StoryPage | null;
  onPlayAudio?: () => void;
  isPlaying?: boolean;
}

export const PageView: React.FC<PageViewProps> = ({ 
  page, 
  onPlayAudio,
  isPlaying = false
}) => {
  if (!page) {
    return (
      <div className="bg-white/50 rounded-2xl flex items-center justify-center h-full">
        <span className="text-4xl opacity-20">📖</span>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-2xl shadow-2xl p-4 md:p-6 flex flex-col h-full">
      {/* 页码 */}
      <div className="absolute top-3 right-3 text-xs md:text-sm text-slate-400 font-medium">
        {page.id}
      </div>
      
      {/* 图片区域 */}
      <div className="flex-1 flex items-center justify-center overflow-hidden mb-4">
        {page.illustration ? (
          <img 
            src={page.illustration} 
            alt={page.sentence}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : (
          <div className="text-6xl md:text-8xl opacity-20">
            {page.scene.backgroundEmoji}
          </div>
        )}
      </div>
      
      {/* 文字区域 + 朗读按钮 */}
      <div className="relative pt-3 border-t border-slate-200">
        <p className="text-lg md:text-2xl font-bold text-slate-800 text-center leading-relaxed pr-10 md:pr-14">
          {page.sentence}
        </p>
        
        {/* 使用 SpeakerButton */}
        {onPlayAudio && (
          <SpeakerButton 
            onClick={(e) => {
              e.stopPropagation();
              onPlayAudio();
            }}
            isPlaying={isPlaying}
          />
        )}
      </div>
    </div>
  );
};

