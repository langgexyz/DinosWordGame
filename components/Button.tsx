import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  ...props 
}) => {
  const baseStyles = "font-bold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none translate-y-0 active:translate-y-1";
  
  const variants = {
    primary: "bg-blue-400 text-white hover:bg-blue-500",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-100",
    accent: "bg-yellow-400 text-yellow-900 hover:bg-yellow-500",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl",
  };

  return (
    <button 
      className={clsx(baseStyles, variants[variant], sizes[size], className)} 
      {...props}
    >
      {children}
    </button>
  );
};
