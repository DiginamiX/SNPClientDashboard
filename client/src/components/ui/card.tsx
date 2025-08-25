import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'premium' | 'gradient-orange' | 'gradient-blue' | 'glass'
    hover?: boolean
  }
>(({ className, variant = 'default', hover = true, ...props }, ref) => {
  const variants = {
    default: "rounded-lg border bg-card text-card-foreground shadow-sm",
    premium: "card-premium",
    'gradient-orange': "card-gradient-orange text-white rounded-lg shadow-card border-0",
    'gradient-blue': "card-gradient-blue text-white rounded-lg shadow-card border-0", 
    glass: "glass dark:glass-dark rounded-lg text-card-foreground"
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        variants[variant],
        hover && "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover",
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    gradient?: boolean
  }
>(({ className, gradient = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "font-display text-2xl font-semibold leading-none tracking-tight",
      gradient && "text-gradient-orange",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
