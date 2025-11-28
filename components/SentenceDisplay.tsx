import React from 'react';
import { WordOption } from '../types';
import { SpeakerButton } from './SpeakerButton';

interface SentenceDisplayProps {
  words: WordOption[];
  isComplete: boolean;
  isLoading: boolean;
  isPlayingFullSentence: boolean;
  onPlaySentence: () => void;
  isFirstPage?: boolean;  // 是否是第一页
}

export const SentenceDisplay: React.FC<SentenceDisplayProps> = ({
  words,
  isComplete,
  isLoading,
  isPlayingFullSentence,
  onPlaySentence,
  isFirstPage = false
}) => {
  return (
    <div className="flex-1 bg-white/80 backdrop-blur-md rounded-[2rem] md:rounded-[2.5rem] border-4 border-white shadow-xl p-4 md:p-10 mb-4 md:mb-6 flex flex-col items-center justify-center relative overflow-hidden">
      
      <div className="flex flex-wrap items-end justify-center gap-2 md:gap-4 lg:gap-6 pb-12">
        {words.map((word, idx) => (
          <div key={idx} className="flex flex-col items-center animate-fly-in">
            <span className="text-xl sm:text-2xl md:text-4xl filter drop-shadow-md transform transition-transform hover:scale-125 mb-1">
              {word.emoji}
            </span>
            <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-800 drop-shadow-sm tracking-tight">
              {word.word}
            </span>
          </div>
        ))}

        {/* Cursor / Placeholder */}
        {!isComplete && (
          <div className="flex flex-col items-center justify-end h-full ml-1 md:ml-2 pb-2">
            <div className="w-16 sm:w-20 md:w-32 h-2 border-b-4 md:border-b-8 border-dashed border-slate-300 rounded-full opacity-50"></div>
          </div>
        )}
      </div>
      
      {/* Main Sentence Speaker Button - Bottom Right */}
      {words.length > 0 && (
        <SpeakerButton 
          onClick={onPlaySentence} 
          isPlaying={isPlayingFullSentence}
        />
      )}

      {words.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 animate-fade-in">
          <div className="text-6xl md:text-8xl animate-bounce">🦖</div>
          <div className="text-slate-400 font-bold text-xl md:text-3xl text-center px-4">
            {isFirstPage ? "Once upon a time... 📖" : "What happens next? ✨"}
          </div>
        </div>
      )}
    </div>
  );
};

