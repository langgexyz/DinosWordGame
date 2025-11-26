import React from 'react';
import { Sparkles } from 'lucide-react';
import { SpeakerButton } from './SpeakerButton';

interface DinoCompanionProps {
  comment: string;
  isLoading?: boolean;
  isGeneratingImage?: boolean;
  isDinoSpeaking: boolean;
  onSpeak: () => void;
}

export const DinoCompanion: React.FC<DinoCompanionProps> = ({
  comment,
  isLoading,
  isGeneratingImage,
  isDinoSpeaking,
  onSpeak
}) => {
  const displayComment = isGeneratingImage 
    ? "Painting a picture for you! 🎨" 
    : comment;

  return (
    <div className="bg-white/90 backdrop-blur-xl p-3 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-lg mb-4 md:mb-6 flex items-center gap-3 md:gap-6 border-2 border-white">
      <div className="relative shrink-0">
        <div className="w-16 h-16 md:w-28 md:h-28 rounded-full bg-green-100 flex items-center justify-center text-4xl md:text-6xl shadow-inner border-4 border-white">
          🦖
        </div>
        {(isLoading || isGeneratingImage) && (
          <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-yellow-400 p-1.5 md:p-2 rounded-full shadow-sm animate-bounce">
            <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-yellow-900" />
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <div className="bg-slate-100 rounded-2xl md:rounded-3xl p-3 md:p-6 relative rounded-tl-none pr-10 md:pr-16">
          <div className="absolute top-0 -left-2 md:-left-3 w-4 h-4 md:w-6 md:h-6 bg-slate-100 clip-path-polygon"></div>
          <p className="text-slate-800 font-bold text-base sm:text-lg md:text-2xl leading-relaxed">
            {displayComment}
          </p>
          <SpeakerButton 
            onClick={onSpeak} 
            isPlaying={isDinoSpeaking}
          />
        </div>
      </div>
    </div>
  );
};

