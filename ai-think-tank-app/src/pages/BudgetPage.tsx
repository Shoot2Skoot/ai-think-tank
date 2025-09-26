import React, { useEffect, useState } from 'react'
import { DollarSign, AlertCircle, TrendingUp, Calendar } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Slider } from '@/components/ui/Slider'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/auth-store'
import { useBudgetStore, getRemainingBudget } from '@/stores/budget-store'
import { formatCurrency, formatPercentage } from '@/lib/utils'

export const BudgetPage: React.FC = () => {
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

  const handleSave = async () => {
    await updateBudget(formData)
    setEditMode(false)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and control your AI conversation spending
          </p>
        </div>

        {/* Budget Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Card key={alert.id} className="border-yellow-200 bg-yellow-50">
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

        {/* Current Usage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Today's Spending</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(budget?.current_daily_spend || 0)} / {formatCurrency(budget?.daily_limit || 1)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, remainingBudget?.dailyPercentage || 0)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(remainingBudget?.daily || 0)} remaining
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(budget?.current_monthly_spend || 0)} / {formatCurrency(budget?.monthly_limit || 10)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (remainingBudget?.monthlyPercentage || 0) > 80 ? 'bg-yellow-500' : 'bg-green-600'
                    }`}
                    style={{
                      width: `${Math.min(100, remainingBudget?.monthlyPercentage || 0)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(remainingBudget?.monthly || 0)} remaining • Resets on day {budget?.reset_day}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Settings */}
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
                    <label className="text-sm font-medium text-gray-700">
                      Monthly Limit
                    </label>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-gray-500">$</span>
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
                    <label className="text-sm font-medium text-gray-700">
                      Daily Limit
                    </label>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-gray-500">$</span>
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
                  <p className="text-xs text-gray-500 mt-1">
                    You'll receive a warning when monthly spending reaches ${formData.warning_threshold}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Auto-stop Conversations</p>
                    <p className="text-xs text-gray-500">
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
                  <p className="text-sm text-gray-500">Monthly Limit</p>
                  <p className="text-lg font-medium">{formatCurrency(budget?.monthly_limit || 10)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Daily Limit</p>
                  <p className="text-lg font-medium">{formatCurrency(budget?.daily_limit || 1)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Warning Threshold</p>
                  <p className="text-lg font-medium">{formatCurrency(budget?.warning_threshold || 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Auto-stop</p>
                  <Badge variant={budget?.auto_stop ? 'success' : 'default'}>
                    {budget?.auto_stop ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}