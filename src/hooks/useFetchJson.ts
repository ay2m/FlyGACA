import { useEffect, useState } from 'react';
import { loadJson } from '@/lib/content';

interface FetchState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

/**
 * Loads JSON content at runtime through the shared `loadJson` cache, so several
 * components reading the same `/data/*` file share one fetch + parse. Bump
 * `reloadToken` to force a fresh load of the same path (e.g. a retry button).
 */
export function useFetchJson<T>(path: string, reloadToken = 0): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, error: null, loading: true });

  useEffect(() => {
    // The cache promise is shared and not abortable, so guard setState with an
    // `ignore` flag on unmount instead of aborting the in-flight request.
    let ignore = false;
    setState({ data: null, error: null, loading: true });
    loadJson<T>(path, reloadToken > 0)
      .then((data) => {
        if (!ignore) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!ignore) setState({ data: null, error: error as Error, loading: false });
      });
    return () => {
      ignore = true;
    };
  }, [path, reloadToken]);

  return state;
}
