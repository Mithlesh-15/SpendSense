import { EventBus, ModelCategory, ModelManager } from '@runanywhere/web';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ensureLanguageModelReady, type LanguageModelDiagnostics } from '../services/spendingAnalysis';

export type LLMModelState = 'initializing' | 'downloading' | 'loading' | 'ready' | 'error';

export interface LLMModelStatus {
  state: LLMModelState;
  progress: number;
  ready: boolean;
  error: string | null;
  diagnostics: LanguageModelDiagnostics | null;
  retry: () => Promise<void>;
}

const LOCAL_MODEL_KEY = 'spendsense-llm-ready';

const getLocalModelMarker = (): { modelId: string; preparedAt: string } | null => {
  try {
    const raw = localStorage.getItem(LOCAL_MODEL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { modelId: string; preparedAt: string };
  } catch {
    return null;
  }
};

export function useLLMModel(): LLMModelStatus {
  const [state, setState] = useState<LLMModelState>('initializing');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<LanguageModelDiagnostics | null>(null);
  const runningRef = useRef(false);

  const prepare = useCallback(async () => {
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

      const diag = await ensureLanguageModelReady();
      setDiagnostics(diag);
      setProgress(1);
      setState('ready');
      localStorage.setItem(
        LOCAL_MODEL_KEY,
        JSON.stringify({ modelId: diag.modelId, preparedAt: new Date().toISOString() }),
      );
      console.info('[SpendSense][LLM] ready', diag);
    } catch (err) {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const marker = getLocalModelMarker();
      const base = err instanceof Error ? err.message : 'Failed to initialize on-device model.';
      const message = !online && !marker
        ? 'AI model is initializing. Connect once to finish first-time model download.'
        : base;
      setError(message);
      setState('error');
      console.error('[SpendSense][LLM] initialization failed', err);
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
      retry: prepare,
    }),
    [state, progress, error, diagnostics, prepare],
  );
}
