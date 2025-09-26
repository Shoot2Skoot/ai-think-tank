import React from 'react'

interface TimeDividerProps {
  date: string | Date
}

export const TimeDivider: React.FC<TimeDividerProps> = ({ date }) => {
  const formatDate = (dateInput: string | Date) => {
    const d = new Date(dateInput)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isToday = d.toDateString() === today.toDateString()
    const isYesterday = d.toDateString() === yesterday.toDateString()

    if (isToday) {
      return 'Today'
    } else if (isYesterday) {
      return 'Yesterday'
    } else {
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  return (
    <div className="flex items-center my-4 px-4">
      <div className="flex-1 border-t border-surface-border"></div>
      <div className="px-3">
        <span className="text-xs font-medium text-text-tertiary bg-surface-primary">
          {formatDate(date)}
        </span>
      </div>
      <div className="flex-1 border-t border-surface-border"></div>
    </div>
  )
}