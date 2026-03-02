/**
 * AIInsights - Generate personalized financial insights using on-device LLM
 */

import { useState, useEffect } from 'react';
import type { AIInsight, MonthlyStats } from '../types/expense';
import { expenseDB } from '../db/expenseDB';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { ModelManager, ModelCategory } from '@runanywhere/web';
import { formatCurrency, getMonthName } from '../types/expense';

export function AIInsights() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [generating, setGenerating] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const recentInsights = await expenseDB.getRecentInsights(3);
      setInsights(recentInsights);
    } catch (err) {
      console.error('Failed to load insights:', err);
    }
  };

  const generateInsights = async () => {
    setGenerating(true);
    setError(null);
    setStreamingText('');

    try {
      // Ensure model is loaded
      const models = ModelManager.getModels().filter((m) => m.modality === ModelCategory.Language);
      const model = models[0];

      if (!model) {
        setError('No language model available');
        return;
      }

      // Download if needed
      if (model.status !== 'downloaded' && model.status !== 'loaded') {
        setModelLoading(true);
        await ModelManager.downloadModel(model.id);
        setModelLoading(false);
      }

      // Load model
      if (model.status !== 'loaded') {
        setModelLoading(true);
        await ModelManager.loadModel(model.id);
        setModelLoading(false);
      }

      // Get current month stats
      const now = new Date();
      const currentMonth = await expenseDB.getMonthlyStats(now.getFullYear(), now.getMonth() + 1);
      const previousMonth = await expenseDB.getMonthlyStats(
        now.getFullYear(),
        now.getMonth(),
      );

      // Get recent expenses for context
      const recentExpenses = await expenseDB.getExpensesByMonth(now.getFullYear(), now.getMonth() + 1);

      // Build prompt for AI
      const prompt = buildInsightPrompt(currentMonth, previousMonth, recentExpenses.slice(0, 10));

      // Generate insights with streaming
      const { stream, result: resultPromise } = await TextGeneration.generateStream(prompt, {
        maxTokens: 400,
        temperature: 0.7,
        systemPrompt: `You are a helpful personal finance advisor. Provide brief, actionable insights about spending patterns. Focus on trends, potential savings, and practical recommendations. Be encouraging and constructive.`,
      });

      let fullText = '';
      for await (const token of stream) {
        fullText += token;
        setStreamingText(fullText);
      }

      const result = await resultPromise;

      // Parse and save insights
      await parseAndSaveInsights(result.text);
      await loadInsights();

    } catch (err) {
      console.error('Failed to generate insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setGenerating(false);
      setModelLoading(false);
      setStreamingText('');
    }
  };

  return (
    <div className="ai-insights">
      <div className="insights-header">
        <h3>💡 AI Insights</h3>
        <button
          onClick={generateInsights}
          disabled={generating || modelLoading}
          className="btn-primary btn-generate"
        >
          {modelLoading ? '⏳ Loading Model...' : generating ? '🤖 Generating...' : '✨ Generate Insights'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Streaming text while generating */}
      {streamingText && (
        <div className="insight-card streaming">
          <div className="insight-icon">🤖</div>
          <div className="insight-content">
            <h4>Analyzing your spending...</h4>
            <p className="streaming-text">{streamingText}</p>
          </div>
        </div>
      )}

      {/* Display saved insights */}
      {insights.length > 0 ? (
        <div className="insights-list">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ) : (
        !generating && (
          <div className="insights-empty">
            <p>No insights yet. Generate AI-powered spending insights based on your expense data!</p>
          </div>
        )
      )}

      <div className="insights-footer">
        <p className="privacy-note">
          🔒 All AI processing happens locally on your device. Your data never leaves your browser.
        </p>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: AIInsight }) {
  const iconMap = {
    spending_pattern: '📊',
    recommendation: '💡',
    alert: '⚠️',
    summary: '📝',
  };

  const priorityClass = `priority-${insight.priority}`;

  return (
    <div className={`insight-card ${priorityClass}`}>
      <div className="insight-icon">{iconMap[insight.type]}</div>
      <div className="insight-content">
        <h4>{insight.title}</h4>
        <p>{insight.message}</p>
        <div className="insight-meta">
          <span className="insight-type">{insight.type.replace('_', ' ')}</span>
          <span className="insight-date">
            {new Date(insight.generatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Build prompt for AI insight generation
 */
function buildInsightPrompt(
  current: MonthlyStats,
  previous: MonthlyStats,
  recentExpenses: any[]
): string {
  const changePercent = previous.totalSpent > 0
    ? ((current.totalSpent - previous.totalSpent) / previous.totalSpent) * 100
    : 0;

  // Get top 3 categories
  const topCategories = Object.entries(current.categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat, amount]) => `${cat}: ${formatCurrency(amount)}`);

  return `Analyze this spending data and provide 2-3 brief insights:

Current Month: ${getMonthName(current.month)} ${current.year}
- Total Spent: ${formatCurrency(current.totalSpent)}
- Transactions: ${current.transactionCount}
- Average per transaction: ${formatCurrency(current.averageTransaction)}
- Top Categories: ${topCategories.join(', ')}

Previous Month: ${getMonthName(previous.month)}
- Total Spent: ${formatCurrency(previous.totalSpent)}
- Change: ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%

Recent Expenses:
${recentExpenses.slice(0, 5).map(e => `- ${formatCurrency(e.amount)} on ${e.category}: ${e.note}`).join('\n')}

Provide insights about:
1. Spending trends (increased/decreased categories)
2. One actionable recommendation to save money
3. Any concerning patterns

Keep it brief and encouraging.`;
}

/**
 * Parse AI response and save as structured insights
 */
async function parseAndSaveInsights(text: string): Promise<void> {
  // For simplicity, save the entire response as a summary insight
  // In production, you could parse the response into multiple insights
  await expenseDB.saveInsight({
    type: 'summary',
    title: 'AI Spending Analysis',
    message: text,
    actionable: true,
    priority: 'medium',
  });
}
