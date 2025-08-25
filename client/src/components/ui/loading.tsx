import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
)
Skeleton.displayName = "Skeleton"

interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {}

const Shimmer = React.forwardRef<HTMLDivElement, ShimmerProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden bg-muted rounded-md",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
      {...props}
    />
  )
)
Shimmer.displayName = "Shimmer"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'orange' | 'blue'
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = 'md', variant = 'orange', ...props }, ref) => {
    const sizes = {
      sm: 'h-4 w-4 border-2',
      md: 'h-8 w-8 border-2',
      lg: 'h-12 w-12 border-4'
    }
    
    const variants = {
      default: 'border-muted border-t-foreground',
      orange: 'border-orange-200 border-t-orange-500',
      blue: 'border-blue-200 border-t-blue-500'
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full",
          sizes[size],
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

export { Skeleton, Shimmer, LoadingSpinner }