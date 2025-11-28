/**
 * 统一的页面容器组件
 * 提供一致的背景和布局
 */

import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 ${className}`}>
      {children}
    </div>
  );
};

