import React from 'react';
import { BookOpen, Library } from 'lucide-react';
import { Scene } from '../types';

interface GameHeaderProps {
  scene: Scene;
  historyLength: number;
  onReadStory: () => void;
  onOpenLibrary?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({ 
  scene, 
  historyLength, 
  onReadStory,
  onOpenLibrary
}) => {
  return (
    <div className="flex justify-between items-center mb-3 md:mb-6">
      {/* Left: My Library */}
      {onOpenLibrary && (
        <button 
          onClick={onOpenLibrary}
          className="bg-white/80 hover:bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-purple-600 shadow-sm flex items-center gap-2 transition-colors text-sm md:text-base"
        >
          <Library className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">My Library</span>
        </button>
      )}
      
      {/* 中间：当前场景 */}
      <div className="bg-white/60 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2 shadow-sm border border-white/50">
        <span className="text-lg md:text-xl">{scene?.backgroundEmoji}</span>
        <span className="font-bold text-slate-600 uppercase tracking-wider text-xs md:text-base">
          {scene?.type || 'Adventure'}
        </span>
      </div>
      
      {/* 右侧：阅读故事（进度自动保存） */}
      {historyLength > 0 && onReadStory && (
        <button 
          onClick={onReadStory} 
          className="bg-white/80 hover:bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-sky-600 shadow-sm flex items-center gap-2 transition-colors text-sm md:text-base"
        >
          <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">({historyLength})</span>
        </button>
      )}
    </div>
  );
};

