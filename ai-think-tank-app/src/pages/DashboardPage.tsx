import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, DollarSign, Users, TrendingUp } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useConversationStore } from '@/stores/conversation-store'
import { useAuthStore } from '@/stores/auth-store'
import { useBudgetStore, getRemainingBudget } from '@/stores/budget-store'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { conversations, loadConversations } = useConversationStore()
  const { budget, loadBudget } = useBudgetStore()
  const remainingBudget = getRemainingBudget(useBudgetStore.getState())

  useEffect(() => {
    if (user) {
      loadConversations(user.id)
      loadBudget(user.id)
    }
  }, [user, loadConversations, loadBudget])

  const stats = {
    totalConversations: conversations.length,
    activeConversations: conversations.filter(c => c.is_active).length,
    totalSpent: budget?.current_monthly_spend || 0,
    remainingBudget: remainingBudget?.monthly || 0
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
            <p className="mt-1 text-sm text-text-tertiary">
              Welcome back! Here's your AI Think Tank overview.
            </p>
          </div>
          <Button
            onClick={() => navigate('/conversation')}
            className="mt-4 sm:mt-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Conversation
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-secondary">
                    Total Conversations
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-text-primary">
                    {stats.totalConversations}
                  </p>
                </div>
                <MessageSquare className="h-12 w-12 text-blue-100" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-secondary">
                    Active Conversations
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-text-primary">
                    {stats.activeConversations}
                  </p>
                </div>
                <TrendingUp className="h-12 w-12 text-green-100" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-secondary">
                    Monthly Spent
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-text-primary">
                    {formatCurrency(stats.totalSpent)}
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-yellow-100" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-secondary">
                    Remaining Budget
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-text-primary">
                    {formatCurrency(stats.remainingBudget)}
                  </p>
                </div>
                <Users className="h-12 w-12 text-purple-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-text-tertiary">
                  No conversations yet. Start your first AI think tank!
                </p>
                <Button
                  onClick={() => navigate('/conversation')}
                  className="mt-4"
                >
                  Start Conversation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {conversations.slice(0, 5).map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-primary-900 hover:bg-opacity-10 cursor-pointer"
                    onClick={() => navigate(`/conversation/${conversation.id}`)}
                  >
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-text-primary">
                        {conversation.title}
                      </h3>
                      <p className="text-sm text-text-tertiary">
                        {conversation.message_count} messages • {formatCurrency(conversation.total_cost)}
                      </p>
                    </div>
                    <div className="text-sm text-text-tertiary">
                      {formatRelativeTime(conversation.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}