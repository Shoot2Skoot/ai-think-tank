import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Smile, AtSign, Bold, Italic, Code } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Persona } from '@/types'

interface MessageInputProps {
  onSendMessage: (message: string, mentionedPersona?: string) => void
  personas: Persona[]
  disabled?: boolean
  loading?: boolean
  placeholder?: string
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  personas,
  disabled = false,
  loading = false,
  placeholder = 'Type a message...'
}) => {
  const [message, setMessage] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Filter personas for mention suggestions
  const filteredPersonas = personas.filter(p =>
    p.name.toLowerCase().includes(mentionSearch.toLowerCase())
  )

  useEffect(() => {
    // Reset selection when filtered list changes
    setSelectedMentionIndex(0)
  }, [mentionSearch])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex(prev =>
          prev < filteredPersonas.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (filteredPersonas[selectedMentionIndex]) {
          insertMention(filteredPersonas[selectedMentionIndex])
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false)
        setMentionSearch('')
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    setMessage(value)
    setCursorPosition(cursorPos)

    // Check for @ symbol
    const beforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = beforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.slice(lastAtIndex + 1)
      // Check if there's no space or newline after @ (allow any text including empty string)
      if (!afterAt.match(/[\s\n]/)) {
        setShowMentions(true)
        setMentionSearch(afterAt) // Can be empty string to show all personas
      } else {
        setShowMentions(false)
        setMentionSearch('')
      }
    } else {
      setShowMentions(false)
      setMentionSearch('')
    }
  }

  const insertMention = (persona: Persona) => {
    const beforeCursor = message.slice(0, cursorPosition)
    const afterCursor = message.slice(cursorPosition)
    const lastAtIndex = beforeCursor.lastIndexOf('@')

    const newMessage =
      message.slice(0, lastAtIndex) +
      `@${persona.name} ` +
      afterCursor

    setMessage(newMessage)
    setShowMentions(false)
    setMentionSearch('')

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newCursorPos = lastAtIndex + persona.name.length + 2
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleSend = () => {
    if (!message.trim() || loading || disabled) return

    // Extract mentioned persona if any - match against actual persona names
    let mentionedPersona: string | undefined

    // Check for each persona name specifically
    for (const persona of personas) {
      const escapedName = persona.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`@${escapedName}(?![A-Za-z])`, 'gi')
      if (regex.test(message)) {
        mentionedPersona = persona.id
        break // Take first matched persona
      }
    }

    onSendMessage(message, mentionedPersona)
    setMessage('')
    setShowMentions(false)
    setMentionSearch('')
  }

  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return

    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const selectedText = message.slice(start, end)

    const newText =
      message.slice(0, start) +
      prefix +
      selectedText +
      suffix +
      message.slice(end)

    setMessage(newText)

    // Set cursor position after prefix
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newPos = start + prefix.length
        textareaRef.current.setSelectionRange(newPos, newPos + selectedText.length)
      }
    }, 0)
  }

  return (
    <div className="relative message-input-container">
      {/* Mention Suggestions */}
      {showMentions && filteredPersonas.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-4">
          <div className="rounded-lg py-2 max-h-48 overflow-y-auto mention-dropdown">
            <div className="px-3 py-1 text-xs text-gray-500 font-medium">
              Mention a participant
            </div>
            {filteredPersonas.map((persona, index) => (
              <button
                key={persona.id}
                onClick={() => insertMention(persona)}
                onMouseEnter={() => setSelectedMentionIndex(index)}
                className={`w-full text-left px-3 py-2 flex items-center space-x-2 mention-dropdown-item ${
                  index === selectedMentionIndex ? 'selected' : ''
                }`}
              >
                <AtSign className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{persona.name}</span>
                <span className="text-xs text-gray-500">{persona.role}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        {/* Formatting Toolbar */}
        <div className="flex items-center space-x-1 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('**')}
            className="p-1 btn-ghost"
            disabled={disabled}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('*')}
            className="p-1 btn-ghost"
            disabled={disabled}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('`')}
            className="p-1 btn-ghost"
            disabled={disabled}
          >
            <Code className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newMessage = message + '@'
              setMessage(newMessage)
              setCursorPosition(newMessage.length)
              setShowMentions(true)
              setMentionSearch('')
              // Focus the textarea
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.focus()
                  textareaRef.current.setSelectionRange(newMessage.length, newMessage.length)
                }
              }, 0)
            }}
            className="p-1 btn-ghost"
            disabled={disabled}
          >
            <AtSign className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 btn-ghost"
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 btn-ghost"
            disabled={disabled}
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        {/* Message Input */}
        <div className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none rounded-lg px-3 py-2 text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed message-input"
            style={{ minHeight: '38px', maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || loading || disabled}
            size="sm"
            className="btn-primary"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Helper Text */}
        <div className="mt-2 text-xs text-gray-500">
          <span>Press </span>
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd>
          <span> to send, </span>
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">Shift+Enter</kbd>
          <span> for new line, </span>
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">@</kbd>
          <span> to mention</span>
        </div>
      </div>
    </div>
  )
}