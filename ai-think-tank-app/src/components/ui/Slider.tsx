import React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  showValue?: boolean
  valueLabel?: string
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, showValue = true, valueLabel, min = 0, max = 100, value, ...props }, ref) => {
    const percentage = ((Number(value) - Number(min)) / (Number(max) - Number(min))) * 100

    return (
      <div className="w-full">
        {label && (
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-text-primary">
              {label}
            </label>
            {showValue && (
              <span className="text-sm text-text-secondary">
                {value}{valueLabel ? ` ${valueLabel}` : ''}
              </span>
            )}
          </div>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            value={value}
            className={cn(
              'w-full h-2 rounded-lg appearance-none cursor-pointer slider bg-surface-tertiary',
              className
            )}
            style={{
              background: `linear-gradient(to right, var(--color-primary-400) 0%, var(--color-primary-400) ${percentage}%, var(--color-surface-tertiary) ${percentage}%, var(--color-surface-tertiary) 100%)`
            }}
            {...props}
          />
        </div>
      </div>
    )
  }
)

Slider.displayName = 'Slider'