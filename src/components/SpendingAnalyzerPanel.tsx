/**
 * SpendingAnalyzerPanel - React component for on-device spending analysis
 * 
 * Features:
 * - "Analyze My Spending" button
 * - Loading states
 * - Real-time streaming display
 * - Error handling
 * - Optional TTS (Text-to-Speech)
 */

import { useState } from 'react';
import { analyzeSpending, analyzeSpendingStream, getQuickSummary } from '../utils/spendingAnalyzer';
import type { ExpenseSummary, AnalysisResult } from '../utils/spendingAnalyzer';

interface SpendingAnalyzerPanelProps {
  expenseData: ExpenseSummary;
  className?: string;
}

export function SpendingAnalyzerPanel({ expenseData, className = '' }: SpendingAnalyzerPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [useStreaming, setUseStreaming] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  /**
   * Run spending analysis (non-streaming)
   */
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setStatusMessage('Initializing...');
    setAnalysisResult(null);
    setStreamingText('');

    try {
      const result = await analyzeSpending(expenseData, (status) => {
        setStatusMessage(status);
      });

      setAnalysisResult(result);

      if (!result.success) {
        setStatusMessage(`Error: ${result.error}`);
      } else {
        setStatusMessage('');
      }
    } catch (error) {
      setAnalysisResult({
        insights: [],
        rawResponse: '',
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      });
      setStatusMessage('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Run streaming analysis with real-time display
   */
  const handleAnalyzeStream = async () => {
    setIsAnalyzing(true);
    setStatusMessage('Initializing...');
    setAnalysisResult(null);
    setStreamingText('');

    try {
      const result = await analyzeSpendingStream(
        expenseData,
        (token) => {
          setStreamingText((prev) => prev + token);
        },
        (status) => {
          setStatusMessage(status);
        }
      );

      setAnalysisResult(result);
      setStreamingText('');

      if (!result.success) {
        setStatusMessage(`Error: ${result.error}`);
      } else {
        setStatusMessage('');
      }
    } catch (error) {
      setAnalysisResult({
        insights: [],
        rawResponse: '',
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      });
      setStatusMessage('Analysis failed');
      setStreamingText('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Text-to-Speech using Web Speech API (optional feature)
   */
  const handleSpeak = () => {
    if (!analysisResult || !analysisResult.success || analysisResult.insights.length === 0) {
      return;
    }

    // Check if browser supports Speech Synthesis
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in your browser');
      return;
    }

    // Cancel any ongoing speech
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Create speech text
    const speechText = `Here are your spending insights. ${analysisResult.insights.join('. ')}`;
    const utterance = new SpeechSynthesisUtterance(speechText);

    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      alert('Speech synthesis failed');
    };

    window.speechSynthesis.speak(utterance);
  };

  const quickSummary = getQuickSummary(expenseData);

  return (
    <div className={`spending-analyzer-panel ${className}`}>
      {/* Header */}
      <div className="analyzer-header">
        <div>
          <h3>🤖 AI Spending Analysis</h3>
          <p className="analyzer-subtitle">On-device AI • 100% Private</p>
        </div>
        
        {/* Optional: Toggle streaming mode */}
        <label className="streaming-toggle">
          <input
            type="checkbox"
            checked={useStreaming}
            onChange={(e) => setUseStreaming(e.target.checked)}
            disabled={isAnalyzing}
          />
          <span>Stream</span>
        </label>
      </div>

      {/* Quick Summary */}
      <div className="quick-summary">
        <span className="summary-icon">📊</span>
        <span className="summary-text">{quickSummary}</span>
      </div>

      {/* Analyze Button */}
      <button
        onClick={useStreaming ? handleAnalyzeStream : handleAnalyze}
        disabled={isAnalyzing}
        className="btn-analyze"
      >
        {isAnalyzing ? (
          <>
            <span className="spinner-small"></span>
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <span>✨</span>
            <span>Analyze My Spending</span>
          </>
        )}
      </button>

      {/* Status Message */}
      {statusMessage && (
        <div className="status-message">
          <span className="status-icon">⏳</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Streaming Text (while analyzing) */}
      {streamingText && (
        <div className="insights-panel streaming">
          <div className="insight-header">
            <span className="insight-icon">🤖</span>
            <span className="insight-title">Analyzing...</span>
          </div>
          <div className="streaming-text">{streamingText}</div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && !streamingText && (
        <>
          {analysisResult.success ? (
            <div className="insights-panel">
              <div className="insight-header">
                <div>
                  <span className="insight-icon">💡</span>
                  <span className="insight-title">Your Insights</span>
                </div>
                
                {/* TTS Button */}
                {'speechSynthesis' in window && (
                  <button
                    onClick={handleSpeak}
                    className="btn-tts"
                    title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                  >
                    {isSpeaking ? '🔇' : '🔊'}
                  </button>
                )}
              </div>

              <ul className="insights-list">
                {analysisResult.insights.map((insight, index) => (
                  <li key={index} className="insight-item">
                    <span className="bullet">•</span>
                    <span className="insight-text">{insight}</span>
                  </li>
                ))}
              </ul>

              <div className="insights-footer">
                <p>🔒 Generated on your device • Your data stayed private</p>
              </div>
            </div>
          ) : (
            <div className="error-panel">
              <span className="error-icon">⚠️</span>
              <p className="error-message">{analysisResult.error}</p>
              <button onClick={useStreaming ? handleAnalyzeStream : handleAnalyze} className="btn-retry">
                Try Again
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!analysisResult && !isAnalyzing && !streamingText && (
        <div className="empty-state">
          <p>Click "Analyze My Spending" to get AI-powered insights about your expenses.</p>
          <ul className="feature-list">
            <li>✅ 100% private - runs on your device</li>
            <li>✅ No internet required</li>
            <li>✅ Personalized recommendations</li>
          </ul>
        </div>
      )}
    </div>
  );
}
