/**
 * Performance monitoring and optimization utilities
 * Tracks Core Web Vitals and implements performance best practices
 */

import React from 'react';

// Performance metrics interface
interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  renderTime?: number;
  componentLoadTime?: number;
}

interface ComponentPerfMetrics {
  name: string;
  mountTime: number;
  renderTime: number;
  unmountTime?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private componentMetrics: Map<string, ComponentPerfMetrics> = new Map();
  private observer?: PerformanceObserver;

  constructor() {
    this.initializeObserver();
    this.trackWebVitals();
  }

  private initializeObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processPerformanceEntry(entry);
          }
        });

        // Observe different types of performance entries
        this.observer.observe({ entryTypes: ['measure', 'navigation', 'paint', 'largest-contentful-paint'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported or failed to initialize:', error);
      }
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
        }
        break;
      case 'largest-contentful-paint':
        this.metrics.lcp = (entry as any).startTime;
        break;
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
        break;
    }
  }

  private trackWebVitals(): void {
    // Track First Input Delay (FID)
    if ('addEventListener' in window) {
      let firstHiddenTime = -1;
      
      const onHidden = () => {
        firstHiddenTime = performance.now();
      };

      if (document.visibilityState === 'hidden') {
        firstHiddenTime = 0;
      } else {
        document.addEventListener('visibilitychange', onHidden, { once: true });
      }

      const onFirstInput = (event: Event) => {
        const entry = event as any;
        if (entry.processingStart && entry.startTime) {
          const fid = entry.processingStart - entry.startTime;
          this.metrics.fid = fid;
        }
      };

      ['pointerdown', 'keydown', 'click'].forEach(type => {
        document.addEventListener(type, onFirstInput, { once: true, passive: true });
      });
    }

    // Track Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          this.metrics.cls = Math.max(this.metrics.cls || 0, clsValue);
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS observation failed:', error);
      }
    }
  }

  // Component performance tracking
  markComponentStart(componentName: string): void {
    const startTime = performance.now();
    this.componentMetrics.set(componentName, {
      name: componentName,
      mountTime: startTime,
      renderTime: 0
    });
  }

  markComponentEnd(componentName: string): void {
    const endTime = performance.now();
    const metrics = this.componentMetrics.get(componentName);
    if (metrics) {
      metrics.renderTime = endTime - metrics.mountTime;
      this.componentMetrics.set(componentName, metrics);
    }
  }

  markComponentUnmount(componentName: string): void {
    const unmountTime = performance.now();
    const metrics = this.componentMetrics.get(componentName);
    if (metrics) {
      metrics.unmountTime = unmountTime;
      this.componentMetrics.set(componentName, metrics);
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getComponentMetrics(): ComponentPerfMetrics[] {
    return Array.from(this.componentMetrics.values());
  }

  // Performance recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push('Large Contentful Paint is slow. Consider optimizing images and critical resources.');
    }

    if (metrics.fid && metrics.fid > 100) {
      recommendations.push('First Input Delay is high. Consider reducing JavaScript bundle size.');
    }

    if (metrics.cls && metrics.cls > 0.1) {
      recommendations.push('Cumulative Layout Shift is high. Add dimensions to images and reserve space for dynamic content.');
    }

    if (metrics.fcp && metrics.fcp > 1800) {
      recommendations.push('First Contentful Paint is slow. Consider implementing critical CSS and preloading fonts.');
    }

    return recommendations;
  }

  // Report performance data (could send to analytics)
  reportMetrics(): void {
    const metrics = this.getMetrics();
    const componentMetrics = this.getComponentMetrics();
    
    console.group('Performance Metrics');
    console.table(metrics);
    console.groupCollapsed('Component Performance');
    console.table(componentMetrics);
    console.groupEnd();
    console.groupEnd();

    // Send to analytics service (placeholder)
    if (typeof window !== 'undefined' && window.gtag) {
      Object.entries(metrics).forEach(([metric, value]) => {
        if (value !== undefined && window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric_name: metric,
            metric_value: Math.round(value),
            metric_delta: Math.round(value)
          });
        }
      });
    }
  }
}

// Resource loading optimization
export class ResourceOptimizer {
  private static preloadedResources = new Set<string>();
  private static criticalFonts = [
    '/fonts/inter-var.woff2',
    '/fonts/inter-regular.woff2'
  ];

  // Preload critical resources
  static preloadCriticalResources(): void {
    // Preload critical fonts
    this.criticalFonts.forEach(font => {
      this.preloadResource(font, 'font', 'font/woff2');
    });

    // Preload critical images
    const criticalImages = [
      '/images/logo.webp',
      '/images/hero-bg.webp'
    ];

    criticalImages.forEach(image => {
      this.preloadResource(image, 'image');
    });
  }

  // Preload a specific resource
  static preloadResource(
    href: string, 
    as: string, 
    type?: string,
    crossorigin?: string
  ): void {
    if (this.preloadedResources.has(href)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    if (type) link.type = type;
    if (crossorigin) link.crossOrigin = crossorigin;
    if (as === 'font') link.crossOrigin = 'anonymous';

    document.head.appendChild(link);
    this.preloadedResources.add(href);
  }

  // Lazy load non-critical resources
  static lazyLoadResource(href: string, as: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedResources.has(href)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      link.onload = () => {
        this.preloadedResources.add(href);
        resolve();
      };
      link.onerror = reject;

      document.head.appendChild(link);
    });
  }

  // Prefetch resources for next navigation
  static prefetchResource(href: string): void {
    if (this.preloadedResources.has(href)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    
    document.head.appendChild(link);
    this.preloadedResources.add(href);
  }
}

// React component performance wrapper
export function withPerformanceTracking<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  componentName?: string
): React.ComponentType<T> {
  const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown';
  
  return function PerformanceTrackedComponent(props: T) {
    const monitor = performanceMonitor;
    
    React.useEffect(() => {
      monitor.markComponentStart(name);
      
      // Use setTimeout to measure after render
      setTimeout(() => {
        monitor.markComponentEnd(name);
      }, 0);

      return () => {
        monitor.markComponentUnmount(name);
      };
    }, []);

    return React.createElement(WrappedComponent, props);
  };
}

// Mobile-specific optimizations
export class MobileOptimizer {
  private static isInitialized = false;

  static initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Disable hover effects on touch devices
    if ('ontouchstart' in window) {
      document.documentElement.classList.add('touch-device');
    }

    // Optimize viewport for mobile
    this.optimizeViewport();
    
    // Reduce motion for users who prefer it
    this.respectMotionPreferences();
    
    // Optimize touch interactions
    this.optimizeTouchInteractions();

    this.isInitialized = true;
  }

  private static optimizeViewport(): void {
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }

    viewportMeta.content = 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover';
  }

  private static respectMotionPreferences(): void {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches) {
      document.documentElement.classList.add('reduce-motion');
    }

    prefersReducedMotion.addEventListener('change', (e) => {
      if (e.matches) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
    });
  }

  private static optimizeTouchInteractions(): void {
    // Prevent 300ms click delay on mobile
    document.addEventListener('touchstart', () => {}, { passive: true });
    
    // Improve scroll performance
    document.addEventListener('touchmove', () => {}, { passive: true });
    
    // Add touch-action CSS for better touch handling
    const style = document.createElement('style');
    style.textContent = `
      .touch-action-none { touch-action: none; }
      .touch-action-pan-x { touch-action: pan-x; }
      .touch-action-pan-y { touch-action: pan-y; }
      .touch-action-manipulation { touch-action: manipulation; }
    `;
    document.head.appendChild(style);
  }

  // Check if device is mobile
  static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Get device pixel ratio for high-DPI displays
  static getPixelRatio(): number {
    return window.devicePixelRatio || 1;
  }

  // Check connection quality
  static getConnectionQuality(): 'slow' | 'fast' | 'unknown' {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (!connection) return 'unknown';
    
    if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
      return 'slow';
    }
    
    return 'fast';
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Initialize mobile optimizations
if (typeof window !== 'undefined') {
  MobileOptimizer.initialize();
  ResourceOptimizer.preloadCriticalResources();
}

// Export performance tracking hook
export function usePerformanceTracking(componentName: string) {
  React.useEffect(() => {
    performanceMonitor.markComponentStart(componentName);
    
    const timer = setTimeout(() => {
      performanceMonitor.markComponentEnd(componentName);
    }, 0);

    return () => {
      clearTimeout(timer);
      performanceMonitor.markComponentUnmount(componentName);
    };
  }, [componentName]);
}

// Type augmentation for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}