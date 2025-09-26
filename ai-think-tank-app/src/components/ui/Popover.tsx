import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface PopoverProps {
  trigger: React.ReactNode
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  offset?: number
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  children,
  placement = 'bottom',
  className,
  offset = 8,
  isOpen: controlledIsOpen,
  onOpenChange
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = (open: boolean) => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(open)
    }
    onOpenChange?.(open)
  }

  useEffect(() => {
    if (isOpen && triggerRef.current && popoverRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const popoverRect = popoverRef.current.getBoundingClientRect()

      let top = 0
      let left = 0

      switch (placement) {
        case 'bottom':
          top = triggerRect.bottom + offset
          left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2
          break
        case 'top':
          top = triggerRect.top - popoverRect.height - offset
          left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2
          break
        case 'left':
          top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2
          left = triggerRect.left - popoverRect.width - offset
          break
        case 'right':
          top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2
          left = triggerRect.right + offset
          break
      }

      // Ensure popover stays within viewport
      const padding = 16
      left = Math.max(padding, Math.min(left, window.innerWidth - popoverRect.width - padding))
      top = Math.max(padding, Math.min(top, window.innerHeight - popoverRect.height - padding))

      setPosition({ top, left })
    }
  }, [isOpen, placement, offset])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        triggerRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleTriggerClick = () => {
    if (controlledIsOpen === undefined) {
      setIsOpen(!isOpen)
    }
  }

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleTriggerClick}
        className="inline-block"
      >
        {trigger}
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className={cn(
              'fixed z-50 rounded-lg shadow-lg border bg-surface-primary border-surface-border',
              className
            )}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`
            }}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  )
}