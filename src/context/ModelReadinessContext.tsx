import { EventBus, ModelCategory, ModelManager } from '@runanywhere/web';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ensureLanguageModelReady, type LanguageModelDiagnostics } from '../services/spendingAnalysis';

type ModelReadinessState = 'initializing' | 'downloading' | 'loading' | 'ready' | 'error';

interface ModelReadinessContextValue {
  state: ModelReadinessState;
  progress: number;
  ready: boolean;
  error: string | null;
  diagnostics: LanguageModelDiagnostics | null;
  retry: () => Promise<void>;
}

const ModelReadinessContext = createContext<ModelReadinessContextValue | null>(null);

export function ModelReadinessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModelReadinessState>('initializing');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<LanguageModelDiagnostics | null>(null);

  const prepare = useCallback(async () => {
    setState('initializing');
    setProgress(0);
    setError(null);

    let unsubscribe: (() => void) | null = null;
    try {
      const languageModel = ModelManager.getModels().find((model) => model.modality === ModelCategory.Language);
      if (languageModel && languageModel.status !== 'downloaded' && languageModel.status !== 'loaded') {
        setState('downloading');
        unsubscribe = EventBus.shared.on('model.downloadProgress', (event) => {
          if (event.modelId === languageModel.id) {
            setProgress(event.progress ?? 0);
          }
        });
      } else {
        setState('loading');
      }

      const diag = await ensureLanguageModelReady();
      setDiagnostics(diag);
      setProgress(1);
      setState('ready');
      console.info('[SpendSense][LLM] ready', diag);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize on-device model.';
      setError(msg);
      setState('error');
      console.error('[SpendSense][LLM] initialization failed', err);
    } finally {
      if (unsubscribe) unsubscribe();
    }
  }, []);

  useEffect(() => {
    void prepare();
  }, [prepare]);

  const value = useMemo<ModelReadinessContextValue>(
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

  return <ModelReadinessContext.Provider value={value}>{children}</ModelReadinessContext.Provider>;
}

export function useModelReadiness() {
  const context = useContext(ModelReadinessContext);
  if (!context) throw new Error('useModelReadiness must be used within ModelReadinessProvider');
  return context;
}
