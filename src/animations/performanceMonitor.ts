/**
 * Real-time animation & rendering performance monitor.
 * Tracks FPS, frame drops, and layout thrashing in development.
 */

interface PerformanceMetrics {
  fps: number;
  droppedFrames: number;
  averageFrameTimeMs: number;
}

let isMonitoring = false;
let frameCount = 0;
let lastTimestamp = 0;
let lastFpsUpdate = 0;
let droppedFrames = 0;
let totalFrameTime = 0;

export function startPerformanceMonitoring(callback?: (metrics: PerformanceMetrics) => void): () => void {
  if (isMonitoring || typeof window === 'undefined') {
    return () => {};
  }

  isMonitoring = true;
  frameCount = 0;
  droppedFrames = 0;
  totalFrameTime = 0;
  lastTimestamp = performance.now();
  lastFpsUpdate = lastTimestamp;

  let rafId: number;

  const measure = (now: number) => {
    const delta = now - lastTimestamp;
    lastTimestamp = now;
    frameCount++;
    totalFrameTime += delta;

    // A frame taking longer than 24ms (~41fps threshold) is marked as dropped
    if (delta > 24) {
      droppedFrames++;
    }

    if (now - lastFpsUpdate >= 1000) {
      const elapsedSeconds = (now - lastFpsUpdate) / 1000;
      const currentFps = Math.round(frameCount / elapsedSeconds);
      const avgFrameTime = totalFrameTime / frameCount;

      const metrics: PerformanceMetrics = {
        fps: currentFps,
        droppedFrames,
        averageFrameTimeMs: parseFloat(avgFrameTime.toFixed(2)),
      };

      if (callback) {
        callback(metrics);
      } else if (import.meta.env?.DEV) {
        if (currentFps < 50) {
          console.warn(`[FlyGACA Perf] Low FPS detected: ${currentFps} fps (${droppedFrames} dropped frames)`);
        }
      }

      frameCount = 0;
      totalFrameTime = 0;
      droppedFrames = 0;
      lastFpsUpdate = now;
    }

    if (isMonitoring) {
      rafId = requestAnimationFrame(measure);
    }
  };

  rafId = requestAnimationFrame(measure);

  return () => {
    isMonitoring = false;
    cancelAnimationFrame(rafId);
  };
}

export function stopPerformanceMonitoring(): void {
  isMonitoring = false;
}

