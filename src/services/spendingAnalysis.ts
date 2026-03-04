import { ModelCategory } from '@runanywhere/web';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { EXPENSE_CATEGORIES } from '../types/spendsense';
import { ModelManager, getAccelerationMode, initSDK } from '../runanywhere';

export interface CategoryComparison {
  lastMonth: number;
  thisMonth: number;
  difference: number;
  percentChange: number;
}

export interface SpendingSummary {
  totalThisMonth: number;
  totalLastMonth: number;
  categories: Record<string, CategoryComparison>;
}

interface AnalyzeOptions {
  skipModelEnsure?: boolean;
  timeoutMs?: number;
}

export interface LanguageModelDiagnostics {
  modelId: string;
  modelStatus: string;
  loadedModelId: string | null;
  online: boolean;
  accelerationMode: string | null;
}

const inrNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatINR = (amount: number) => `₹${inrNumber.format(Math.round(amount))}`;
const DEFAULT_TIMEOUT_MS = 15_000;
export const LOCAL_LLM_CACHE_KEY = 'spendsense-llm-ready';

const toCategoryStats = (summary: SpendingSummary) =>
  EXPENSE_CATEGORIES.map((category) => {
    const categoryData = summary.categories[category] ?? {
      lastMonth: 0,
      thisMonth: 0,
      difference: 0,
      percentChange: 0,
    };
    const change = categoryData.difference;
    const changeAbs = Math.abs(change);
    const changePct = Math.abs(categoryData.percentChange);
    return {
      category,
      lastMonth: categoryData.lastMonth,
      thisMonth: categoryData.thisMonth,
      change,
      changeAbs,
      changePct,
      direction: change >= 0 ? 'increased' : 'decreased',
      risk: change > 0 && changePct > 40,
    };
  });

const buildPrompt = (summary: SpendingSummary): string => {
  const compact = {
    totalThisMonth: summary.totalThisMonth,
    totalLastMonth: summary.totalLastMonth,
    categories: toCategoryStats(summary).map((item) => ({
      category: item.category,
      lastMonth: item.lastMonth,
      thisMonth: item.thisMonth,
      difference: item.change,
      percentChange: item.changePct,
    })),
  };

  return [
    'Analyze the JSON and output concise structured lines.',
    'Sections in exact order:',
    'CATEGORY-WISE COMPARISON',
    'BIGGEST INCREASE CATEGORY',
    'BIGGEST DECREASE CATEGORY',
    'SAVINGS OPPORTUNITIES',
    'RISK ALERT',
    'Rules:',
    '- Use only categories: Food, Shopping, Travel, Bills, Entertainment, Others.',
    '- Category line format: "<Category>: Last ₹X | This ₹Y | Increased/Decreased ₹Z (P%) | Insight: ...".',
    '- Add 1-2 actionable savings lines.',
    '- Flag any category with >40% increase, else "No high-risk spikes detected."',
    '- No disclaimers. No filler.',
    `INPUT_JSON=${JSON.stringify(compact)}`,
  ].join('\n');
};

const fallbackAnalysis = (summary: SpendingSummary): string[] => {
  const stats = toCategoryStats(summary);
  const biggestIncrease = [...stats].sort((a, b) => b.change - a.change)[0];
  const biggestDecrease = [...stats].sort((a, b) => a.change - b.change)[0];
  const risks = stats.filter((item) => item.risk);

  const lines: string[] = ['CATEGORY-WISE COMPARISON'];
  for (const item of stats.filter((s) => s.lastMonth > 0 || s.thisMonth > 0)) {
    lines.push(
      `${item.category}: Last ${formatINR(item.lastMonth)} | This ${formatINR(item.thisMonth)} | ${item.direction === 'increased' ? 'Increased' : 'Decreased'} ${formatINR(item.changeAbs)} (${item.changePct}%) | Insight: ${item.direction === 'increased' ? 'Review controllable spend drivers.' : 'Category control improved this month.'}`,
    );
  }
  lines.push('BIGGEST INCREASE CATEGORY');
  lines.push(
    `${biggestIncrease.category} increased the most by ${formatINR(Math.max(0, biggestIncrease.change))} (${biggestIncrease.changePct}%).`,
  );
  lines.push('BIGGEST DECREASE CATEGORY');
  lines.push(
    `${biggestDecrease.category} decreased the most by ${formatINR(Math.abs(Math.min(0, biggestDecrease.change)))} (${biggestDecrease.changePct}%).`,
  );
  lines.push('SAVINGS OPPORTUNITIES');
  lines.push('Set weekly category caps for high-growth buckets and review every Sunday.');
  lines.push('Shift variable discretionary spends to planned budgets to avoid mid-month spikes.');
  lines.push('RISK ALERT');
  lines.push(
    risks.length > 0
      ? `High spike detected: ${risks.map((item) => `${item.category} (${item.changePct}%)`).join(', ')}.`
      : 'No high-risk spikes detected.',
  );

  return lines;
};

export const ensureLanguageModelReady = async (): Promise<LanguageModelDiagnostics> => {
  await initSDK();

  const languageModels = ModelManager.getModels().filter((model) => model.modality === ModelCategory.Language);
  const model = languageModels[0];
  if (!model) {
    throw new Error('No on-device language model is registered.');
  }

  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const alreadyLoaded = ModelManager.getLoadedModel(ModelCategory.Language);
  if (alreadyLoaded) {
    return {
      modelId: model.id,
      modelStatus: model.status,
      loadedModelId: alreadyLoaded.id,
      online,
      accelerationMode: getAccelerationMode(),
    };
  }

  const cachedMetaRaw = localStorage.getItem(LOCAL_LLM_CACHE_KEY);
  const cachedMeta = cachedMetaRaw
    ? (JSON.parse(cachedMetaRaw) as { modelId: string; preparedAt: string })
    : null;
  const hasLocalMarker = cachedMeta?.modelId === model.id;

  if (hasLocalMarker) {
    const loadedFromLocal = await ModelManager.loadModel(model.id, { coexist: true });
    if (loadedFromLocal) {
      const loadedModel = ModelManager.getLoadedModel(ModelCategory.Language);
      return {
        modelId: model.id,
        modelStatus: model.status,
        loadedModelId: loadedModel?.id ?? model.id,
        online,
        accelerationMode: getAccelerationMode(),
      };
    }
  }

  if (!online && !hasLocalMarker) {
    throw new Error('AI model is preparing. Please stay online for the first initialization.');
  }

  const ensured = await ModelManager.ensureLoaded(ModelCategory.Language, { coexist: true });
  const loadedModel = ModelManager.getLoadedModel(ModelCategory.Language) ?? ensured;
  if (!loadedModel) {
    if (!online) {
      throw new Error('AI model is preparing. Please stay online for the first initialization.');
    }
    throw new Error('Failed to load on-device language model.');
  }

  localStorage.setItem(
    LOCAL_LLM_CACHE_KEY,
    JSON.stringify({ modelId: model.id, preparedAt: new Date().toISOString() }),
  );

  return {
    modelId: model.id,
    modelStatus: model.status,
    loadedModelId: loadedModel.id,
    online,
    accelerationMode: getAccelerationMode(),
  };
};

const parseStructuredLines = (rawText: string): string[] =>
  rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\*\s*/, '').replace(/^\d+\.\s*/, ''));

const hasCoreSections = (lines: string[]) =>
  ['CATEGORY-WISE COMPARISON', 'BIGGEST INCREASE CATEGORY', 'BIGGEST DECREASE CATEGORY', 'SAVINGS OPPORTUNITIES', 'RISK ALERT'].every(
    (section) => lines.some((line) => line.toUpperCase().includes(section)),
  );

export async function analyzeSpendingWithLocalLLM(
  summary: SpendingSummary,
  options: AnalyzeOptions = {},
): Promise<string[]> {
  if (!options.skipModelEnsure) {
    await ensureLanguageModelReady();
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const prompt = buildPrompt(summary);
  const startedAt = performance.now();

  try {
    const result = await Promise.race([
      TextGeneration.generate(prompt, {
        maxTokens: 360,
        temperature: 0.15,
        topP: 0.9,
        systemPrompt:
          'You are SpendSense local analyzer. Output compact structured sections only from provided data.',
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timed out. Please retry.')), timeoutMs),
      ),
    ]);

    console.info('[SpendSense][LLM] analysis latency(ms)', Math.round(performance.now() - startedAt));

    const lines = parseStructuredLines(result.text ?? '');
    if (lines.length === 0 || !hasCoreSections(lines)) {
      console.warn('[SpendSense][LLM] invalid structure, using fallback formatter');
      return fallbackAnalysis(summary);
    }
    return lines;
  } catch (error) {
    console.error('[SpendSense][LLM] inference failed, using fallback', error);
    return fallbackAnalysis(summary);
  }
}
