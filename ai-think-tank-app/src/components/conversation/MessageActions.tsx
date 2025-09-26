import React, { useState } from 'react'
import { MoreVertical, Edit2, Copy, Trash2, Reply } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'

interface MessageActionsProps {
  messageId: string
  content: string
  isOwn: boolean
  onEdit?: () => void
  onDelete?: () => void
  onReply?: () => void
  onCopy?: () => void
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  content,
  isOwn,
  onEdit,
  onDelete,
  onReply,
  onCopy
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    if (onCopy) onCopy()
  }

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  )

  return (
    <Popover trigger={trigger} placement="bottom" className="w-48 p-1">
      <div className="space-y-1">
        <button
          onClick={handleCopy}
          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
        >
          <Copy className="h-4 w-4" />
          <span>Copy</span>
        </button>

        {onReply && (
          <button
            onClick={onReply}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            <Reply className="h-4 w-4" />
            <span>Reply</span>
          </button>
        )}

        {isOwn && onEdit && (
          <button
            onClick={onEdit}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            <Edit2 className="h-4 w-4" />
            <span>Edit</span>
          </button>
        )}

        {isOwn && onDelete && (
          <>
            <div className="border-t my-1" />
            <button
              onClick={onDelete}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </>
        )}
      </div>
    </Popover>
  )
}