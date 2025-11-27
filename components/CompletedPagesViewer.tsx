/**
 * 已完成页面查看器
 * 在创作时展示已完成的故事页面，可以左右滑动浏览
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { PageView } from './StoryReader/PageView';
import { StoryPage } from '../types';
import { createSpeechService } from '../services/speech';

interface CompletedPagesViewerProps {
  pages: StoryPage[];
  className?: string;
}

export const CompletedPagesViewer: React.FC<CompletedPagesViewerProps> = ({ 
  pages,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(pages.length - 1); // 默认显示最后一页
  const [direction, setDirection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const speechService = React.useMemo(() => 
    createSpeechService({}, {
      onEnd: () => setIsPlaying(false)
    }), 
  []);
  
  if (pages.length === 0) {
    return null;
  }
  
  const currentPage = pages[currentIndex];
  
  const nextPage = () => {
    if (currentIndex < pages.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(false);
      speechService.cancel();
    }
  };
  
  const prevPage = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(false);
      speechService.cancel();
    }
  };
  
  const playCurrentPage = () => {
    if (currentPage) {
      setIsPlaying(true);
      speechService.speak(currentPage.sentence, 'en-US');
    }
  };
  
  const swipeHandlers = useSwipeable({
    onSwipedLeft: nextPage,
    onSwipedRight: prevPage,
    trackMouse: true
  });
  
  const pageVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0
    })
  };
  
  return (
    <div className={`relative ${className}`} {...swipeHandlers}>
      {/* 页面指示器 */}
      {pages.length > 1 && (
        <div className="absolute -top-8 left-0 right-0 flex justify-center gap-1.5 z-10">
          {pages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (idx !== currentIndex) {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                  setIsPlaying(false);
                  speechService.cancel();
                }
              }}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex 
                  ? 'w-8 bg-slate-600' 
                  : 'w-1.5 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      )}
      
      {/* 页面内容 */}
      <div className="relative overflow-hidden rounded-2xl h-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30 
            }}
            className="h-full"
          >
            <PageView 
              page={currentPage}
              onPlayAudio={playCurrentPage}
              isPlaying={isPlaying}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* 可点击的导航按钮 */}
      {pages.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={prevPage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:scale-110 transition-all z-10"
              aria-label="上一页"
            >
              <span className="text-xl font-bold">&lt;</span>
            </button>
          )}
          {currentIndex < pages.length - 1 && (
            <button
              onClick={nextPage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:scale-110 transition-all z-10"
              aria-label="下一页"
            >
              <span className="text-xl font-bold">&gt;</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

