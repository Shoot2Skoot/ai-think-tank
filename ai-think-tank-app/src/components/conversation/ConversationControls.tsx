import React, { useState } from 'react'
import { Play, Pause, Zap, Hand, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { Popover } from '@/components/ui/Popover'
import { Toggle } from '@/components/ui/Toggle'
import type { Conversation } from '@/types'

interface ConversationControlsProps {
  conversation: Conversation
  isAutoRunning: boolean
  onToggleAutoRun: () => void
  onModeChange: (mode: 'auto' | 'manual') => void
  onSpeedChange: (speed: number) => void
}

export const ConversationControls: React.FC<ConversationControlsProps> = ({
  conversation,
  isAutoRunning,
  onToggleAutoRun,
  onModeChange,
  onSpeedChange
}) => {
  const [showSpeedControl, setShowSpeedControl] = useState(false)
  const isAuto = conversation.mode === 'auto'

  const speedToDelay = (speed: number) => {
    // Convert speed (1-10) to delay in seconds
    // Speed 1 = 10s, Speed 10 = 1s
    return `${11 - speed}s`
  }

  const speedLabels: Record<number, string> = {
    1: 'Very Slow',
    3: 'Slow',
    5: 'Normal',
    7: 'Fast',
    10: 'Very Fast'
  }

  const SpeedControl = (
    <div className="p-3 w-64">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Response Speed</span>
        <span className="text-xs text-text-tertiary">
          {speedToDelay(conversation.speed || 5)} delay
        </span>
      </div>
      <Slider
        value={conversation.speed || 5}
        min={1}
        max={10}
        step={1}
        onChange={onSpeedChange}
        className="mb-2"
      />
      <div className="flex justify-between text-xs text-text-tertiary">
        <span>Slow</span>
        <span>{speedLabels[conversation.speed || 5] || 'Normal'}</span>
        <span>Fast</span>
      </div>
    </div>
  )

  return (
    <div className="flex items-center space-x-2 px-3 py-2 border-t border-surface-border bg-surface-secondary">
      {/* Mode Toggle */}
      <div className="flex items-center bg-surface-primary rounded-lg p-1">
        <Button
          variant={isAuto ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('auto')}
          className="px-3 py-1"
        >
          <Zap className="h-3 w-3 mr-1" />
          Auto
        </Button>
        <Button
          variant={!isAuto ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('manual')}
          className="px-3 py-1"
        >
          <Hand className="h-3 w-3 mr-1" />
          Manual
        </Button>
      </div>

      {/* Auto Mode Controls */}
      {isAuto && (
        <>
          {/* Play/Pause Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAutoRun}
            className="px-3"
          >
            {isAutoRunning ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Resume
              </>
            )}
          </Button>

          {/* Speed Control */}
          <Popover
            trigger={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSpeedControl(!showSpeedControl)}
              >
                <Gauge className="h-4 w-4 mr-1" />
                Speed: {conversation.speed || 5}
              </Button>
            }
            content={SpeedControl}
            open={showSpeedControl}
            onClose={() => setShowSpeedControl(false)}
          />
        </>
      )}

      {/* Status Indicator */}
      <div className="flex-1 flex items-center justify-end">
        {isAuto && (
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isAutoRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-text-secondary">
              {isAutoRunning ? 'Auto-responding' : 'Paused'}
            </span>
          </div>
        )}
        {!isAuto && (
          <span className="text-sm text-text-secondary">
            Manual mode - Select personas to respond
          </span>
        )}
      </div>
    </div>
  )
}