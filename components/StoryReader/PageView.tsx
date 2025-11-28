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
  isBuilding?: boolean;  // 是否正在编辑/构建中
}

export const PageView: React.FC<PageViewProps> = ({ 
  page, 
  onPlayAudio,
  isPlaying = false,
  isBuilding = false
}) => {
  if (!page) {
    return (
      <div className="bg-white/50 rounded-2xl flex items-center justify-center h-full">
        <span className="text-4xl opacity-20">📖</span>
      </div>
    );
  }

  return (
    <div className={`relative bg-white rounded-2xl shadow-2xl p-4 md:p-6 flex flex-col h-full transition-all ${
      isBuilding ? 'ring-4 ring-blue-400 ring-opacity-60' : ''
    }`}>
      {/* 页码 */}
      <div className="absolute top-3 right-3 text-xs md:text-sm font-medium flex items-center gap-1">
        <span className="text-slate-400">{page.id}</span>
        {isBuilding && <span className="text-blue-500 animate-pulse">✍️</span>}
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
            {isBuilding ? '✨' : page.scene.backgroundEmoji}
          </div>
        )}
      </div>
      
      {/* 文字区域 + 朗读按钮 */}
      <div className="relative pt-3 border-t border-slate-200">
        <p className="text-lg md:text-2xl font-bold text-slate-800 text-center leading-relaxed pr-10 md:pr-14">
          {page.sentence}
          {isBuilding && (
            <span className="inline-block w-0.5 h-5 md:h-7 bg-blue-500 ml-1 animate-pulse align-middle">|</span>
          )}
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

