/**
 * Standalone telemetry and performance timing for chat stream responses.
 */

(function () {
  if (typeof window === 'undefined') return;

  window.__FLYGACA_CHAT_PERF__ = {
    timings: [] as Array<{ label: string; durationMs: number; timestamp: number }>,
    mark(label: string) {
      performance.mark(`chat-${label}`);
    },
    measure(label: string, startMark: string, endMark: string) {
      try {
        const measureName = `chat-measure-${label}`;
        performance.measure(measureName, `chat-${startMark}`, `chat-${endMark}`);
        const entries = performance.getEntriesByName(measureName);
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.timings.push({
            label,
            durationMs: parseFloat(lastEntry.duration.toFixed(2)),
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        // Fallback or silent catch if marks not found
      }
    },
    getReport() {
      return this.timings;
    },
  };
})();

declare global {
  interface Window {
    __FLYGACA_CHAT_PERF__?: {
      timings: Array<{ label: string; durationMs: number; timestamp: number }>;
      mark: (label: string) => void;
      measure: (label: string, startMark: string, endMark: string) => void;
      getReport: () => Array<{ label: string; durationMs: number; timestamp: number }>;
    };
  }
}

