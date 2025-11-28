import React from 'react';
import { SpeakerButton } from '../SpeakerButton';
import { Sparkles } from 'lucide-react';

interface DinoGuideProps {
  emoji: string;
  comment: string;
  isLoading: boolean;
  isSpeaking: boolean;
  onPlayComment: () => void;
}

/**
 * Dino Guide - AI 引导组件
 * 职责：显示 AI 的评论和表情
 */
export const DinoGuide: React.FC<DinoGuideProps> = ({
  emoji,
  comment,
  isLoading,
  isSpeaking,
  onPlayComment
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-xl p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] shadow-lg flex items-center gap-3 border-2 border-white">
      <div className="relative shrink-0">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl md:text-4xl shadow-inner border-2 border-white">
          {emoji}
        </div>
        {isLoading && (
          <div className="absolute -top-1 -right-1 bg-yellow-400 p-1 rounded-full shadow-sm animate-bounce">
            <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-yellow-900" />
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <div className="bg-slate-100 rounded-xl md:rounded-2xl p-2 md:p-3 relative rounded-tl-none pr-10 md:pr-12">
          <div className="absolute top-0 -left-2 w-3 h-3 md:w-4 md:h-4 bg-slate-100 clip-path-polygon"></div>
          <p className="text-slate-800 font-bold text-sm sm:text-base md:text-lg leading-relaxed">
            {comment}
          </p>
          <SpeakerButton 
            onClick={onPlayComment} 
            isPlaying={isSpeaking}
            className="!absolute !top-2 !right-2 md:!top-3 md:!right-3"
          />
        </div>
      </div>
    </div>
  );
};

