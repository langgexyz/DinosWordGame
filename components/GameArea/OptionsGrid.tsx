import React from 'react';
import { WordOption } from '../../types';
import { OptionCard } from '../OptionCard';

interface OptionsGridProps {
  options: WordOption[];
  isLoading: boolean;
  canInteract: boolean;
  highlightedWord: string | null;
  onOptionClick: (option: WordOption) => void;
}

/**
 * Options Grid - 选项网格组件
 * 职责：显示可选择的词语选项
 */
export const OptionsGrid: React.FC<OptionsGridProps> = ({
  options,
  isLoading,
  canInteract,
  highlightedWord,
  onOptionClick
}) => {
  return (
    <div className="w-full grid grid-cols-2 gap-3 md:gap-8 flex-1">
      {isLoading && options.length === 0 ? (
        [1, 2].map(i => (
          <div 
            key={i} 
            className="aspect-[16/9] md:aspect-video rounded-3xl bg-white/40 animate-shimmer border-2 border-white/50 relative overflow-hidden flex items-center justify-center"
          >
            <div className="text-4xl md:text-6xl opacity-30 animate-bounce">🐾</div>
          </div>
        ))
      ) : (
        options.map((option, idx) => (
          <OptionCard 
            key={idx}
            option={option} 
            onClick={() => onOptionClick(option)}
            disabled={!canInteract || isLoading}
            isHighlighted={highlightedWord === option.word.toLowerCase()}
          />
        ))
      )}
    </div>
  );
};

