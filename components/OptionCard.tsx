import React from 'react';
import { WordOption } from '../types';
import { clsx } from 'clsx';

interface OptionCardProps {
  option: WordOption;
  onClick: () => void;
  disabled?: boolean;
}

const colors = [
  'bg-red-50 text-red-900 border-red-200 hover:bg-red-100',
  'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100',
  'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100',
  'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100',
  'bg-violet-50 text-violet-900 border-violet-200 hover:bg-violet-100',
];

export const OptionCard: React.FC<OptionCardProps> = ({ option, onClick, disabled }) => {
  const colorClass = colors[option.word.length % colors.length];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "relative flex flex-col items-center justify-center p-4 md:p-8 rounded-[2rem] border-b-8 transition-all duration-200 w-full h-full",
        colorClass,
        disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] hover:-translate-y-1 active:translate-y-1 active:border-b-0 active:shadow-inner cursor-pointer shadow-sm"
      )}
    >
      <div className="flex flex-col items-center gap-2 md:gap-4">
        <span className="text-5xl md:text-7xl lg:text-8xl filter drop-shadow-md transition-transform duration-300 group-hover:rotate-12">{option.emoji}</span>
        <div className="text-center">
            <span className="block text-2xl md:text-4xl lg:text-5xl font-black capitalize tracking-tight mb-1">{option.word}</span>
            <span className="block text-lg md:text-2xl font-bold opacity-70">{option.zh}</span>
        </div>
      </div>
    </button>
  );
};