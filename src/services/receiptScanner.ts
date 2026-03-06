import Tesseract from 'tesseract.js';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../types/spendsense';
import { ensureLanguageModelReady } from './spendingAnalysis';

export interface ExtractedReceiptTransaction {
  date: string;
  merchant: string;
  amount: number;
  category: ExpenseCategory;
  confidence: number;
}

export interface ReceiptExtractionResult {
  transactions: ExtractedReceiptTransaction[];
  lowConfidence: boolean;
  rawText: string;
  parser: 'llm' | 'fallback';
}

interface LLMTransaction {
  date?: string | null;
  merchant?: string | null;
  amount?: number | string | null;
  category?: string | null;
}

interface ParsedReceiptPayload {
  transactions: LLMTransaction[];
}

interface OcrPreprocessResult {
  original: string;
  normalized: string;
  normalizedLower: string;
}

const SUMMARY_PATTERN =
  /(total spent|grand total|total amount|payment summary|share summary|summary)/i;

const devLog = (label: string, value: unknown) => {
  if (import.meta.env.DEV) {
    console.info(`[SpendSense][Receipt] ${label}`, value);
  }
};

const preprocessOcrText = (rawText: string): OcrPreprocessResult => {
  const normalized = rawText
    .replace(/[^\w\s₹.,:/\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    original: rawText,
    normalized,
    normalizedLower: normalized.toLowerCase(),
  };
};

const toISODate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const cleaned = value.trim().replace(/\//g, '-');
  const direct = new Date(cleaned);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString().slice(0, 10);

  const dmy = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (!dmy) return null;
  const [, dd, mm, yy] = dmy;
  const year = yy.length === 2 ? `20${yy}` : yy;
  const composed = new Date(`${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
  if (Number.isNaN(composed.getTime())) return null;
  return composed.toISOString().slice(0, 10);
};

const toAmount = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const fallbackCategory = (merchant: string): ExpenseCategory => {
  const source = merchant.toLowerCase();
  if (/rent|landlord|lease/.test(source)) return 'Bills';
  if (/grocery|fresh|mart|supermarket|food|restaurant|cafe/.test(source)) return 'Food';
  if (/uber|ola|metro|fuel|petrol|travel|taxi/.test(source)) return 'Travel';
  if (/electric|water|internet|recharge|bill|utility/.test(source)) return 'Bills';
  if (/movie|netflix|spotify|game|entertainment|cinema/.test(source)) return 'Entertainment';
  if (/amazon|flipkart|shopping|mall|store/.test(source)) return 'Shopping';
  return 'Others';
};

const mapCategory = (value: string | null | undefined, merchant: string): ExpenseCategory => {
  if (!value) return fallbackCategory(merchant);
  const cleaned = value.trim().toLowerCase();
  const exact = EXPENSE_CATEGORIES.find((category) => category.toLowerCase() === cleaned);
  if (exact) return exact;
  if (/grocery/.test(cleaned)) return 'Food';
  if (/rent|utility/.test(cleaned)) return 'Bills';
  return fallbackCategory(merchant);
};

const extractFirstJsonObject = (text: string): string | null => {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') depth -= 1;
    if (depth === 0) return text.slice(start, i + 1);
  }
  return null;
};

const cleanJsonCandidate = (raw: string): string => {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();
  const objectText = extractFirstJsonObject(cleaned);
  if (objectText) cleaned = objectText;
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  return cleaned;
};

const parseLLMJson = (rawResponse: string): ParsedReceiptPayload => {
  const attempts = [rawResponse, cleanJsonCandidate(rawResponse)];
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as ParsedReceiptPayload;
      if (!parsed || !Array.isArray(parsed.transactions)) continue;
      return parsed;
    } catch {
      // try next
    }
  }
  throw new Error('Receipt detected but data could not be structured properly.');
};

const validateAndNormalizeTransactions = (
  transactions: LLMTransaction[],
  parser: 'llm' | 'fallback',
): ExtractedReceiptTransaction[] =>
  transactions
    .map((item) => {
      const merchant = (item.merchant ?? '').trim();
      const isoDate = toISODate(item.date);
      const amount = toAmount(item.amount);
      if (!merchant || SUMMARY_PATTERN.test(merchant)) return null;
      if (!isoDate || !amount || amount <= 0) return null;
      return {
        date: isoDate,
        merchant,
        amount,
        category: mapCategory(item.category, merchant),
        confidence: parser === 'llm' ? 0.9 : 0.55,
      } as ExtractedReceiptTransaction;
    })
    .filter((item): item is ExtractedReceiptTransaction => item !== null);

const fallbackTransactionsFromOCR = (processed: OcrPreprocessResult): ExtractedReceiptTransaction[] => {
  const lines = processed.original
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const datePattern = /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/;
  const amountPattern = /₹?\s?\d[\d,]*(?:\.\d{1,2})?/g;

  const extracted: ExtractedReceiptTransaction[] = [];
  for (const line of lines) {
    if (SUMMARY_PATTERN.test(line)) continue;
    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;
    const isoDate = toISODate(dateMatch[1]);
    if (!isoDate) continue;

    const amountMatches = line.match(amountPattern) ?? [];
    const amounts = amountMatches
      .map((value) => Number(value.replace(/[₹,\s]/g, '')))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (amounts.length === 0) continue;
    const amount = Math.max(...amounts);

    const merchant = line
      .replace(dateMatch[0], '')
      .replace(amountPattern, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!merchant || SUMMARY_PATTERN.test(merchant)) continue;

    extracted.push({
      date: isoDate,
      merchant,
      amount,
      category: fallbackCategory(merchant),
      confidence: 0.5,
    });
  }
  return extracted;
};

export async function extractTextFromReceipt(
  imageFile: File,
  onProgress?: (value: number, status: string) => void,
): Promise<string> {
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (message) => {
      if (onProgress) onProgress(message.progress ?? 0, message.status ?? 'processing');
    },
    cacheMethod: 'write',
  });

  try {
    const { data } = await worker.recognize(imageFile);
    const text = (data.text ?? '').trim();
    if (!text) throw new Error('No readable text found in receipt image.');
    return text;
  } finally {
    await worker.terminate();
  }
}

export async function analyzeReceiptLocally(
  imageFile: File,
  onOcrProgress?: (value: number, status: string) => void,
): Promise<ReceiptExtractionResult> {
  const rawText = await extractTextFromReceipt(imageFile, onOcrProgress);
  const processed = preprocessOcrText(rawText);
  devLog('Raw OCR text', rawText);

  await ensureLanguageModelReady();

  const extractionPrompt = [
    'Extract transactions from receipt OCR text.',
    'Return STRICT JSON only.',
    'No explanations. No markdown. No backticks. No trailing commas.',
    'Output must be a single JSON object.',
    'JSON schema:',
    '{"transactions":[{"date":"YYYY-MM-DD","merchant":"string","amount":number,"category":"string|null"}]}',
    'Rules:',
    '- Ignore summary lines containing: Total Spent, Grand Total, Total Amount, Payment Summary, Share Summary.',
    '- Extract only rows that contain a valid date + merchant + numeric amount.',
    '- If one transaction exists, still return it inside the transactions array.',
    '- If uncertain about category, return null.',
    `OCR_TEXT:\n${processed.normalized.slice(0, 5000)}`,
  ].join('\n');

  try {
    const llmResponse = await TextGeneration.generate(extractionPrompt, {
      maxTokens: 500,
      temperature: 0,
      topP: 0.9,
    });
    const rawLLM = llmResponse.text ?? '';
    devLog('Raw LLM response', rawLLM);
    const cleaned = cleanJsonCandidate(rawLLM);
    devLog('Cleaned LLM response', cleaned);

    const payload = parseLLMJson(rawLLM);
    const transactions = validateAndNormalizeTransactions(payload.transactions, 'llm');

    if (transactions.length > 0) {
      return {
        transactions,
        lowConfidence: transactions.some((item) => item.confidence < 0.7),
        rawText,
        parser: 'llm',
      };
    }
  } catch (error) {
    devLog('LLM extraction failed', error);
  }

  const fallbackTransactions = fallbackTransactionsFromOCR(processed);
  if (fallbackTransactions.length === 0) {
    throw new Error('Receipt detected but data could not be structured properly.');
  }

  return {
    transactions: fallbackTransactions,
    lowConfidence: true,
    rawText,
    parser: 'fallback',
  };
}
