import { ModelCategory } from '@runanywhere/web';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { ModelManager, initSDK, getAccelerationMode } from '../runanywhere';

export interface SpendingSummary {
  totalThisMonth: number;
  totalLastMonth: number;
  topCategory: string;
  categoryBreakdown: Record<string, number>;
}

interface AnalyzeOptions {
  maxInsights?: number;
  skipModelEnsure?: boolean;
}

export interface LanguageModelDiagnostics {
  modelId: string;
  modelStatus: string;
  loadedModelId: string | null;
  online: boolean;
  accelerationMode: string | null;
}

const DEFAULT_MAX_INSIGHTS = 4;
const MIN_INSIGHTS = 2;

const buildPrompt = (summary: SpendingSummary, maxInsights: number): string => {
  const categories = Object.entries(summary.categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => `${name}: ₹${Math.round(amount)}`)
    .join(', ');

  const delta = summary.totalThisMonth - summary.totalLastMonth;
  const direction = delta >= 0 ? 'increased' : 'decreased';
  const deltaAbs = Math.abs(delta);

  return [
    'You are a privacy-first personal finance assistant for SpendSense.',
    `Generate ${MIN_INSIGHTS}-${maxInsights} short bullet-point insights.`,
    'Rules:',
    '- Each bullet must be practical and specific to the data.',
    '- Keep each bullet under 18 words.',
    '- Cover trend, top category, and one saving opportunity.',
    '- Output only bullets starting with "- " and nothing else.',
    '',
    'Expense summary:',
    `- Total this month: ₹${Math.round(summary.totalThisMonth)}`,
    `- Total last month: ₹${Math.round(summary.totalLastMonth)}`,
    `- Spending ${direction} by ₹${Math.round(deltaAbs)} month-over-month.`,
    `- Top category: ${summary.topCategory}`,
    `- Category breakdown: ${categories}`,
  ].join('\n');
};

export const ensureLanguageModelReady = async (): Promise<LanguageModelDiagnostics> => {
  await initSDK();

  const languageModels = ModelManager.getModels().filter((model) => model.modality === ModelCategory.Language);
  const model = languageModels[0];
  if (!model) {
    throw new Error('No on-device language model is registered.');
  }

  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (model.status !== 'downloaded' && model.status !== 'loaded') {
    if (!online) {
      throw new Error(
        'Language model is not cached yet. Go online once to download it for offline use.',
      );
    }
    await ModelManager.downloadModel(model.id);
  }

  if (model.status !== 'loaded') {
    const loaded = await ModelManager.loadModel(model.id, { coexist: true });
    if (!loaded) {
      throw new Error('Failed to load on-device language model.');
    }
  }

  const loadedModel = ModelManager.getLoadedModel(ModelCategory.Language);
  return {
    modelId: model.id,
    modelStatus: model.status,
    loadedModelId: loadedModel?.id ?? null,
    online,
    accelerationMode: getAccelerationMode(),
  };
};

const parseBullets = (rawText: string, maxInsights: number): string[] => {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = lines
    .map((line) => line.replace(/^[\-\*\u2022]\s*/, '').trim())
    .filter((line) => line.length > 0);

  const deduped = Array.from(new Set(bullets));
  return deduped.slice(0, maxInsights);
};

export async function analyzeSpendingWithLocalLLM(
  summary: SpendingSummary,
  options: AnalyzeOptions = {},
): Promise<string[]> {
  const maxInsights = options.maxInsights ?? DEFAULT_MAX_INSIGHTS;
  if (!options.skipModelEnsure) {
    await ensureLanguageModelReady();
  }

  const prompt = buildPrompt(summary, maxInsights);
  const result = await TextGeneration.generate(prompt, {
    maxTokens: 220,
    temperature: 0.35,
    systemPrompt:
      'You analyze personal expense summaries locally. Be concise, practical, and privacy-focused.',
  });

  const insights = parseBullets(result.text ?? '', maxInsights);
  if (insights.length === 0) {
    throw new Error('The local model returned an empty analysis. Please try again.');
  }

  return insights;
}
