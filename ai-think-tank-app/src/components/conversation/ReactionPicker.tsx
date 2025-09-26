import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Smile } from 'lucide-react'

interface ReactionPickerProps {
  onSelect: (emoji: string) => void
  className?: string
  trigger?: React.ReactNode
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪', '🖕', '✍️', '🙏', '👏', '🙌', '🤝', '👐', '🤲', '🤜', '🤛'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🏋️', '🤸', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟', '🎯', '🎳', '🎮', '🎰', '🧩'],
  'Objects': ['⭐', '🌟', '✨', '⚡', '💥', '🔥', '🌈', '☀️', '🌤', '⛅', '☁️', '🌧', '⛈', '❄️', '🌊', '💧', '💦', '🎈', '🎉', '🎊', '🎁', '🎀', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '🏀', '🎯', '🔔', '🎵', '🎶', '💡', '💎', '💰', '💳', '💸', '⚙️', '🔧', '🔨', '⛏', '🔩', '⚙️', '🧲', '🔫', '💣', '🧨', '🔪', '🗡', '⚔️', '🛡', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🧴', '🛎', '🔑', '🗝', '🚪', '🪑', '🛋', '🛏', '🛌', '🧸', '🖼', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒', '🗓', '📆', '📅', '🗑', '📇', '🗃', '🗳', '🗄', '📋', '📁', '📂', '🗂', '🗞', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊', '🖋', '✒️', '🖌', '🖍', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
  'Symbols': ['💯', '✅', '❌', '❓', '❗', '❕', '⁉️', '‼️', '⚠️', '🚫', '🔕', '🔇', '🆗', '🆕', '🆒', '🆓', '🆙', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫']
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onSelect,
  className,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('Smileys')
  const [searchQuery, setSearchQuery] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji)
    setIsOpen(false)
    setSearchQuery('')
  }

  const getFilteredEmojis = () => {
    if (searchQuery) {
      // Search across all categories
      const allEmojis: string[] = []
      Object.values(EMOJI_CATEGORIES).forEach(emojis => {
        allEmojis.push(...emojis)
      })
      return allEmojis
    }
    return EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES] || []
  }

  const filteredEmojis = getFilteredEmojis()

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors",
          className
        )}
        title="Add reaction"
      >
        {trigger || <Smile className="h-5 w-5 text-gray-500" />}
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-80 rounded-lg shadow-lg z-50" style={{ backgroundColor: 'var(--color-surface-primary)', borderColor: 'var(--color-surface-border)', border: '1px solid' }}>
          <div className="p-3" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
            <input
              type="text"
              placeholder="Search emojis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-surface-border)'
              }}
              autoFocus
            />
          </div>

          {!searchQuery && (
            <div className="flex gap-1 p-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
              {Object.keys(EMOJI_CATEGORIES).map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-md whitespace-nowrap transition-colors",
                    selectedCategory === category
                      ? ""
                      : ""
                  )}
                  style={{
                    backgroundColor: selectedCategory === category ? 'var(--color-primary-500)' : 'transparent',
                    color: selectedCategory === category ? 'white' : 'var(--color-text-secondary)',
                    ...(selectedCategory !== category && { ':hover': { backgroundColor: 'var(--color-surface-hover)' }})
                  }}
                  onMouseEnter={(e) => selectedCategory !== category && (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                  onMouseLeave={(e) => selectedCategory !== category && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-8 gap-1 p-2 max-h-64 overflow-y-auto">
            {filteredEmojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                onClick={() => handleEmojiSelect(emoji)}
                className="p-2 rounded transition-colors text-xl"
                style={{ ':hover': { backgroundColor: 'var(--color-surface-hover)' }}}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}