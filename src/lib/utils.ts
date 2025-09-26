import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(d)
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

export function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    openai: 'text-green-600 bg-green-100',
    anthropic: 'text-orange-600 bg-orange-100',
    google: 'text-blue-600 bg-blue-100'
  }
  return colors[provider] || 'text-gray-600 bg-gray-100'
}

export function getAttitudeColor(attitude?: string): string {
  const colors: Record<string, string> = {
    Pessimistic: 'text-red-600',
    Skeptical: 'text-orange-600',
    Neutral: 'text-gray-600',
    Intrigued: 'text-blue-600',
    Excited: 'text-green-600'
  }
  return colors[attitude || 'Neutral'] || 'text-gray-600'
}

export function getExperienceColor(level?: string): string {
  const colors: Record<string, string> = {
    None: 'text-gray-400',
    Limited: 'text-gray-600',
    Entry: 'text-blue-600',
    Senior: 'text-purple-600',
    Mastery: 'text-yellow-600'
  }
  return colors[level || 'Entry'] || 'text-gray-600'
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}