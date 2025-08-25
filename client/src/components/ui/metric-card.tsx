import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  change?: {
    value: string
    type: 'increase' | 'decrease' | 'neutral'
  }
  trend?: number[]
  icon?: React.ReactNode
  variant?: 'default' | 'premium' | 'gradient-orange' | 'gradient-blue'
  className?: string
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, unit, change, trend, icon, variant = 'premium', className, ...props }, ref) => {
    const changeColors = {
      increase: 'text-green-500 bg-green-50 dark:bg-green-950/20',
      decrease: 'text-red-500 bg-red-50 dark:bg-red-950/20',
      neutral: 'text-gray-500 bg-gray-50 dark:bg-gray-950/20'
    }

    return (
      <Card ref={ref} variant={variant} className={cn("relative overflow-hidden", className)} {...props}>
        <CardContent className="p-6">
          {/* Header with title and icon */}
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn(
              "text-sm font-medium",
              variant?.includes('gradient') ? 'text-white/80' : 'text-muted-foreground'
            )}>
              {title}
            </h3>
            {icon && (
              <div className={cn(
                "p-2 rounded-lg",
                variant?.includes('gradient') ? 'bg-white/10' : 'bg-primary/10'
              )}>
                {icon}
              </div>
            )}
          </div>

          {/* Main value */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className={cn(
              "text-3xl font-display font-bold",
              variant?.includes('gradient') ? 'text-white' : 'text-foreground'
            )}>
              {value}
            </span>
            {unit && (
              <span className={cn(
                "text-lg font-medium",
                variant?.includes('gradient') ? 'text-white/70' : 'text-muted-foreground'
              )}>
                {unit}
              </span>
            )}
          </div>

          {/* Change indicator */}
          {change && (
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                variant?.includes('gradient') 
                  ? 'bg-white/10 text-white' 
                  : changeColors[change.type]
              )}>
                {change.type === 'increase' && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {change.type === 'decrease' && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {change.value}
              </div>
            </div>
          )}

          {/* Mini trend chart */}
          {trend && trend.length > 0 && (
            <div className="mt-4 h-8 flex items-end justify-between gap-1">
              {trend.map((point, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-full rounded-t-sm transition-all duration-200",
                    variant?.includes('gradient') ? 'bg-white/30' : 'bg-primary/30'
                  )}
                  style={{
                    height: `${(point / Math.max(...trend)) * 100}%`,
                    minHeight: '2px'
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)
MetricCard.displayName = "MetricCard"

export { MetricCard }