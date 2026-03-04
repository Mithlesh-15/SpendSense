import { createContext, useContext, type ReactNode } from 'react';
import { useLLMModel, type LLMModelStatus } from '../hooks/useLLMModel';

const ModelReadinessContext = createContext<LLMModelStatus | null>(null);

export function ModelReadinessProvider({ children }: { children: ReactNode }) {
  const model = useLLMModel();
  return <ModelReadinessContext.Provider value={model}>{children}</ModelReadinessContext.Provider>;
}

export function useModelReadiness() {
  const context = useContext(ModelReadinessContext);
  if (!context) throw new Error('useModelReadiness must be used within ModelReadinessProvider');
  return context;
}
