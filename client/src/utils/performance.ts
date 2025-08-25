import { useCallback, useRef, useEffect, useState } from 'react';

// Debounce utility for expensive operations
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback(((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }) as T, [callback, delay]);
};

// Throttle utility for high-frequency events
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): T => {
  const inThrottle = useRef(false);
  
  return useCallback(((...args: Parameters<T>) => {
    if (!inThrottle.current) {
      callback(...args);
      inThrottle.current = true;
      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }) as T, [callback, limit]);
};

// Memory management for large images
export class ImageCache {
  private cache = new Map<string, HTMLImageElement>();
  private maxSize: number;
  private accessTimes = new Map<string, number>();

  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }

  get(url: string): HTMLImageElement | null {
    const image = this.cache.get(url);
    if (image) {
      this.accessTimes.set(url, Date.now());
    }
    return image || null;
  }

  set(url: string, image: HTMLImageElement): void {
    // If cache is full, remove least recently used item
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(url, image);
    this.accessTimes.set(url, Date.now());
  }

  private evictLRU(): void {
    let oldestTime = Date.now();
    let oldestKey = '';
    
    for (const [key, time] of Array.from(this.accessTimes.entries())) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global image cache instance
export const globalImageCache = new ImageCache(50);

// Performance monitoring hook
export const usePerformanceMonitor = (operation: string) => {
  const startTimeRef = useRef<number>(0);
  
  const start = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);
  
  const end = useCallback(() => {
    const duration = performance.now() - startTimeRef.current;
    console.log(`${operation} took ${duration.toFixed(2)}ms`);
    return duration;
  }, [operation]);
  
  return { start, end };
};

// Memory usage monitoring
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  
  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        setMemoryInfo({
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        });
      }
    };
    
    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return memoryInfo;
};

// Canvas optimization utilities
export const createOptimizedCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Enable hardware acceleration
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  
  canvas.width = width;
  canvas.height = height;
  
  return canvas;
};

// WebGL utilities for advanced image processing
export const createWebGLContext = (canvas: HTMLCanvasElement): WebGLRenderingContext | null => {
  const contextOptions = {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  };
  
  const context = canvas.getContext('webgl', contextOptions) ||
                   canvas.getContext('experimental-webgl', contextOptions);
  return context as WebGLRenderingContext | null;
};

// Image processing optimization
export const resizeImageWithWorker = (
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number
): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    // In a real implementation, this would use a Web Worker
    // For now, we'll do it on the main thread
    const canvas = createOptimizedCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d')!;
    
    const tempCanvas = createOptimizedCanvas(imageData.width, imageData.height);
    const tempCtx = tempCanvas.getContext('2d')!;
    
    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
    
    const resizedImageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    resolve(resizedImageData);
  });
};

// Batch processing utility
export const processBatch = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 5
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    // Allow UI to update between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return results;
};

// Resource cleanup utility
export const useResourceCleanup = () => {
  const resources = useRef<Array<() => void>>([]);
  
  const addCleanup = useCallback((cleanupFn: () => void) => {
    resources.current.push(cleanupFn);
  }, []);
  
  const cleanup = useCallback(() => {
    resources.current.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    resources.current = [];
  }, []);
  
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  return { addCleanup, cleanup };
};
