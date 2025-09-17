/**
 * Optimized Image Components with lazy loading, responsive images, and WebP support
 */

import { useState, useRef, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { lazyLoadObserver, ImagePreloader } from '@/lib/imageOptimization';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  lazy?: boolean;
  responsive?: boolean;
  placeholder?: string;
  fallback?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * High-performance image component with lazy loading and WebP support
 */
export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    src,
    alt,
    lazy = true,
    responsive = true,
    placeholder,
    fallback,
    sizes,
    priority = false,
    className,
    onLoad,
    onError,
    ...props
  }, ref) => {
    const [isLoaded, setIsLoaded] = useState(!lazy || priority);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(lazy && !priority ? (placeholder || '') : src);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      const img = imgRef.current;
      if (!img) return;

      // Priority images should load immediately
      if (priority) {
        ImagePreloader.preload(src).then(() => {
          setCurrentSrc(src);
          setIsLoaded(true);
          onLoad?.();
        }).catch(() => {
          setHasError(true);
          if (fallback) {
            setCurrentSrc(fallback);
          }
          onError?.();
        });
        return;
      }

      // Lazy loading setup
      if (lazy && !isLoaded) {
        const observer = lazyLoadObserver;
        
        // Set up data attributes for lazy loading
        img.setAttribute('data-src', src);
        if (fallback) {
          img.setAttribute('data-fallback', fallback);
        }
        
        // Only add srcset for supported image services
        const srcSet = generateSrcSet(src);
        if (srcSet) {
          img.setAttribute('data-srcset', srcSet);
        }

        // Set up custom event listeners for when the observer loads the image
        const handleLazyLoad = () => {
          setIsLoaded(true);
          setCurrentSrc(src);
          onLoad?.();
        };

        const handleLazyError = () => {
          setHasError(true);
          const fallbackSrc = img.getAttribute('data-fallback');
          if (fallbackSrc) {
            setCurrentSrc(fallbackSrc);
          }
          onError?.();
        };

        // Add custom event listeners that will be triggered by the observer
        img.addEventListener('lazyloaded', handleLazyLoad);
        img.addEventListener('lazyerror', handleLazyError);

        observer.observe(img);

        return () => {
          img.removeEventListener('lazyloaded', handleLazyLoad);
          img.removeEventListener('lazyerror', handleLazyError);
          observer.unobserve(img);
        };
      }
    }, [src, lazy, priority, fallback, responsive, sizes, isLoaded, onLoad, onError]);

    return (
      <img
        ref={(node) => {
          (imgRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLImageElement | null>).current = node;
          }
        }}
        src={currentSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          {
            'opacity-0': lazy && !isLoaded && !hasError,
            'opacity-100': isLoaded || hasError || !lazy,
            'blur-sm': lazy && !isLoaded && placeholder,
            'loaded': isLoaded
          },
          className
        )}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        sizes={responsive ? sizes : undefined}
        {...props}
      />
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

/**
 * Helper function to detect if a URL is from an image processing service that supports parameters
 */
function supportsResponsiveParams(src: string): boolean {
  // Check for common image CDN patterns
  const cdnPatterns = [
    /cloudinary\.com/,
    /imagekit\.io/,
    /images\.unsplash\.com/,
    /res\.cloudinary\.com/
  ];
  return cdnPatterns.some(pattern => pattern.test(src));
}

/**
 * Generate responsive URL parameters for supported services
 */
function generateResponsiveUrl(src: string, width: number): string {
  // For Unsplash images, add width parameter
  if (src.includes('images.unsplash.com')) {
    const url = new URL(src);
    url.searchParams.set('w', width.toString());
    return url.toString();
  }
  
  // For other CDNs, implement as needed
  // For now, return original URL for non-CDN images
  return src;
}

/**
 * Generate responsive srcSet only for supported image services
 */
function generateSrcSet(src: string): string | undefined {
  if (!supportsResponsiveParams(src)) {
    return undefined;
  }
  
  const breakpoints = [640, 768, 1024, 1280, 1920];
  return breakpoints
    .map(width => `${generateResponsiveUrl(src, width)} ${width}w`)
    .join(', ');
}

/**
 * Progressive Image Loading with blur-up effect
 */
interface ProgressiveImageProps extends OptimizedImageProps {
  lowQualitySrc?: string;
  blurAmount?: number;
}

export const ProgressiveImage = forwardRef<HTMLImageElement, ProgressiveImageProps>(
  ({
    src,
    lowQualitySrc,
    blurAmount = 5,
    className,
    ...props
  }, ref) => {
    const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);

    useEffect(() => {
      const img = new Image();
      img.onload = () => setIsHighQualityLoaded(true);
      img.src = src;
    }, [src]);

    return (
      <div className="relative overflow-hidden">
        {/* Low quality placeholder */}
        {lowQualitySrc && !isHighQualityLoaded && (
          <OptimizedImage
            src={lowQualitySrc}
            alt={props.alt}
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
              `blur-[${blurAmount}px]`,
              isHighQualityLoaded ? 'opacity-0' : 'opacity-100'
            )}
            priority
            lazy={false}
          />
        )}
        
        {/* High quality image */}
        <OptimizedImage
          ref={ref}
          src={src}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-500',
            isHighQualityLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={() => setIsHighQualityLoaded(true)}
          {...props}
        />
      </div>
    );
  }
);

ProgressiveImage.displayName = 'ProgressiveImage';

/**
 * Avatar component with optimized loading
 */
interface OptimizedAvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  initials?: string;
  className?: string;
}

export function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  fallback,
  initials,
  className
}: OptimizedAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-lg'
  };

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold',
          sizeClasses[size],
          className
        )}
      >
        {initials || alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fallback={fallback}
      className={cn(
        'rounded-full object-cover',
        sizeClasses[size],
        className
      )}
      onError={() => setHasError(true)}
      priority
      lazy={false}
    />
  );
}

/**
 * Gallery component with optimized lazy loading
 */
interface OptimizedGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    placeholder?: string;
  }>;
  columns?: number;
  gap?: string;
  className?: string;
  onImageClick?: (index: number) => void;
}

export function OptimizedGallery({
  images,
  columns = 3,
  gap = '1rem',
  className,
  onImageClick
}: OptimizedGalleryProps) {
  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap
      }}
    >
      {images.map((image, index) => (
        <div
          key={index}
          className="relative aspect-square cursor-pointer group"
          onClick={() => onImageClick?.(index)}
        >
          <ProgressiveImage
            src={image.src}
            alt={image.alt}
            lowQualitySrc={image.placeholder}
            className="w-full h-full rounded-lg group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 rounded-lg" />
        </div>
      ))}
    </div>
  );
}