import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Home, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

interface UserSectionProps {
  className?: string
  isCollapsed?: boolean
}

export const UserSection: React.FC<UserSectionProps> = ({ className, isCollapsed = false }) => {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  if (!user) return null

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut()
      navigate('/login')
    }
  }

  const handleSettings = () => {
    // TODO: Navigate to settings page when it exists
    console.log('Settings clicked')
  }

  const handleDashboard = () => {
    navigate('/dashboard')
  }

  // Extract initials from email if no name is available
  const getUserInitials = () => {
    const email = user.email || ''
    const parts = email.split('@')[0].split(/[._-]/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  const getUserDisplayName = () => {
    // Use email username part as display name
    const email = user.email || ''
    return email.split('@')[0]
  }

  // Collapsed view - just show avatar
  if (isCollapsed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-2 p-2 border-t",
          className
        )}
        style={{
          backgroundColor: 'var(--color-surface-primary)',
          borderColor: 'var(--color-surface-border)'
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary-500)' }}
          onClick={handleDashboard}
          title={getUserDisplayName()}
        >
          <span className="text-white text-xs font-semibold">
            {getUserInitials()}
          </span>
        </div>
        <button
          onClick={handleSettings}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 border-t",
        className
      )}
      style={{
        backgroundColor: 'var(--color-surface-primary)',
        borderColor: 'var(--color-surface-border)'
      }}
    >
      {/* User Info */}
      <div className="flex items-center space-x-2 min-w-0">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--color-primary-500)' }}
        >
          <span className="text-white text-xs font-semibold">
            {getUserInitials()}
          </span>
        </div>

        {/* Name and Status */}
        <div className="min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
            {getUserDisplayName()}
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--color-success)' }}>
            Online
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-1">

        {/* Dashboard Button */}
        <button
          onClick={handleDashboard}
          className="p-1.5 rounded transition-colors"
          style={{
            color: 'var(--color-text-tertiary)',
            ':hover': { backgroundColor: 'var(--color-surface-hover)' }
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Dashboard"
        >
          <Home className="h-4 w-4" />
        </button>

        {/* Settings Button */}
        <button
          onClick={handleSettings}
          className="p-1.5 rounded transition-colors"
          style={{
            color: 'var(--color-text-tertiary)',
            ':hover': { backgroundColor: 'var(--color-surface-hover)' }
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="p-1.5 rounded transition-colors"
          style={{
            color: 'var(--color-text-tertiary)',
            ':hover': { backgroundColor: 'var(--color-error)', color: 'white' }
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-error)'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--color-text-tertiary)'
          }}
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}