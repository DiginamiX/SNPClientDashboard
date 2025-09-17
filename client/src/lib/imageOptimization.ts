/**
 * Advanced Image Optimization Utilities
 * Provides WebP conversion, compression, responsive images, and lazy loading
 */

export interface OptimizedImageOptions {
  quality?: number; // 0-1
  format?: 'webp' | 'jpeg' | 'png';
  maxWidth?: number;
  maxHeight?: number;
  sizes?: string; // responsive sizes attribute
  blur?: boolean; // low quality placeholder
}

export interface ResponsiveImageSources {
  webp?: string;
  original?: string;
  placeholder?: string;
  srcSet?: string;
}

/**
 * Convert and optimize images to WebP format with fallbacks
 */
export class ImageOptimizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Compress and convert image to optimal format
   */
  async optimizeImage(
    file: File, 
    options: OptimizedImageOptions = {}
  ): Promise<{ optimized: File; placeholder?: string }> {
    const {
      quality = 0.85,
      format = 'webp',
      maxWidth = 1920,
      maxHeight = 1080,
      blur = true
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate optimized dimensions
          const { width, height } = this.calculateOptimalSize(
            img.width, 
            img.height, 
            maxWidth, 
            maxHeight
          );

          // Set canvas size
          this.canvas.width = width;
          this.canvas.height = height;

          // Draw and compress image
          this.ctx.drawImage(img, 0, 0, width, height);
          
          // Create optimized version
          this.canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to optimize image'));
                return;
              }

              const optimizedFile = new File(
                [blob], 
                this.getOptimizedFileName(file.name, format),
                { type: `image/${format}` }
              );

              // Create placeholder if requested
              let placeholder: string | undefined;
              if (blur) {
                placeholder = this.createPlaceholder(img, 20, 20);
              }

              resolve({ optimized: optimizedFile, placeholder });
            },
            `image/${format}`,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate responsive image sources for different screen sizes
   */
  async generateResponsiveSources(
    file: File,
    breakpoints: number[] = [640, 768, 1024, 1280, 1920]
  ): Promise<ResponsiveImageSources> {
    const sources: ResponsiveImageSources = {};
    
    // Generate WebP versions for each breakpoint
    const webpSources: string[] = [];
    const jpegSources: string[] = [];

    for (const width of breakpoints) {
      const webpOptimized = await this.optimizeImage(file, {
        format: 'webp',
        maxWidth: width,
        quality: 0.85
      });
      
      const jpegOptimized = await this.optimizeImage(file, {
        format: 'jpeg',
        maxWidth: width,
        quality: 0.8
      });

      const webpUrl = URL.createObjectURL(webpOptimized.optimized);
      const jpegUrl = URL.createObjectURL(jpegOptimized.optimized);

      webpSources.push(`${webpUrl} ${width}w`);
      jpegSources.push(`${jpegUrl} ${width}w`);
    }

    sources.webp = webpSources.join(', ');
    sources.srcSet = jpegSources.join(', ');
    
    return sources;
  }

  /**
   * Create low-quality placeholder for lazy loading
   */
  private createPlaceholder(img: HTMLImageElement, width: number, height: number): string {
    const smallCanvas = document.createElement('canvas');
    const smallCtx = smallCanvas.getContext('2d')!;
    
    smallCanvas.width = width;
    smallCanvas.height = height;
    
    // Apply blur filter
    smallCtx.filter = 'blur(5px)';
    smallCtx.drawImage(img, 0, 0, width, height);
    
    return smallCanvas.toDataURL('image/jpeg', 0.1);
  }

  /**
   * Calculate optimal image dimensions maintaining aspect ratio
   */
  private calculateOptimalSize(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { 
      width: Math.round(width), 
      height: Math.round(height) 
    };
  }

  /**
   * Generate optimized filename
   */
  private getOptimizedFileName(originalName: string, format: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}_optimized.${format}`;
  }

  /**
   * Check WebP support
   */
  static supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => resolve(webP.height === 2);
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * Cleanup blob URLs to prevent memory leaks
   */
  static cleanup(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Intersection Observer for lazy loading
 */
export class LazyLoadObserver {
  private observer: IntersectionObserver;
  private static instance: LazyLoadObserver;

  private constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLImageElement;
            this.loadImage(element);
            this.observer.unobserve(element);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );
  }

  static getInstance(): LazyLoadObserver {
    if (!LazyLoadObserver.instance) {
      LazyLoadObserver.instance = new LazyLoadObserver();
    }
    return LazyLoadObserver.instance;
  }

  observe(element: HTMLImageElement): void {
    this.observer.observe(element);
  }

  private loadImage(img: HTMLImageElement): void {
    const dataSrc = img.getAttribute('data-src');
    const dataSrcSet = img.getAttribute('data-srcset');
    const dataFallback = img.getAttribute('data-fallback');
    
    if (dataSrc) {
      // Set up real load/error handlers before setting src
      const handleLoad = () => {
        img.classList.add('loaded');
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
        // Dispatch custom event for the component
        img.dispatchEvent(new CustomEvent('lazyloaded'));
      };

      const handleError = () => {
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
        
        // Try fallback if available
        if (dataFallback && img.src !== dataFallback) {
          img.src = dataFallback;
          img.addEventListener('load', handleLoad);
          img.addEventListener('error', () => {
            img.dispatchEvent(new CustomEvent('lazyerror'));
          }, { once: true });
        } else {
          // Dispatch custom error event for the component
          img.dispatchEvent(new CustomEvent('lazyerror'));
        }
      };

      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);

      // Set src and srcset to trigger loading
      img.src = dataSrc;
      img.removeAttribute('data-src');
      
      if (dataSrcSet) {
        img.srcset = dataSrcSet;
        img.removeAttribute('data-srcset');
      }
      
      if (dataFallback) {
        img.removeAttribute('data-fallback');
      }
    }
  }

  disconnect(): void {
    this.observer.disconnect();
  }
}

/**
 * Performance-optimized image preloader
 */
export class ImagePreloader {
  private static cache = new Map<string, Promise<HTMLImageElement>>();

  static preload(src: string): Promise<HTMLImageElement> {
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    this.cache.set(src, promise);
    return promise;
  }

  static preloadMultiple(urls: string[]): Promise<HTMLImageElement[]> {
    return Promise.all(urls.map(url => this.preload(url)));
  }

  static clearCache(): void {
    this.cache.clear();
  }
}

// Export the singleton instance
export const imageOptimizer = new ImageOptimizer();
export const lazyLoadObserver = LazyLoadObserver.getInstance();