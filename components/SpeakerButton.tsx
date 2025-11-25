import React from 'react';
import { Volume2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SpeakerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPlaying?: boolean;
}

export const SpeakerButton: React.FC<SpeakerButtonProps> = ({ isPlaying, className, ...props }) => {
  return (
    <button 
      type="button"
      className={clsx(
        "absolute bottom-2 right-2 md:bottom-4 md:right-4 p-2 text-slate-400 hover:text-green-500 transition-all duration-200 rounded-full hover:bg-slate-100/50 active:scale-95 z-10",
        isPlaying && "text-green-500 animate-pulse bg-green-50 ring-2 ring-green-100",
        className
      )}
      {...props}
    >
      <Volume2 className={clsx("w-6 h-6 md:w-8 md:h-8", isPlaying && "animate-bounce-subtle")} />
    </button>
  );
};