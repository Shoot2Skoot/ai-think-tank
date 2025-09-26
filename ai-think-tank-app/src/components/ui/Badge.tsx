import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'
  size?: 'sm' | 'md'
  children: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-primary-900 bg-opacity-20 text-text-primary',
    success: 'bg-green-500 bg-opacity-20 text-green-400',
    warning: 'bg-yellow-500 bg-opacity-20 text-yellow-400',
    danger: 'bg-red-500 bg-opacity-20 text-red-400',
    info: 'bg-primary-500 bg-opacity-20 text-primary-300',
    secondary: 'bg-secondary-500 bg-opacity-20 text-secondary-300'
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}