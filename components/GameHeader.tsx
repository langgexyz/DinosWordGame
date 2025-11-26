import React from 'react';
import { BookOpen } from 'lucide-react';
import { SceneType } from '../types';

interface GameHeaderProps {
  scene: SceneType;
  historyLength: number;
  onReadStory: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({ scene, historyLength, onReadStory }) => {
  return (
    <div className="flex justify-between items-center mb-3 md:mb-6">
      <div className="bg-white/60 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2 shadow-sm border border-white/50">
        <span className="text-lg md:text-xl">{scene?.backgroundEmoji}</span>
        <span className="font-bold text-slate-600 uppercase tracking-wider text-xs md:text-base">
          {scene?.type || 'Adventure'}
        </span>
      </div>
      
      {historyLength > 0 && (
        <button 
          onClick={onReadStory} 
          className="bg-white/80 hover:bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-sky-600 shadow-sm flex items-center gap-2 transition-colors text-sm md:text-base"
        >
          <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">Read Story ({historyLength})</span>
        </button>
      )}
    </div>
  );
};

