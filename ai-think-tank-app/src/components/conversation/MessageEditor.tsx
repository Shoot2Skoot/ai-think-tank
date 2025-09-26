import React, { useState, useRef, useEffect } from 'react'
import { X, Check, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MessageContent } from './MessageContent'
import { cn } from '@/lib/utils'

interface MessageEditorProps {
  originalContent: string
  onSave: (newContent: string) => void
  onCancel: () => void
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  originalContent,
  onSave,
  onCancel
}) => {
  const [content, setContent] = useState(originalContent)
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current && !showPreview) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(content.length, content.length)
    }
  }, [showPreview, content.length])

  const handleSave = () => {
    if (content.trim() && content !== originalContent) {
      onSave(content.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 text-xs text-text-tertiary">
        <span>Editing message</span>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center space-x-1 hover:text-text-secondary"
        >
          <Eye className="h-3 w-3" />
          <span>{showPreview ? 'Edit' : 'Preview'}</span>
        </button>
      </div>

      {showPreview ? (
        <div className="p-3 bg-opacity-10 bg-primary-900 rounded-lg border border-surface-border">
          <div className="text-sm font-medium text-text-secondary mb-2">Preview:</div>
          <MessageContent content={content} />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
          rows={Math.min(10, content.split('\n').length + 1)}
          placeholder="Edit your message..."
        />
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-text-tertiary">
          Press <kbd className="px-1 py-0.5 bg-surface-secondary rounded">Ctrl+Enter</kbd> to save,{' '}
          <kbd className="px-1 py-0.5 bg-surface-secondary rounded">Esc</kbd> to cancel
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!content.trim() || content === originalContent}
          >
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}