import { EventBus, ModelCategory, ModelManager } from '@runanywhere/web';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ensureLanguageModelReady,
  LOCAL_LLM_CACHE_KEY,
  type LanguageModelDiagnostics,
} from '../services/spendingAnalysis';

export type LLMModelState = 'initializing' | 'downloading' | 'loading' | 'ready' | 'error';

export interface LLMModelStatus {
  state: LLMModelState;
  progress: number;
  ready: boolean;
  error: string | null;
  diagnostics: LanguageModelDiagnostics | null;
  retry: () => Promise<void>;
}

const MODEL_INITIALIZED_KEY = 'modelInitialized';
const INIT_INCOMPLETE_MESSAGE = 'AI model initialization incomplete. Please reconnect and retry.';

let sessionInitPromise: Promise<LanguageModelDiagnostics> | null = null;
let sessionReadyDiagnostics: LanguageModelDiagnostics | null = null;

const getLocalModelMarker = (): { modelId: string; preparedAt: string } | null => {
  try {
    const raw = localStorage.getItem(LOCAL_LLM_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { modelId: string; preparedAt: string };
  } catch {
    return null;
  }
};

const hasInitializedMarker = (): boolean => localStorage.getItem(MODEL_INITIALIZED_KEY) === 'true';

const clearInitMarkers = () => {
  localStorage.removeItem(MODEL_INITIALIZED_KEY);
  localStorage.removeItem(LOCAL_LLM_CACHE_KEY);
};

const runInitializationOnce = (force: boolean): Promise<LanguageModelDiagnostics> => {
  if (!force && sessionReadyDiagnostics) {
    return Promise.resolve(sessionReadyDiagnostics);
  }
  if (!force && sessionInitPromise) {
    return sessionInitPromise;
  }

  sessionInitPromise = (async () => {
    const hasMarker = hasInitializedMarker();
    console.info('[SpendSense][LLM] model initializing', { marker: hasMarker });

    if (hasMarker) {
      try {
        const diag = await ensureLanguageModelReady();
        sessionReadyDiagnostics = diag;
        return diag;
      } catch (error) {
        console.warn('[SpendSense][LLM] stale marker detected, clearing marker and retrying init', error);
        clearInitMarkers();
      }
    }

    const diag = await ensureLanguageModelReady();
    localStorage.setItem(MODEL_INITIALIZED_KEY, 'true');
    sessionReadyDiagnostics = diag;
    return diag;
  })();

  return sessionInitPromise;
};

export function useLLMModel(): LLMModelStatus {
  const [state, setState] = useState<LLMModelState>('initializing');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<LanguageModelDiagnostics | null>(null);
  const runningRef = useRef(false);

  const prepare = useCallback(async (force: boolean = false) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setState('initializing');
    setProgress(0);
    setError(null);

    let unsubscribe: (() => void) | null = null;
    try {
      const known = getLocalModelMarker();
      console.info('[SpendSense][LLM] startup marker', known);

      const model = ModelManager.getModels().find((item) => item.modality === ModelCategory.Language);
      if (model && model.status !== 'downloaded' && model.status !== 'loaded') {
        setState('downloading');
        unsubscribe = EventBus.shared.on('model.downloadProgress', (event) => {
          if (event.modelId === model.id) setProgress(event.progress ?? 0);
        });
      } else {
        setState('loading');
      }

      const diag = await runInitializationOnce(force);
      setDiagnostics(diag);
      setProgress(1);
      setState('ready');
      console.info('[SpendSense][LLM] model initialized successfully', diag);
    } catch (err) {
      clearInitMarkers();
      sessionReadyDiagnostics = null;
      sessionInitPromise = null;
      setError(INIT_INCOMPLETE_MESSAGE);
      setState('error');
      console.error('[SpendSense][LLM] model initialization failed', err);
    } finally {
      if (unsubscribe) unsubscribe();
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    void prepare();
  }, [prepare]);

  return useMemo(
    () => ({
      state,
      progress,
      ready: state === 'ready',
      error,
      diagnostics,
      retry: () => prepare(true),
    }),
    [state, progress, error, diagnostics, prepare],
  );
}
