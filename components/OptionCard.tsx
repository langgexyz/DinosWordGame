import React, { useState } from 'react';
import { WordOption } from '../types';
import { clsx } from 'clsx';
import { SpeakerButton } from './SpeakerButton';

interface OptionCardProps {
  option: WordOption;
  onClick: () => void;
  disabled?: boolean;
  isHighlighted?: boolean;
}

const colors = [
  'bg-red-50 text-red-900 border-red-200 hover:bg-red-100',
  'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100',
  'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100',
  'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100',
  'bg-violet-50 text-violet-900 border-violet-200 hover:bg-violet-100',
];

export const OptionCard: React.FC<OptionCardProps> = ({ option, onClick, disabled, isHighlighted }) => {
  const colorClass = colors[option.word.length % colors.length];
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(option.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={clsx(
        "relative flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-b-[6px] md:border-b-8 transition-all duration-300 w-full h-full group select-none",
        colorClass,
        disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] hover:-translate-y-1 active:translate-y-1 active:border-b-0 active:shadow-inner cursor-pointer shadow-sm",
        isHighlighted && "scale-110 ring-4 ring-yellow-400 z-10 shadow-xl"
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <div className={clsx(
        "flex flex-col items-center gap-1 sm:gap-2 md:gap-4 pointer-events-none mb-4 md:mb-0 transition-transform duration-300",
        isHighlighted && "scale-110"
      )}>
        <span className={clsx(
            "text-4xl sm:text-6xl md:text-7xl lg:text-8xl filter drop-shadow-md transition-transform duration-300 leading-relaxed",
            !isHighlighted && "group-hover:rotate-12",
            isHighlighted && "animate-bounce"
        )}>{option.emoji}</span>
        <div className="text-center">
            <span className={clsx(
                "block text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black capitalize tracking-tight mb-0.5 md:mb-1",
                isHighlighted && "text-yellow-600"
            )}>{option.word}</span>
            <span className="block text-base sm:text-xl md:text-2xl font-bold opacity-70">{option.zh}</span>
        </div>
      </div>

      <SpeakerButton onClick={handleSpeak} isPlaying={isPlaying} />
    </div>
  );
};