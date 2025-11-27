/**
 * 故事卡片组件
 * 显示堆叠的图片封面和元信息
 */

import React from 'react';
import { Story } from '../../types';

interface StoryCardProps {
  story: Story;
  onOpen: () => void;
  onContinue?: () => void;
  onDelete?: () => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({ story, onOpen, onContinue, onDelete }) => {
  // 取前3张图片用于堆叠显示
  const previewImages = story.cover.previewImages.slice(0, 3);
  
  return (
    <div 
      className="group cursor-pointer relative"
      onClick={onOpen}
    >
      {/* 故事封面 - 堆叠效果 */}
      <div className="relative aspect-[3/4] mb-3">
        
        {/* 堆叠的图片卡片 */}
        <div className="absolute inset-0">
          {previewImages.length > 0 ? (
            previewImages.map((image, index) => (
              <div
                key={index}
                className="absolute bg-white rounded-xl shadow-lg border-4 border-white overflow-hidden transition-all duration-300 group-hover:scale-105"
                style={{
                  top: `${index * 8}px`,
                  left: `${index * 8}px`,
                  right: `${index * -8}px`,
                  bottom: `${index * -8}px`,
                  zIndex: previewImages.length - index,
                  transform: `rotate(${index * 2 - 2}deg)`,
                  opacity: 1 - index * 0.1
                }}
              >
                {image ? (
                  <img 
                    src={image} 
                    alt={`Page ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <span className="text-6xl opacity-50">
                      {story.cover.themeEmoji}
                    </span>
                  </div>
                )}
              </div>
            ))
          ) : (
            // 没有图片时显示默认封面
            <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl shadow-lg border-4 border-white flex items-center justify-center">
              <span className="text-8xl opacity-30">
                {story.cover.themeEmoji}
              </span>
            </div>
          )}
          
          {/* 页数标签 */}
          <div className="absolute bottom-2 right-2 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg z-10">
            📄 {story.cover.pageCount}
          </div>
        </div>
      </div>

      {/* 故事标题和元信息 */}
      <div className="text-center px-2 space-y-1">
        <h3 className="font-black text-slate-800 text-base md:text-lg line-clamp-2 leading-tight">
          {story.title}
        </h3>
        
        {/* 页数信息 */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <span className="text-base">{story.cover.themeEmoji}</span>
          <span>{story.cover.pageCount} 页</span>
        </div>
        
        <p className="text-xs text-slate-400">
          {formatRelativeTime(story.createdAt)}
        </p>
      </div>

      {/* 继续创作按钮（悬停显示） */}
      {onContinue && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onContinue();
          }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95 shadow-lg z-20"
        >
          继续创作 ✨
        </button>
      )}

      {/* 悬停时显示删除按钮 */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`确定要删除「${story.title}」吗？\n共 ${story.cover.pageCount} 页内容将被删除。`)) {
              onDelete();
            }
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-lg hover:bg-red-600 shadow-lg z-20"
        >
          ×
        </button>
      )}
    </div>
  );
};

// 时间格式化辅助函数
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  });
}
