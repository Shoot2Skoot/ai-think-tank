import React from 'react'
import { DollarSign, TrendingUp, Users, MessageSquare, Zap, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils'
import type { CostBreakdown } from '@/types'

interface CostPopoverProps {
  cost: CostBreakdown | null
  messageCount?: number
}

export const CostPopover: React.FC<CostPopoverProps> = ({ cost, messageCount = 0 }) => {
  if (!cost) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <DollarSign className="h-4 w-4 mr-1" />
        $0.00
      </Button>
    )
  }

  const totalCost = cost.total_cost || 0
  const avgCostPerMessage = messageCount > 0 ? totalCost / messageCount : 0

  // Calculate percentage breakdown by persona
  const personaBreakdown = Object.entries(cost.by_persona || {})
    .map(([personaId, personaCost]) => ({
      id: personaId,
      cost: personaCost,
      percentage: totalCost > 0 ? (personaCost / totalCost) * 100 : 0
    }))
    .sort((a, b) => b.cost - a.cost)

  const trigger = (
    <Button variant="ghost" size="sm" className="font-mono">
      <DollarSign className="h-4 w-4 mr-1" />
      {formatCurrency(totalCost)}
    </Button>
  )

  return (
    <Popover trigger={trigger} placement="bottom" className="w-80 p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b">
          <h3 className="font-semibold text-text-primary">Cost Breakdown</h3>
          <span className="text-sm text-text-tertiary">Current Session</span>
        </div>

        {/* Total Cost */}
        <div className="bg-opacity-10 bg-primary-900 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Total Cost</span>
            <span className="text-lg font-bold text-text-primary">
              {formatCurrency(totalCost)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center text-text-tertiary">
              <MessageSquare className="h-3 w-3 mr-1" />
              {formatNumber(messageCount)} messages
            </div>
            <div className="flex items-center text-text-tertiary">
              <TrendingUp className="h-3 w-3 mr-1" />
              {formatCurrency(avgCostPerMessage)}/msg
            </div>
          </div>
        </div>

        {/* Token Usage */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text-secondary">Token Usage</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Input Tokens</span>
              <span className="font-mono">{formatNumber(cost.input_tokens || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Output Tokens</span>
              <span className="font-mono">{formatNumber(cost.output_tokens || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Cached Tokens</span>
              <span className="font-mono">{formatNumber(cost.cached_tokens || 0)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-1 border-t">
              <span className="text-text-secondary">Total Tokens</span>
              <span className="font-mono">
                {formatNumber((cost.input_tokens || 0) + (cost.output_tokens || 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Cost by Model */}
        {cost.by_model && Object.keys(cost.by_model).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-secondary">Cost by Model</h4>
            <div className="space-y-1">
              {Object.entries(cost.by_model).map(([model, modelCost]) => {
                const percentage = totalCost > 0 ? (modelCost / totalCost) * 100 : 0
                return (
                  <div key={model} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <Zap className="h-3 w-3 mr-1 text-text-tertiary" />
                      <span className="text-text-secondary truncate max-w-[150px]">{model}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-text-tertiary text-xs">
                        {formatPercentage(percentage)}
                      </span>
                      <span className="font-mono">{formatCurrency(modelCost)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Cost by Persona */}
        {personaBreakdown.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-secondary">Cost by Persona</h4>
            <div className="space-y-1">
              {personaBreakdown.slice(0, 5).map((persona) => (
                <div key={persona.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Users className="h-3 w-3 mr-1 text-text-tertiary" />
                    <span className="text-text-secondary">Persona {persona.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-text-tertiary text-xs">
                      {formatPercentage(persona.percentage)}
                    </span>
                    <span className="font-mono">{formatCurrency(persona.cost)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t text-xs text-text-tertiary">
          <div className="flex items-center">
            <Info className="h-3 w-3 mr-1" />
            Costs are estimated based on model pricing
          </div>
        </div>
      </div>
    </Popover>
  )
}