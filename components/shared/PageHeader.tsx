/**
 * 统一的页面头部组件
 * 用于所有页面的顶部导航栏
 */

import React from 'react';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  rightContent?: React.ReactNode;
  backText?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  onBack, 
  rightContent,
  backText = "← Back"
}) => {
  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 bg-white/90 backdrop-blur-sm shadow-sm border-b border-slate-100">
      {/* 左侧：返回按钮 */}
      {onBack ? (
        <button 
          onClick={onBack}
          className="text-base md:text-lg hover:scale-105 transition-transform active:scale-95 font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
        >
          {backText}
        </button>
      ) : (
        <div className="w-20" /> // 占位符保持对齐
      )}
      
      {/* 中间：标题 */}
      <h1 className="font-black text-slate-800 text-lg md:text-2xl truncate max-w-xs md:max-w-2xl text-center">
        {title}
      </h1>
      
      {/* 右侧：自定义内容 */}
      <div className="flex items-center gap-2 md:gap-3 min-w-[5rem] justify-end">
        {rightContent}
      </div>
    </header>
  );
};

