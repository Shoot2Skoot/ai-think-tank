import React, { useState } from 'react'
import { MoreVertical, Edit3, Copy, Trash2, Reply, Pin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'

interface MessageActionsProps {
  messageId: string
  content: string
  isOwn: boolean
  isPinned?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onReply?: () => void
  onPin?: () => void
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  content,
  isOwn,
  isPinned = false,
  onEdit,
  onDelete,
  onReply,
  onPin
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
  }

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  )

  return (
    <div className="relative">
      <Popover
        trigger={trigger}
        placement="bottom"
        className="w-48 p-1"
        isOpen={isPopoverOpen}
        onOpenChange={setIsPopoverOpen}
      >
        <div className="space-y-1">
          <button
            onClick={handleCopy}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-text-secondary hover:bg-primary-900 hover:bg-opacity-10 rounded"
          >
            <Copy className="h-4 w-4" />
            <span>Copy Message</span>
          </button>

          {onReply && (
            <button
              onClick={onReply}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-text-secondary hover:bg-primary-900 hover:bg-opacity-10 rounded"
            >
              <Reply className="h-4 w-4" />
              <span>Reply</span>
            </button>
          )}

          {onPin && (
            <button
              onClick={onPin}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-text-secondary hover:bg-primary-900 hover:bg-opacity-10 rounded"
            >
              <Pin className="h-4 w-4" />
              <span>{isPinned ? 'Unpin Message' : 'Pin Message'}</span>
            </button>
          )}

          {isOwn && onEdit && (
            <>
              <div className="border-t border-surface-border my-1" />
              <button
                onClick={onEdit}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-text-secondary hover:bg-primary-900 hover:bg-opacity-10 rounded"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Message</span>
              </button>
            </>
          )}

          {isOwn && onDelete && (
            <button
              onClick={onDelete}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-red-50 rounded text-error"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Message</span>
            </button>
          )}
        </div>
      </Popover>
    </div>
  )
}