/**
 * 故事阅读器组件
 * 简洁的翻页体验，支持滑动和点击边缘翻页
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { PageView } from './PageView';
import { Story } from '../../types';
import { createSpeechService } from '../../services/speech';

interface StoryReaderProps {
  story: Story;
  onClose: () => void;
  onContinueEdit?: (story: Story) => void;
}

export const StoryReader: React.FC<StoryReaderProps> = ({ story, onClose, onContinueEdit }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 语音服务
  const speechService = useMemo(() => createSpeechService({}, {
    onEnd: () => setIsPlaying(false)
  }), []);
  
  const currentPage = story.pages[currentPageIndex];
  const totalPages = story.pages.length;
  
  // 翻页逻辑
  const nextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      setDirection(1);
      setCurrentPageIndex(prev => prev + 1);
      setIsPlaying(false);
      speechService.cancel();
    }
  };
  
  const prevPage = () => {
    if (currentPageIndex > 0) {
      setDirection(-1);
      setCurrentPageIndex(prev => prev - 1);
      setIsPlaying(false);
      speechService.cancel();
    }
  };
  
  // 朗读当前页
  const playCurrentPage = () => {
    if (currentPage) {
      setIsPlaying(true);
      speechService.speak(currentPage.sentence, 'en-US');
    }
  };
  
  // 点击左右边缘翻页
  const handlePageClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (x < width * 0.25) {
      prevPage(); // 左侧 25% - 上一页
    } else if (x > width * 0.75) {
      nextPage(); // 右侧 25% - 下一页
    }
  };
  
  // 滑动手势
  const swipeHandlers = useSwipeable({
    onSwipedLeft: nextPage,
    onSwipedRight: prevPage,
    trackMouse: true
  });
  
  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPage();
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex]);
  
  // 页面切换动画
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
    <div 
      className="fixed inset-0 bg-gradient-to-b from-amber-50 to-orange-50 z-50 flex flex-col"
      {...swipeHandlers}
    >
      {/* Header - 简洁设计 */}
      <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 bg-white/90 backdrop-blur-sm shadow-sm">
        <button 
          onClick={onClose}
          className="text-lg md:text-xl hover:scale-110 transition-transform active:scale-95 font-medium text-slate-700"
        >
          ← 返回
        </button>
        
        <h2 className="font-black text-slate-800 text-base md:text-xl truncate max-w-xs md:max-w-md">
          {story.title}
        </h2>
        
        <div className="flex items-center gap-2 md:gap-3">
          {/* 继续创作按钮 */}
          {onContinueEdit && (
            <button 
              onClick={() => onContinueEdit(story)}
              className="px-2 md:px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs md:text-sm font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-md"
            >
              ✍️ 继续
            </button>
          )}
          
          {/* 页码 */}
          <span className="text-xs md:text-sm text-slate-500 font-medium min-w-[3rem] text-right">
            {currentPageIndex + 1}/{totalPages}
          </span>
        </div>
      </header>

      {/* 书本内容 - 点击边缘翻页 */}
      <div 
        className="flex-1 flex items-center justify-center p-4 md:p-6 overflow-hidden cursor-pointer"
        onClick={handlePageClick}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPageIndex}
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
            className="max-w-3xl w-full h-full"
          >
            <PageView 
              page={currentPage}
              onPlayAudio={playCurrentPage}
              isPlaying={isPlaying}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
