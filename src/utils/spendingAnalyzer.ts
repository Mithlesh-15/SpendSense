/**
 * SpendingAnalyzer - On-device LLM spending analysis using RunAnywhere
 * 
 * This utility provides functions to analyze expense data using an on-device LLM.
 * All processing happens locally - no data leaves the device.
 */

import { TextGeneration } from '@runanywhere/web-llamacpp';
import { ModelManager, ModelCategory } from '@runanywhere/web';

/**
 * Expense summary data structure
 */
export interface ExpenseSummary {
  totalThisMonth: number;
  totalLastMonth: number;
  topCategory: string;
  categoryBreakdown: Record<string, number>;
  transactionCount?: number;
  averageTransaction?: number;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  insights: string[];
  rawResponse: string;
  success: boolean;
  error?: string;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Build optimized prompt for spending analysis
 */
function buildAnalysisPrompt(data: ExpenseSummary): string {
  const changePercent = data.totalLastMonth > 0
    ? ((data.totalThisMonth - data.totalLastMonth) / data.totalLastMonth) * 100
    : 0;

  const categoryList = Object.entries(data.categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `  - ${cat}: ${formatCurrency(amt)}`)
    .join('\n');

  return `You are a helpful personal finance advisor. Analyze this spending data and provide exactly 3-4 brief, actionable insights as bullet points.

SPENDING DATA:
Current Month Total: ${formatCurrency(data.totalThisMonth)}
Previous Month Total: ${formatCurrency(data.totalLastMonth)}
Change: ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%
${data.transactionCount ? `Transactions: ${data.transactionCount}` : ''}
${data.averageTransaction ? `Average per transaction: ${formatCurrency(data.averageTransaction)}` : ''}

Category Breakdown:
${categoryList}

Top Category: ${data.topCategory}

INSTRUCTIONS:
1. Provide exactly 3-4 insights as bullet points
2. Start each insight with a bullet point (-)
3. Keep each insight to one sentence (max 20 words)
4. Focus on: trends, top categories, savings opportunities, actionable advice
5. Be encouraging and constructive
6. Use simple language
7. Be specific with numbers when relevant

Format your response as:
- [First insight about spending trend]
- [Second insight about top categories]
- [Third insight with actionable advice]
- [Optional fourth insight if relevant]

Do not include any introduction or conclusion. Just the bullet points.`;
}

/**
 * Parse LLM response into structured insights
 */
function parseInsights(response: string): string[] {
  const lines = response
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const insights: string[] = [];

  for (const line of lines) {
    // Match lines starting with -, •, *, or numbers
    if (line.match(/^[-•*]\s+/) || line.match(/^\d+\.\s+/)) {
      // Remove bullet point or number and trim
      const cleaned = line.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '').trim();
      if (cleaned.length > 10) { // Filter out very short lines
        insights.push(cleaned);
      }
    } else if (insights.length > 0 && !line.match(/^(SPENDING|Category|Total|Change|Top)/i)) {
      // Continuation of previous insight (if it doesn't look like data)
      insights[insights.length - 1] += ' ' + line;
    } else if (!line.match(/^(SPENDING|Category|Total|Change|Top|Format|Instructions)/i)) {
      // Standalone insight without bullet
      insights.push(line);
    }
  }

  // Limit to 4 insights max
  return insights.slice(0, 4);
}

/**
 * Ensure LLM model is loaded
 */
async function ensureModelLoaded(
  onProgress?: (status: string) => void
): Promise<{ modelId: string; loaded: boolean }> {
  const models = ModelManager.getModels().filter((m) => m.modality === ModelCategory.Language);
  
  if (models.length === 0) {
    throw new Error('No language model registered. Please check SDK initialization.');
  }

  const model = models[0];

  // Download if needed
  if (model.status !== 'downloaded' && model.status !== 'loaded') {
    onProgress?.('Downloading AI model...');
    await ModelManager.downloadModel(model.id);
  }

  // Load if needed
  if (model.status !== 'loaded') {
    onProgress?.('Loading AI model into memory...');
    await ModelManager.loadModel(model.id);
  }

  onProgress?.('Model ready');
  return { modelId: model.id, loaded: true };
}

/**
 * Main function: Analyze spending using on-device LLM
 * 
 * @param data - Expense summary data
 * @param onProgress - Optional callback for status updates
 * @returns Analysis result with insights
 */
export async function analyzeSpending(
  data: ExpenseSummary,
  onProgress?: (status: string) => void
): Promise<AnalysisResult> {
  try {
    // Validate input
    if (!data || typeof data.totalThisMonth !== 'number') {
      throw new Error('Invalid expense data provided');
    }

    // Ensure model is ready
    onProgress?.('Preparing AI model...');
    await ensureModelLoaded(onProgress);

    // Build prompt
    const prompt = buildAnalysisPrompt(data);

    // Generate insights using on-device LLM
    onProgress?.('Analyzing your spending...');
    
    const result = await TextGeneration.generate(prompt, {
      maxTokens: 300,
      temperature: 0.7,
      stopSequences: ['\n\n\n', 'SPENDING DATA', 'INSTRUCTIONS'],
    });

    // Parse response
    const insights = parseInsights(result.text);

    if (insights.length === 0) {
      throw new Error('Failed to extract insights from analysis');
    }

    onProgress?.('Analysis complete!');

    return {
      insights,
      rawResponse: result.text,
      success: true,
    };
  } catch (error) {
    console.error('Spending analysis error:', error);
    return {
      insights: [],
      rawResponse: '',
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
    };
  }
}

/**
 * Stream spending analysis with real-time updates
 * 
 * @param data - Expense summary data
 * @param onToken - Callback for each token
 * @param onProgress - Callback for status updates
 * @returns Analysis result
 */
export async function analyzeSpendingStream(
  data: ExpenseSummary,
  onToken: (token: string) => void,
  onProgress?: (status: string) => void
): Promise<AnalysisResult> {
  try {
    // Validate input
    if (!data || typeof data.totalThisMonth !== 'number') {
      throw new Error('Invalid expense data provided');
    }

    // Ensure model is ready
    onProgress?.('Preparing AI model...');
    await ensureModelLoaded(onProgress);

    // Build prompt
    const prompt = buildAnalysisPrompt(data);

    // Stream generation
    onProgress?.('Analyzing your spending...');
    
    const { stream, result: resultPromise } = await TextGeneration.generateStream(prompt, {
      maxTokens: 300,
      temperature: 0.7,
      stopSequences: ['\n\n\n', 'SPENDING DATA', 'INSTRUCTIONS'],
    });

    let fullText = '';
    for await (const token of stream) {
      fullText += token;
      onToken(token);
    }

    await resultPromise;

    // Parse final response
    const insights = parseInsights(fullText);

    if (insights.length === 0) {
      throw new Error('Failed to extract insights from analysis');
    }

    onProgress?.('Analysis complete!');

    return {
      insights,
      rawResponse: fullText,
      success: true,
    };
  } catch (error) {
    console.error('Streaming analysis error:', error);
    return {
      insights: [],
      rawResponse: '',
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
    };
  }
}

/**
 * Quick spending summary for display
 */
export function getQuickSummary(data: ExpenseSummary): string {
  const change = data.totalThisMonth - data.totalLastMonth;
  const changePercent = data.totalLastMonth > 0
    ? Math.abs((change / data.totalLastMonth) * 100).toFixed(1)
    : 0;

  if (change > 0) {
    return `Spent ${formatCurrency(Math.abs(change))} more (↑${changePercent}%) than last month`;
  } else if (change < 0) {
    return `Saved ${formatCurrency(Math.abs(change))} (↓${changePercent}%) compared to last month`;
  } else {
    return 'Spending remained stable compared to last month';
  }
}
