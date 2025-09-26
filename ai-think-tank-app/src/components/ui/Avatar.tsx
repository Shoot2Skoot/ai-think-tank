import React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  generatedUrl?: string  // For DiceBear generated avatars
}

export const Avatar: React.FC<AvatarProps> = ({
  className,
  src,
  alt,
  fallback,
  size = 'md',
  generatedUrl,
  ...props
}) => {
  const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  }

  const getInitials = (text: string): string => {
    const words = text.trim().split(' ')
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase()
    }
    return words
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase()
  }

  // Use generated URL if provided, otherwise use src
  const avatarUrl = generatedUrl || src

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden rounded-full',
        'bg-primary-800',
        sizes[size],
        className
      )}
      {...props}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={alt || ''}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-medium text-text-primary">
          {fallback ? getInitials(fallback) : '?'}
        </span>
      )}
    </div>
  )
}