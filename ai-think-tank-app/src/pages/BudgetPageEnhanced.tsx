import React, { useEffect, useState } from 'react'
import {
  DollarSign,
  AlertCircle,
  TrendingUp,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  Users,
  Cpu,
  Hash,
  Clock,
  Filter
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Slider } from '@/components/ui/Slider'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/SelectRadix'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/TabsRadix'
import { useAuthStore } from '@/stores/auth-store'
import { useBudgetStore, getRemainingBudget } from '@/stores/budget-store'
import { budgetStatistics } from '@/services/statistics/budget-statistics'
import type { BudgetStatistics } from '@/services/statistics/budget-statistics'
import { formatCurrency, formatPercentage } from '@/lib/utils'

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1']

type DateRange = 'today' | '7days' | '30days' | 'custom'

export const BudgetPageEnhanced: React.FC = () => {
  const user = useAuthStore((state) => state.user)
  const {
    budget,
    alerts,
    loadBudget,
    loadAlerts,
    updateBudget,
    acknowledgeAlert
  } = useBudgetStore()
  const remainingBudget = getRemainingBudget(useBudgetStore.getState())

  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState<BudgetStatistics | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('30days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const [formData, setFormData] = useState({
    monthly_limit: 10,
    daily_limit: 1,
    warning_threshold: 8,
    auto_stop: true
  })

  useEffect(() => {
    if (user) {
      loadBudget(user.id)
      loadAlerts(user.id)
      loadStatistics()
    }
  }, [user, loadBudget, loadAlerts])

  useEffect(() => {
    if (budget) {
      setFormData({
        monthly_limit: budget.monthly_limit,
        daily_limit: budget.daily_limit,
        warning_threshold: budget.warning_threshold,
        auto_stop: budget.auto_stop
      })
    }
  }, [budget])

  useEffect(() => {
    if (user) {
      loadStatistics()
    }
  }, [dateRange, customStartDate, customEndDate])

  const loadStatistics = async () => {
    if (!user) return

    setLoading(true)
    try {
      let startDate: Date
      let endDate = new Date()

      switch (dateRange) {
        case 'today':
          startDate = startOfDay(new Date())
          endDate = endOfDay(new Date())
          break
        case '7days':
          startDate = subDays(new Date(), 7)
          break
        case '30days':
          startDate = subDays(new Date(), 30)
          break
        case 'custom':
          startDate = customStartDate ? new Date(customStartDate) : subDays(new Date(), 30)
          endDate = customEndDate ? new Date(customEndDate) : new Date()
          break
        default:
          startDate = subDays(new Date(), 30)
      }

      const stats = await budgetStatistics.getStatistics(user.id, startDate, endDate)
      setStatistics(stats)
    } catch (error) {
      console.error('Failed to load statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    await updateBudget(formData)
    setEditMode(false)
  }

  const handleExport = async (format: 'json' | 'csv') => {
    if (!statistics) return

    const data = await budgetStatistics.exportStatistics(statistics, format)
    const blob = new Blob([data], {
      type: format === 'json' ? 'application/json' : 'text/csv'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-report-${format(new Date(), 'yyyy-MM-dd')}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Budget & Analytics</h1>
            <p className="mt-1 text-sm text-text-tertiary">
              Comprehensive spending analysis and budget management
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {dateRange === 'custom' && (
              <>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-36"
                />
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-36"
                />
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={!statistics}
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              disabled={!statistics}
            >
              <Download className="h-4 w-4 mr-1" />
              JSON
            </Button>
          </div>
        </div>

        {/* Budget Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Card key={alert.id} className="border-yellow-200 bg-primary-900 bg-opacity-20">
                <CardContent className="p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-yellow-800">
                        {alert.message}
                      </p>
                      <p className="mt-1 text-sm text-yellow-700">
                        Current: {formatCurrency(alert.current_value)} / Limit: {formatCurrency(alert.threshold_value)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="personas">Personas</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Current Usage Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-secondary">
                    Daily Spend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(budget?.current_daily_spend || 0)}
                  </div>
                  <div className="flex items-center mt-2">
                    <div className="flex-1 bg-surface-tertiary rounded-full h-2">
                      <div
                        className="bg-primary-400 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, remainingBudget?.dailyPercentage || 0)}%`
                        }}
                      />
                    </div>
                    <span className="ml-2 text-xs text-text-tertiary">
                      {remainingBudget?.dailyPercentage?.toFixed(0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-secondary">
                    Monthly Spend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(budget?.current_monthly_spend || 0)}
                  </div>
                  <div className="flex items-center mt-2">
                    <div className="flex-1 bg-surface-tertiary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          (remainingBudget?.monthlyPercentage || 0) > 80 ? 'bg-yellow-500' : 'bg-green-600'
                        }`}
                        style={{
                          width: `${Math.min(100, remainingBudget?.monthlyPercentage || 0)}%`
                        }}
                      />
                    </div>
                    <span className="ml-2 text-xs text-text-tertiary">
                      {remainingBudget?.monthlyPercentage?.toFixed(0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-secondary">
                    Total Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(statistics?.tokens.total_tokens || 0)}
                  </div>
                  <p className="text-xs text-text-tertiary mt-2">
                    {formatNumber(statistics?.tokens.cached_tokens || 0)} cached
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-secondary">
                    Cache Savings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(statistics?.cacheStats.total_saved || 0)}
                  </div>
                  <p className="text-xs text-text-tertiary mt-2">
                    {statistics?.cacheStats.hit_rate.toFixed(1)}% hit rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Cost Timeline Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Spending Timeline</CardTitle>
                <CardDescription>Daily cost and token usage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={statistics?.timeSeries || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis yAxisId="cost" orientation="left" tickFormatter={(value) => `$${value}`} />
                    <YAxis yAxisId="tokens" orientation="right" tickFormatter={formatNumber} />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      formatter={(value: any, name: string) => {
                        if (name === 'Cost') return formatCurrency(value)
                        return formatNumber(value)
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="cost"
                      type="monotone"
                      dataKey="cost"
                      name="Cost"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.6}
                    />
                    <Area
                      yAxisId="tokens"
                      type="monotone"
                      dataKey="tokens"
                      name="Tokens"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Provider Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Provider Costs</CardTitle>
                  <CardDescription>Cost distribution by AI provider</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RePieChart>
                      <Pie
                        data={Object.entries(statistics?.providers || {}).map(([provider, stats]) => ({
                          name: provider.charAt(0).toUpperCase() + provider.slice(1),
                          value: stats.total_cost
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.keys(statistics?.providers || {}).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversation Analytics</CardTitle>
                  <CardDescription>Key conversation metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Total Conversations</span>
                      <span className="font-medium">
                        {statistics?.conversationStats.total_conversations || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Avg Cost per Conversation</span>
                      <span className="font-medium">
                        {formatCurrency(statistics?.conversationStats.avg_cost_per_conversation || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Avg Messages per Conversation</span>
                      <span className="font-medium">
                        {statistics?.conversationStats.avg_messages_per_conversation.toFixed(1) || 0}
                      </span>
                    </div>
                    {statistics?.conversationStats.most_expensive_conversation.id && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-text-tertiary mb-1">Most Expensive</p>
                        <p className="text-sm font-medium">
                          {statistics.conversationStats.most_expensive_conversation.title}
                        </p>
                        <p className="text-sm text-primary-400">
                          {formatCurrency(statistics.conversationStats.most_expensive_conversation.cost)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Input Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatNumber(statistics?.tokens.input_tokens || 0)}
                  </div>
                  <p className="text-sm text-text-secondary mt-2">
                    Cost: {formatCurrency(statistics?.tokens.input_cost || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Output Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {formatNumber(statistics?.tokens.output_tokens || 0)}
                  </div>
                  <p className="text-sm text-text-secondary mt-2">
                    Cost: {formatCurrency(statistics?.tokens.output_cost || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cached Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {formatNumber(statistics?.tokens.cached_tokens || 0)}
                  </div>
                  <p className="text-sm text-text-secondary mt-2">
                    Saved: {formatCurrency(statistics?.tokens.cache_cost || 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Token Distribution by Provider */}
            <Card>
              <CardHeader>
                <CardTitle>Token Usage by Provider</CardTitle>
                <CardDescription>Breakdown of token consumption across different providers</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(statistics?.providers || {}).map(([provider, stats]) => ({
                      provider: provider.charAt(0).toUpperCase() + provider.slice(1),
                      input: stats.input_tokens,
                      output: stats.output_tokens,
                      cached: stats.cached_tokens
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="provider" />
                    <YAxis tickFormatter={formatNumber} />
                    <Tooltip formatter={(value: any) => formatNumber(value)} />
                    <Legend />
                    <Bar dataKey="input" name="Input" fill="#3b82f6" />
                    <Bar dataKey="output" name="Output" fill="#10b981" />
                    <Bar dataKey="cached" name="Cached" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Performance Analysis</CardTitle>
                <CardDescription>Cost and efficiency metrics for each model</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Model</th>
                        <th className="text-left py-2 px-3">Provider</th>
                        <th className="text-right py-2 px-3">Usage</th>
                        <th className="text-right py-2 px-3">Total Cost</th>
                        <th className="text-right py-2 px-3">Avg Cost/Msg</th>
                        <th className="text-right py-2 px-3">Tokens</th>
                        <th className="text-right py-2 px-3">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statistics?.models.map((model) => (
                        <tr key={`${model.provider}:${model.model}`} className="border-b">
                          <td className="py-2 px-3 font-medium">{model.model}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline">{model.provider}</Badge>
                          </td>
                          <td className="text-right py-2 px-3">{model.usage_count}</td>
                          <td className="text-right py-2 px-3 font-medium">
                            {formatCurrency(model.total_cost)}
                          </td>
                          <td className="text-right py-2 px-3">
                            {formatCurrency(model.avg_cost_per_message)}
                          </td>
                          <td className="text-right py-2 px-3">
                            {formatNumber(model.total_tokens)}
                          </td>
                          <td className="text-right py-2 px-3">
                            {model.token_efficiency.toFixed(0)} tokens/$
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Model Cost Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Model Cost Distribution</CardTitle>
                <CardDescription>Visual comparison of costs across models</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={statistics?.models.slice(0, 8) || []}
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis type="category" dataKey="model" width={120} />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Bar dataKey="total_cost" name="Total Cost" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Persona Cost Analysis</CardTitle>
                <CardDescription>Detailed breakdown of costs and usage by persona</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Persona</th>
                        <th className="text-right py-2 px-3">Messages</th>
                        <th className="text-right py-2 px-3">Total Cost</th>
                        <th className="text-right py-2 px-3">Avg Cost/Msg</th>
                        <th className="text-right py-2 px-3">Total Tokens</th>
                        <th className="text-right py-2 px-3">Avg Tokens/Msg</th>
                        <th className="text-right py-2 px-3">Last Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statistics?.personas.map((persona) => (
                        <tr key={persona.persona_id} className="border-b">
                          <td className="py-2 px-3 font-medium">{persona.persona_name}</td>
                          <td className="text-right py-2 px-3">{persona.message_count}</td>
                          <td className="text-right py-2 px-3 font-medium">
                            {formatCurrency(persona.total_cost)}
                          </td>
                          <td className="text-right py-2 px-3">
                            {formatCurrency(persona.avg_cost_per_message)}
                          </td>
                          <td className="text-right py-2 px-3">
                            {formatNumber(persona.total_tokens)}
                          </td>
                          <td className="text-right py-2 px-3">
                            {persona.avg_tokens_per_message.toFixed(0)}
                          </td>
                          <td className="text-right py-2 px-3 text-sm text-text-tertiary">
                            {format(new Date(persona.last_used), 'MMM dd')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Top Personas Chart */}
            {statistics?.personas && statistics.personas.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Personas by Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RePieChart>
                        <Pie
                          data={statistics.personas.slice(0, 5).map(p => ({
                            name: p.persona_name,
                            value: p.total_cost
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={(entry) => entry.name}
                        >
                          {statistics.personas.slice(0, 5).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      </RePieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Persona Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={statistics.personas.slice(0, 5).map(p => ({
                          name: p.persona_name,
                          messages: p.message_count,
                          avgCost: p.avg_cost_per_message
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis yAxisId="messages" orientation="left" />
                        <YAxis yAxisId="cost" orientation="right" tickFormatter={(v) => `$${v}`} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="messages" dataKey="messages" name="Messages" fill="#3b82f6" />
                        <Line yAxisId="cost" type="monotone" dataKey="avgCost" name="Avg Cost" stroke="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Budget Settings</CardTitle>
                    <CardDescription>Configure your spending limits and alerts</CardDescription>
                  </div>
                  {!editMode && (
                    <Button onClick={() => setEditMode(true)}>
                      Edit Settings
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {editMode ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-text-secondary">
                          Monthly Limit
                        </label>
                        <div className="mt-1 flex items-center space-x-2">
                          <span className="text-text-tertiary">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.monthly_limit}
                            onChange={(e) => setFormData({
                              ...formData,
                              monthly_limit: parseFloat(e.target.value)
                            })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-text-secondary">
                          Daily Limit
                        </label>
                        <div className="mt-1 flex items-center space-x-2">
                          <span className="text-text-tertiary">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.daily_limit}
                            onChange={(e) => setFormData({
                              ...formData,
                              daily_limit: parseFloat(e.target.value)
                            })}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Slider
                        label="Warning Threshold"
                        min={0}
                        max={formData.monthly_limit}
                        step={0.5}
                        value={formData.warning_threshold}
                        onChange={(e) => setFormData({
                          ...formData,
                          warning_threshold: parseFloat(e.target.value)
                        })}
                        valueLabel="$"
                      />
                      <p className="text-xs text-text-tertiary mt-1">
                        You'll receive a warning when monthly spending reaches ${formData.warning_threshold}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-secondary">Auto-stop Conversations</p>
                        <p className="text-xs text-text-tertiary">
                          Automatically stop conversations when limits are reached
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.auto_stop}
                          onChange={(e) => setFormData({
                            ...formData,
                            auto_stop: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-primary after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-400"></div>
                      </label>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setEditMode(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave}>
                        Save Changes
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-text-tertiary">Monthly Limit</p>
                      <p className="text-lg font-medium">{formatCurrency(budget?.monthly_limit || 10)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-tertiary">Daily Limit</p>
                      <p className="text-lg font-medium">{formatCurrency(budget?.daily_limit || 1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-tertiary">Warning Threshold</p>
                      <p className="text-lg font-medium">{formatCurrency(budget?.warning_threshold || 8)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-tertiary">Auto-stop</p>
                      <Badge variant={budget?.auto_stop ? 'success' : 'default'}>
                        {budget?.auto_stop ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget Utilization Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Projection</CardTitle>
                <CardDescription>Estimated spending based on current usage patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-text-secondary">Projected Monthly Spend</span>
                      <span className="font-medium">
                        {formatCurrency(
                          (budget?.current_daily_spend || 0) * 30
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-surface-tertiary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          ((budget?.current_daily_spend || 0) * 30) > (budget?.monthly_limit || 10)
                            ? 'bg-red-500'
                            : 'bg-green-600'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (((budget?.current_daily_spend || 0) * 30) / (budget?.monthly_limit || 10)) * 100
                          )}%`
                        }}
                      />
                    </div>
                  </div>

                  {((budget?.current_daily_spend || 0) * 30) > (budget?.monthly_limit || 10) && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-300">
                        At current usage rate, you'll exceed your monthly budget by{' '}
                        {formatCurrency(
                          ((budget?.current_daily_spend || 0) * 30) - (budget?.monthly_limit || 10)
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}