import React, { useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  MessageSquare,
  Users,
  DollarSign,
  Home,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useConversationStore } from '@/stores/conversation-store'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuthStore()
  const { conversations, loadConversations } = useConversationStore()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  useEffect(() => {
    if (user && conversations.length === 0) {
      loadConversations(user.id)
    }
  }, [user, conversations.length, loadConversations])

  const handleConversationsClick = (e: React.MouseEvent) => {
    e.preventDefault()

    // If we have conversations, go to the most recent one
    if (conversations.length > 0) {
      navigate(`/conversation/${conversations[0].id}`)
    } else {
      // Otherwise go to the conversation page to create a new one
      navigate('/conversation')
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, customClick: null },
    { name: 'Conversations', href: '/conversation', icon: MessageSquare, customClick: handleConversationsClick },
    { name: 'Personas', href: '/personas', icon: Users, customClick: null },
    { name: 'Budget', href: '/budget', icon: DollarSign, customClick: null },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-grow flex-col overflow-y-auto border-r pt-5" style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-surface-primary)' }}>
          <div className="flex flex-shrink-0 items-center px-4">
            <h1 className="text-xl font-bold text-text-primary">AI Think Tank</h1>
          </div>
          <div className="mt-8 flex flex-grow flex-col">
            <nav className="flex-1 space-y-1 px-2 pb-4">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname.startsWith(item.href)

                if (item.customClick) {
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={item.customClick}
                      className={cn(
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer',
                        isActive
                          ? 'bg-primary-900 bg-opacity-20 text-primary-400'
                          : 'text-text-secondary hover:bg-primary-900 hover:bg-opacity-10 hover:text-text-primary'
                      )}
                    >
                      <Icon
                        className={cn(
                          'mr-3 h-5 w-5',
                          isActive
                            ? 'text-primary-400'
                            : 'text-text-tertiary group-hover:text-text-secondary'
                        )}
                      />
                      {item.name}
                    </a>
                  )
                } else {
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                        isActive
                          ? 'bg-primary-900 bg-opacity-20 text-primary-400'
                          : 'text-text-secondary hover:bg-primary-900 hover:bg-opacity-10 hover:text-text-primary'
                      )}
                    >
                      <Icon
                        className={cn(
                          'mr-3 h-5 w-5',
                          isActive
                            ? 'text-primary-400'
                            : 'text-text-tertiary group-hover:text-text-secondary'
                        )}
                      />
                      {item.name}
                    </Link>
                  )
                }
              })}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t p-4" style={{ borderColor: 'var(--color-surface-divider)' }}>
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {user?.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="ml-3"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden">
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b px-4 py-2" style={{ backgroundColor: 'var(--color-surface-primary)', borderColor: 'var(--color-surface-border)' }}>
          <h1 className="text-lg font-bold text-gray-900">AI Think Tank</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-30 pt-14" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
            <nav className="px-4 py-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname.startsWith(item.href)

                if (item.customClick) {
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => {
                        item.customClick(e)
                        setMobileMenuOpen(false)
                      }}
                      className={cn(
                        'flex items-center px-3 py-2 text-base font-medium rounded-md mb-1 cursor-pointer',
                        isActive
                          ? 'bg-primary-900 bg-opacity-20 text-primary-400'
                          : 'text-text-secondary hover:bg-primary-900 hover:bg-opacity-10'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </a>
                  )
                } else {
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center px-3 py-2 text-base font-medium rounded-md mb-1',
                        isActive
                          ? 'bg-primary-900 bg-opacity-20 text-primary-400'
                          : 'text-text-secondary hover:bg-primary-900 hover:bg-opacity-10'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                }
              })}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-surface-divider)' }}>
                <p className="px-3 text-sm text-text-secondary">{user?.email}</p>
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        <main className="py-6 px-4 sm:px-6 lg:px-8 pt-16 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  )
}