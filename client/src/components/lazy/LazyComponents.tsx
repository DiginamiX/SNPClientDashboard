/**
 * Lazy-loaded components for improved initial load performance
 * Implements code splitting at the component level
 */

import React, { Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePerformanceTracking } from '@/lib/performance';

// Loading fallback components
interface LoadingFallbackProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingFallback({ 
  className, 
  size = 'md', 
  text = 'Loading...' 
}: LoadingFallbackProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={cn(
      'flex items-center justify-center p-4',
      className
    )}>
      <div className="flex items-center space-x-2">
        <Loader2 className={cn('animate-spin', sizeClasses[size])} />
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

export function CardLoadingFallback({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse space-y-4 p-6 bg-card rounded-lg border', className)}>
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded"></div>
        <div className="h-3 bg-muted rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function PageLoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <CardLoadingFallback key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Higher-order component for lazy loading with performance tracking
export function withLazyLoading<T extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  componentName: string,
  fallback?: React.ReactNode
): React.FC<T> {
  const LazyComponent = React.lazy(importFn);

  return function LazyLoadedComponent(props: T) {
    usePerformanceTracking(`LazyLoaded${componentName}`);

    return (
      <Suspense fallback={fallback || <LoadingFallback text={`Loading ${componentName}...`} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Lazy-loaded page components
export const LazyDashboard = withLazyLoading(
  () => import('@/pages/Dashboard'),
  'Dashboard',
  <PageLoadingFallback />
);

export const LazyWeightTracking = withLazyLoading(
  () => import('@/pages/WeightTracking'),
  'WeightTracking',
  <PageLoadingFallback />
);

export const LazyProgressPhotos = withLazyLoading(
  () => import('@/pages/ProgressPhotos'),
  'ProgressPhotos',
  <PageLoadingFallback />
);

export const LazyMessages = withLazyLoading(
  () => import('@/pages/Messages'),
  'Messages',
  <PageLoadingFallback />
);

export const LazyMealPlans = withLazyLoading(
  () => import('@/pages/MealPlans'),
  'MealPlans',
  <PageLoadingFallback />
);

export const LazySettings = withLazyLoading(
  () => import('@/pages/Settings'),
  'Settings',
  <PageLoadingFallback />
);

export const LazyCheckins = withLazyLoading(
  () => import('@/pages/Checkins'),
  'Checkins',
  <PageLoadingFallback />
);

// Coach-specific lazy components
export const LazyCoachDashboard = withLazyLoading(
  () => import('@/pages/coach/Dashboard'),
  'CoachDashboard',
  <PageLoadingFallback />
);

export const LazyCoachClients = withLazyLoading(
  () => import('@/pages/coach/Clients'),
  'CoachClients',
  <PageLoadingFallback />
);

export const LazyCoachWorkouts = withLazyLoading(
  () => import('@/pages/coach/Workouts'),
  'CoachWorkouts',
  <PageLoadingFallback />
);

// Client workout components
export const LazyWorkoutExecution = withLazyLoading(
  () => import('@/pages/client/WorkoutExecution'),
  'WorkoutExecution',
  <PageLoadingFallback />
);

export const LazyMyWorkouts = withLazyLoading(
  () => import('@/pages/client/MyWorkouts'),
  'MyWorkouts',
  <PageLoadingFallback />
);

// Heavy UI components - commented out until properly exported
// export const LazyEnhancedProgressPhotos = withLazyLoading(
//   () => import('@/components/enhanced/EnhancedProgressPhotos').then(module => ({ default: module.EnhancedProgressPhotos })),
//   'EnhancedProgressPhotos',
//   <CardLoadingFallback />
// );

// Chart components (typically heavy) - placeholder for future implementation
// export const LazyWeightChart = withLazyLoading(
//   () => import('@/components/charts/WeightChart'),
//   'WeightChart',
//   <div className="h-64 bg-muted animate-pulse rounded-lg" />
// );

// export const LazyProgressChart = withLazyLoading(
//   () => import('@/components/charts/ProgressChart'),
//   'ProgressChart',
//   <div className="h-64 bg-muted animate-pulse rounded-lg" />
// );

// Auth components
export const LazyLogin = withLazyLoading(
  () => import('@/pages/Login'),
  'Login',
  <LoadingFallback text="Loading login..." />
);

export const LazyRegister = withLazyLoading(
  () => import('@/pages/Register'),
  'Register',
  <LoadingFallback text="Loading registration..." />
);

export const LazyForgotPassword = withLazyLoading(
  () => import('@/pages/ForgotPassword'),
  'ForgotPassword',
  <LoadingFallback text="Loading..." />
);

export const LazyEmailConfirmation = withLazyLoading(
  () => import('@/pages/EmailConfirmation'),
  'EmailConfirmation',
  <LoadingFallback text="Loading..." />
);

// Conditional lazy loading based on device capabilities
export function ConditionalLazyLoad<T extends Record<string, unknown>>({
  desktopComponent,
  mobileComponent,
  fallback,
  componentProps
}: {
  desktopComponent: ComponentType<T>;
  mobileComponent: ComponentType<T>;
  fallback?: React.ReactNode;
  componentProps: T;
}) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const Component = isMobile ? mobileComponent : desktopComponent;

  return (
    <Suspense fallback={fallback || <LoadingFallback />}>
      <Component {...componentProps} />
    </Suspense>
  );
}

// Dynamic import helper for runtime code splitting
export class DynamicImporter {
  private static cache = new Map<string, Promise<any>>();

  static async importComponent<T = any>(
    importPath: string,
    importFn: () => Promise<T>
  ): Promise<T> {
    if (this.cache.has(importPath)) {
      return this.cache.get(importPath)!;
    }

    const promise = importFn();
    this.cache.set(importPath, promise);
    return promise;
  }

  static async preloadComponent(
    importPath: string,
    importFn: () => Promise<any>
  ): Promise<void> {
    if (!this.cache.has(importPath)) {
      this.cache.set(importPath, importFn());
    }
  }

  static clearCache(): void {
    this.cache.clear();
  }
}

// Route-based preloading
export class RoutePreloader {
  private static preloadedRoutes = new Set<string>();

  static preloadRoute(routePath: string): void {
    if (this.preloadedRoutes.has(routePath)) return;

    // Define route to component mapping
    const routeComponentMap: Record<string, () => Promise<any>> = {
      '/dashboard': () => import('@/pages/Dashboard'),
      '/weight-tracking': () => import('@/pages/WeightTracking'),
      '/progress-photos': () => import('@/pages/ProgressPhotos'),
      '/messages': () => import('@/pages/Messages'),
      '/meal-plans': () => import('@/pages/MealPlans'),
      '/settings': () => import('@/pages/Settings'),
      '/checkins': () => import('@/pages/Checkins'),
      '/coach': () => import('@/pages/coach/Dashboard'),
      '/coach/clients': () => import('@/pages/coach/Clients'),
      '/coach/workouts': () => import('@/pages/coach/Workouts'),
    };

    const importFn = routeComponentMap[routePath];
    if (importFn) {
      DynamicImporter.preloadComponent(routePath, importFn);
      this.preloadedRoutes.add(routePath);
    }
  }

  static preloadUserFlow(userRole: 'client' | 'admin'): void {
    const flows = {
      client: ['/dashboard', '/weight-tracking', '/progress-photos', '/messages'],
      admin: ['/coach', '/coach/clients', '/coach/workouts', '/messages']
    };

    flows[userRole].forEach(route => this.preloadRoute(route));
  }
}

// Intersection Observer for component preloading
export function useIntersectionPreloader(
  ref: React.RefObject<HTMLElement>,
  routesToPreload: string[]
) {
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            routesToPreload.forEach(route => RoutePreloader.preloadRoute(route));
            observer.unobserve(element);
          }
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, routesToPreload]);
}