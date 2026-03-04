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
  const stats = toCategoryStats(summary);
  
  return [
    'You are a financial analysis assistant. Generate a detailed spending analysis using ONLY the provided JSON data.',
    '',
    'IMPORTANT RULES:',
    '- Use exact categories from the data: Food, Shopping, Travel, Bills, Entertainment, Others',
    '- Do not invent or assume any information',
    '- Keep insights concise and analytical',
    '- Focus on actionable recommendations',
    '',
    'OUTPUT FORMAT (use these exact section headers):',
    '',
    'CATEGORY-WISE COMPARISON',
    'For each category with spending, format as:',
    '[Category Name]',
    '• Last month: ₹[amount]',
    '• This month: ₹[amount]',
    '• [Increased/Decreased] by ₹[amount] ([percent]%)',
    '• Insight: [One short analytical sentence]',
    '',
    'BIGGEST INCREASE CATEGORY',
    'Identify the category with the largest increase:',
    '• [Category] increased the most by ₹[amount] ([percent]%)',
    '',
    'BIGGEST DECREASE CATEGORY',
    'Identify the category with the largest decrease:',
    '• [Category] decreased the most by ₹[amount] ([percent]%)',
    '',
    'SAVINGS OPPORTUNITIES',
    'Provide 1-2 realistic suggestions based on spending patterns:',
    '• [Specific actionable recommendation based on data]',
    '',
    'RISK ALERT',
    'If any category increased more than 40%, show warning. Otherwise state no high-risk spikes:',
    '⚠ Spending Alert',
    '• [Category] increased by [percent]% compared to last month',
    '',
    'SPENDING DATA (JSON):',
    JSON.stringify(summary, null, 2),
  ].join('\n');
};

const fallbackAnalysis = (summary: SpendingSummary): string[] => {
  const stats = toCategoryStats(summary);
  const biggestIncrease = [...stats].sort((a, b) => b.change - a.change)[0];
  const biggestDecrease = [...stats].sort((a, b) => a.change - b.change)[0];
  const risks = stats.filter((item) => item.risk);

  const lines: string[] = ['CATEGORY-WISE COMPARISON', ''];
  
  // Add category comparisons
  for (const item of stats.filter((s) => s.lastMonth > 0 || s.thisMonth > 0)) {
    lines.push(`${item.category}`);
    lines.push(`• Last month: ${formatINR(item.lastMonth)}`);
    lines.push(`• This month: ${formatINR(item.thisMonth)}`);
    lines.push(
      `• ${item.direction === 'increased' ? 'Increased' : 'Decreased'} by ${formatINR(item.changeAbs)} (${item.changePct}%)`,
    );
    const insight = item.direction === 'increased' 
      ? 'Review this category for controllable costs.' 
      : 'Good control this month; maintain this trend.';
    lines.push(`• Insight: ${insight}`);
    lines.push('');
  }

  lines.push('BIGGEST INCREASE CATEGORY');
  lines.push(`• ${biggestIncrease.category} increased the most by ${formatINR(Math.max(0, biggestIncrease.change))} (${biggestIncrease.changePct}%)`);
  lines.push('');
  
  lines.push('BIGGEST DECREASE CATEGORY');
  lines.push(`• ${biggestDecrease.category} decreased the most by ${formatINR(Math.abs(Math.min(0, biggestDecrease.change)))} (${biggestDecrease.changePct}%)`);
  lines.push('');
  
  lines.push('SAVINGS OPPORTUNITIES');
  if (biggestIncrease.change > 0) {
    lines.push(`• Reducing ${biggestIncrease.category.toLowerCase()} spending could lower monthly expenses significantly.`);
  }
  if (biggestDecrease.change < 0) {
    lines.push(`• ${biggestDecrease.category} expenses dropped this month — maintaining this trend could improve savings.`);
  }
  if (biggestIncrease.change <= 0 && biggestDecrease.change >= 0) {
    lines.push('• Set category caps for high-growth areas and compare weekly against target.');
  }
  lines.push('');
  
  lines.push('RISK ALERT');
  if (risks.length > 0) {
    lines.push('⚠ Spending Alert');
    for (const item of risks) {
      lines.push(`• ${item.category} increased by ${item.changePct}% compared to last month.`);
    }
  } else {
    lines.push('• No high-risk spikes detected.');
  }
  
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

const parseStructuredLines = (rawText: string): string[] =>
  rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\*\s*/, '').replace(/^\d+\.\s*/, ''));

const hasAllCategories = (lines: string[]) =>
  EXPENSE_CATEGORIES.every((category) =>
    lines.some((line) => line.toLowerCase().includes(category.toLowerCase())),
  );

export async function analyzeSpendingWithLocalLLM(
  summary: SpendingSummary,
  options: AnalyzeOptions = {},
): Promise<string[]> {
  if (!options.skipModelEnsure) {
    await ensureLanguageModelReady();
  }

  const prompt = buildPrompt(summary);
  const result = await TextGeneration.generate(prompt, {
    maxTokens: 1200,
    temperature: 0.3,
    systemPrompt:
      'You are SpendSense, a precise financial intelligence assistant. Generate structured, analytical insights based solely on provided data. Keep explanations concise and actionable.',
  });

  const lines = parseStructuredLines(result.text ?? '');
  if (lines.length === 0 || !hasAllCategories(lines)) {
    return fallbackAnalysis(summary);
  }

  return lines;
}
