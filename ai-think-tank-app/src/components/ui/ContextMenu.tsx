import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface ContextMenuProps {
  children: React.ReactNode
  menu: React.ReactNode
  className?: string
  disabled?: boolean
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  children,
  menu,
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    if (disabled) return

    e.preventDefault()
    e.stopPropagation()

    setPosition({ x: e.clientX, y: e.clientY })
    setIsOpen(true)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const handleScroll = () => {
      setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      window.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect()
      const padding = 8

      let adjustedX = position.x
      let adjustedY = position.y

      // Adjust horizontal position if menu would overflow
      if (position.x + menuRect.width > window.innerWidth - padding) {
        adjustedX = window.innerWidth - menuRect.width - padding
      }

      // Adjust vertical position if menu would overflow
      if (position.y + menuRect.height > window.innerHeight - padding) {
        adjustedY = window.innerHeight - menuRect.height - padding
      }

      // Ensure menu doesn't go off the left or top edges
      adjustedX = Math.max(padding, adjustedX)
      adjustedY = Math.max(padding, adjustedY)

      if (adjustedX !== position.x || adjustedY !== position.y) {
        setPosition({ x: adjustedX, y: adjustedY })
      }
    }
  }, [isOpen, position])

  return (
    <>
      <div
        ref={targetRef}
        onContextMenu={handleContextMenu}
        className="contents"
      >
        {children}
      </div>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className={cn(
            'fixed z-[100] min-w-[180px] rounded-lg shadow-xl border bg-surface-primary border-surface-border py-1',
            'animate-in fade-in-0 zoom-in-95 duration-100',
            className
          )}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`
          }}
          onClick={() => setIsOpen(false)}
        >
          {menu}
        </div>,
        document.body
      )}
    </>
  )
}

interface ContextMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  icon?: React.ReactNode
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  closeOnClick?: boolean
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  children,
  onClick,
  className,
  icon,
  shortcut,
  danger = false,
  disabled = false,
  closeOnClick = true
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.stopPropagation() // Only stop propagation for disabled items
      return
    }
    onClick?.()
    // Don't stop propagation - let it bubble up to close the menu
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2 text-sm text-text-secondary transition-colors',
        !disabled && 'hover:bg-primary-900 hover:bg-opacity-10',
        danger && !disabled && 'hover:bg-red-50 text-error',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="flex items-center space-x-2">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </div>
      {shortcut && (
        <span className="text-xs text-text-tertiary ml-4">{shortcut}</span>
      )}
    </button>
  )
}

export const ContextMenuSeparator: React.FC = () => {
  return <div className="h-px bg-surface-border my-1" />
}