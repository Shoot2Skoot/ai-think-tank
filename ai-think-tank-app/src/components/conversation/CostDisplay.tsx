import React from 'react'
import { DollarSign, TrendingUp, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils'
import type { CostBreakdown } from '@/types'

interface CostDisplayProps {
  cost: CostBreakdown | null
  compact?: boolean
}

export const CostDisplay: React.FC<CostDisplayProps> = ({ cost, compact = false }) => {
  if (!cost) {
    return (
      <Badge variant="default" className="bg-surface-secondary">
        <DollarSign className="h-3 w-3 mr-1" />
        $0.00
      </Badge>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="default" className="bg-green-100 text-green-800">
          <DollarSign className="h-3 w-3 mr-1" />
          {formatCurrency(cost.total)}
        </Badge>
        {cost.cache_savings > 0 && (
          <Badge variant="success" className="bg-primary-900 bg-opacity-20 text-primary-400">
            <Zap className="h-3 w-3 mr-1" />
            Saved {formatCurrency(cost.cache_savings)}
          </Badge>
        )}
      </div>
    )
  }

  // Calculate percentage breakdown
  const inputPercentage = cost.total > 0 ? (cost.input_cost / cost.total) * 100 : 0
  const outputPercentage = cost.total > 0 ? (cost.output_cost / cost.total) * 100 : 0

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Total Cost */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-text-tertiary" />
              <span className="font-medium">Total Cost</span>
            </div>
            <span className="text-2xl font-bold text-text-primary">
              {formatCurrency(cost.total)}
            </span>
          </div>

          {/* Cost Breakdown Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Input ({formatPercentage(inputPercentage)})</span>
              <span>Output ({formatPercentage(outputPercentage)})</span>
            </div>
            <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500 transition-all"
                style={{ width: `${inputPercentage}%` }}
              />
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${outputPercentage}%` }}
              />
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-tertiary">Input Cost</p>
              <p className="font-medium">{formatCurrency(cost.input_cost)}</p>
            </div>
            <div>
              <p className="text-text-tertiary">Output Cost</p>
              <p className="font-medium">{formatCurrency(cost.output_cost)}</p>
            </div>
          </div>

          {/* Cache Savings */}
          {cost.cache_savings > 0 && (
            <div className="flex items-center justify-between p-2 bg-primary-900 bg-opacity-20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-primary-400" />
                <span className="text-sm text-primary-400">Cache Savings</span>
              </div>
              <span className="text-sm font-medium text-primary-400">
                {formatCurrency(cost.cache_savings)}
              </span>
            </div>
          )}

          {/* Provider Breakdown */}
          {Object.keys(cost.byProvider).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">By Provider</p>
              <div className="space-y-1">
                {Object.entries(cost.byProvider).map(([provider, amount]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <Badge size="sm" variant="default">
                      {provider}
                    </Badge>
                    <span className="text-sm text-text-secondary">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Persona Breakdown (if more than 1) */}
          {Object.keys(cost.byPersona).length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">By Persona</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(cost.byPersona)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([personaId, amount]) => (
                    <div key={personaId} className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary truncate">
                        Persona {personaId.slice(0, 8)}...
                      </span>
                      <span className="text-sm text-text-secondary">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}