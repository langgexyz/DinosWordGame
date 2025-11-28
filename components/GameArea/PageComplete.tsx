import React from 'react';
import { Button } from '../Button';
import { SpeakerButton } from '../SpeakerButton';
import { ArrowRight, Star } from 'lucide-react';

interface PageCompleteProps {
  sentence: string;
  image: string | null;
  isGeneratingImage: boolean;
  onContinue: () => void;
  onImageClick?: () => void;
  onPlaySentence?: () => void;
}

/**
 * Page Complete - 页面完成组件
 * 职责：显示完成的句子、图片和继续按钮
 */
export const PageComplete: React.FC<PageCompleteProps> = ({
  sentence,
  image,
  isGeneratingImage,
  onContinue,
  onImageClick,
  onPlaySentence
}) => {
  return (
    <div className="min-h-[140px] sm:min-h-[160px] md:min-h-[240px] flex items-end">
      <div className="w-full bg-orange-100/90 backdrop-blur rounded-[2rem] p-4 md:p-6 flex flex-col items-center justify-center text-center animate-fade-in border-4 border-white shadow-lg relative overflow-hidden">
        
        {isGeneratingImage ? (
          <div className="w-full h-full flex flex-col md:flex-row items-center gap-4 md:gap-6 py-4">
            {/* Loading animation */}
            <div className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-2xl bg-orange-200/50 animate-pulse flex items-center justify-center shrink-0 border-4 border-white shadow-lg">
              <span className="text-6xl md:text-8xl animate-bounce">🖌️</span>
            </div>
            {/* Sentence */}
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <Star className="w-5 h-5 md:w-6 md:h-6 fill-orange-500 animate-pulse" />
                <h2 className="text-xl md:text-2xl font-black">Painting your page... 🎨</h2>
              </div>
              <p className="text-slate-700 text-lg md:text-xl font-bold leading-snug">
                "{sentence}"
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col md:flex-row items-center gap-4 md:gap-6">
            {image && (
              <div 
                onClick={onImageClick}
                className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-lg shrink-0 border-4 border-white rotate-[-2deg] bg-white transform transition-all hover:scale-110 hover:rotate-0 cursor-pointer group"
              >
                <img src={image} alt="Story illustration" className="w-full h-full object-cover group-hover:brightness-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                  <span className="text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity">🔍</span>
                </div>
              </div>
            )}
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left h-full justify-center">
              <div className="flex items-center gap-2 text-orange-600 mb-1 md:mb-2">
                <Star className="w-5 h-5 md:w-6 md:h-6 fill-orange-500" />
                <h2 className="text-xl md:text-2xl font-black uppercase">Amazing! ✨</h2>
              </div>
              <div className="relative w-full mb-4">
                <p className="text-slate-700 text-lg md:text-2xl font-bold leading-snug pr-12">
                  "{sentence}"
                </p>
                {onPlaySentence && (
                  <SpeakerButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaySentence();
                    }}
                    className="!absolute !top-0 !right-0 !bottom-auto !left-auto"
                  />
                )}
              </div>
              
              <Button 
                onClick={onContinue} 
                size="lg" 
                className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 shadow-lg text-xl px-8 rounded-full animate-bounce-subtle"
              >
                Next <ArrowRight className="w-6 h-6 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

