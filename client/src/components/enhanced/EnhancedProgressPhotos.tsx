/**
 * Enhanced Progress Photos with mobile-first design, touch gestures, and optimization
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar, Camera, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OptimizedImage, ProgressiveImage, OptimizedGallery } from '@/components/ui/optimized-image';
import { imageOptimizer, ImagePreloader } from '@/lib/imageOptimization';

interface ProgressPhoto {
  id: number;
  imageUrl: string;
  date: string;
  category?: string;
  notes?: string;
}

interface TouchGestureState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
}

interface EnhancedProgressPhotosProps {
  photos: ProgressPhoto[];
  onUpload?: (file: File) => void;
  loading?: boolean;
  className?: string;
}

export function EnhancedProgressPhotos({
  photos = [],
  onUpload,
  loading = false,
  className
}: EnhancedProgressPhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [touchState, setTouchState] = useState<TouchGestureState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Group photos by month
  const groupedPhotos = useCallback(() => {
    const grouped: Record<string, ProgressPhoto[]> = {};
    
    photos.forEach(photo => {
      const date = parseISO(photo.date);
      const monthYear = format(date, 'MMMM yyyy');
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      
      grouped[monthYear].push(photo);
    });
    
    return grouped;
  }, [photos]);

  // Preload adjacent images for smooth navigation
  useEffect(() => {
    if (selectedPhoto && photos.length > 1) {
      const currentIdx = photos.findIndex(p => p.id === selectedPhoto.id);
      const preloadUrls: string[] = [];
      
      // Preload previous image
      if (currentIdx > 0) {
        preloadUrls.push(photos[currentIdx - 1].imageUrl);
      }
      
      // Preload next image
      if (currentIdx < photos.length - 1) {
        preloadUrls.push(photos[currentIdx + 1].imageUrl);
      }
      
      ImagePreloader.preloadMultiple(preloadUrls).catch(console.warn);
    }
  }, [selectedPhoto, photos]);

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchState(prev => ({
      ...prev,
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0
    }));
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    
    setTouchState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY
    }));

    // Prevent default scrolling if horizontal swipe is detected
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  }, [touchState]);

  const handleTouchEnd = useCallback(() => {
    if (!touchState.isDragging) return;

    const { deltaX } = touchState;
    const swipeThreshold = 50;

    if (Math.abs(deltaX) > swipeThreshold && selectedPhoto) {
      const currentIdx = photos.findIndex(p => p.id === selectedPhoto.id);
      
      if (deltaX > 0 && currentIdx > 0) {
        // Swipe right - previous image
        setSelectedPhoto(photos[currentIdx - 1]);
        setCurrentIndex(currentIdx - 1);
      } else if (deltaX < 0 && currentIdx < photos.length - 1) {
        // Swipe left - next image
        setSelectedPhoto(photos[currentIdx + 1]);
        setCurrentIndex(currentIdx + 1);
      }
    }

    setTouchState(prev => ({
      ...prev,
      isDragging: false,
      deltaX: 0,
      deltaY: 0
    }));
  }, [touchState, selectedPhoto, photos]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedPhoto) return;

      const currentIdx = photos.findIndex(p => p.id === selectedPhoto.id);
      
      switch (e.key) {
        case 'ArrowLeft':
          if (currentIdx > 0) {
            setSelectedPhoto(photos[currentIdx - 1]);
            setCurrentIndex(currentIdx - 1);
          }
          break;
        case 'ArrowRight':
          if (currentIdx < photos.length - 1) {
            setSelectedPhoto(photos[currentIdx + 1]);
            setCurrentIndex(currentIdx + 1);
          }
          break;
        case 'Escape':
          setSelectedPhoto(null);
          setZoomLevel(1);
          break;
        case '=':
        case '+':
          setZoomLevel(prev => Math.min(prev + 0.5, 3));
          break;
        case '-':
          setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
          break;
      }
    };

    if (selectedPhoto) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [selectedPhoto, photos]);

  const handlePhotoClick = (photo: ProgressPhoto) => {
    const index = photos.findIndex(p => p.id === photo.id);
    setSelectedPhoto(photo);
    setCurrentIndex(index);
    setZoomLevel(1);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    try {
      // Optimize the image before upload
      const { optimized } = await imageOptimizer.optimizeImage(file, {
        format: 'webp',
        quality: 0.85,
        maxWidth: 1920,
        maxHeight: 1920
      });
      
      onUpload(optimized);
    } catch (error) {
      console.error('Image optimization failed:', error);
      // Fallback to original file
      onUpload(file);
    }
  };

  const groupedData = groupedPhotos();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Upload Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Progress Photos</h2>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="photo-upload"
          />
          <label htmlFor="photo-upload">
            <Button 
              className="bg-primary hover:bg-blue-600"
              disabled={loading}
              asChild
            >
              <span>
                <Camera className="w-4 h-4 mr-2" />
                Upload Photo
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Photo Gallery */}
      {Object.keys(groupedData).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Camera className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No progress photos yet. Upload your first photo to start tracking your journey!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedData).map(([monthYear, monthPhotos]) => (
            <div key={monthYear}>
              <div className="flex items-center mb-4">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                <h3 className="text-lg font-semibold">{monthYear}</h3>
                <Badge variant="secondary" className="ml-2">
                  {monthPhotos.length} photo{monthPhotos.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              <OptimizedGallery
                images={monthPhotos.map(photo => ({
                  src: photo.imageUrl,
                  alt: `Progress photo from ${format(parseISO(photo.date), 'MMM d, yyyy')}`
                }))}
                columns={window.innerWidth < 768 ? 2 : 3}
                className="gap-4"
                onImageClick={(index) => handlePhotoClick(monthPhotos[index])}
              />
            </div>
          ))}
        </div>
      )}

      {/* Photo Viewer Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => {
        if (!open) {
          setSelectedPhoto(null);
          setZoomLevel(1);
        }
      }}>
        <DialogContent 
          className="max-w-full max-h-full p-0 bg-black/95"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {selectedPhoto && (
            <div 
              ref={containerRef}
              className="relative w-full h-screen flex items-center justify-center"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Navigation Controls */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="w-6 h-6" />
              </Button>

              {/* Previous/Next Buttons */}
              {currentIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={() => {
                    setSelectedPhoto(photos[currentIndex - 1]);
                    setCurrentIndex(currentIndex - 1);
                  }}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
              )}

              {currentIndex < photos.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={() => {
                    setSelectedPhoto(photos[currentIndex + 1]);
                    setCurrentIndex(currentIndex + 1);
                  }}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              )}

              {/* Zoom Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 0.5))}
                  disabled={zoomLevel <= 0.5}
                >
                  <ZoomOut className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 3))}
                  disabled={zoomLevel >= 3}
                >
                  <ZoomIn className="w-5 h-5" />
                </Button>
              </div>

              {/* Photo with zoom and gesture support */}
              <div 
                className="relative max-w-full max-h-full overflow-hidden"
                style={{
                  transform: `scale(${zoomLevel}) translateX(${touchState.isDragging ? touchState.deltaX / zoomLevel : 0}px)`
                }}
              >
                <ProgressiveImage
                  ref={imageRef}
                  src={selectedPhoto.imageUrl}
                  alt={`Progress photo from ${format(parseISO(selectedPhoto.date), 'MMM d, yyyy')}`}
                  className="max-w-full max-h-full object-contain"
                  priority
                  lazy={false}
                />
              </div>

              {/* Photo Info */}
              <div className="absolute bottom-4 left-4 z-10 text-white">
                <p className="text-lg font-semibold">
                  {format(parseISO(selectedPhoto.date), 'MMMM d, yyyy')}
                </p>
                {selectedPhoto.category && (
                  <Badge variant="secondary" className="mt-2">
                    {selectedPhoto.category}
                  </Badge>
                )}
                {selectedPhoto.notes && (
                  <p className="text-sm mt-2 max-w-md">{selectedPhoto.notes}</p>
                )}
              </div>

              {/* Progress indicator */}
              <div className="absolute bottom-4 right-4 z-10 text-white text-sm">
                {currentIndex + 1} / {photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}