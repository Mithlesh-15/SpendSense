/**
 * ReceiptScanner - Upload and extract expense data from receipts using on-device VLM
 */

import { useState, useRef } from 'react';
import { VLMWorkerBridge } from '@runanywhere/web-llamacpp';
import { ModelManager, ModelCategory } from '@runanywhere/web';
import type { ExpenseCategory } from '../types/expense';
import { expenseDB } from '../db/expenseDB';

export function ReceiptScanner({ onSuccess }: { onSuccess?: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setExtractedData(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const processReceipt = async () => {
    if (!image) return;

    setProcessing(true);
    setError(null);

    try {
      // Ensure VLM model is loaded
      const models = ModelManager.getModels().filter((m) => m.modality === ModelCategory.Multimodal);
      const vlmModel = models[0];

      if (!vlmModel) {
        setError('No vision model available');
        return;
      }

      // Download if needed
      if (vlmModel.status !== 'downloaded' && vlmModel.status !== 'loaded') {
        setModelLoading(true);
        await ModelManager.downloadModel(vlmModel.id);
        setModelLoading(false);
      }

      // Load model
      if (vlmModel.status !== 'loaded') {
        setModelLoading(true);
        await ModelManager.loadModel(vlmModel.id);
        setModelLoading(false);
      }

      // Prepare image for VLM
      const { rgbData, width, height } = await loadImageToRGB(image);

      // Extract receipt information using VLM
      const prompt = `Analyze this receipt or expense document and extract:
1. Total amount (just the number)
2. Merchant/store name
3. Date (if visible)
4. Main category (food, shopping, travel, bills, entertainment, healthcare, education, personal, or other)
5. Brief description

Format your response as:
Amount: [number]
Merchant: [name]
Date: [date or "today"]
Category: [category]
Description: [brief description]`;

      const result = await VLMWorkerBridge.shared.process(rgbData, width, height, prompt);

      // Parse the result
      const parsed = parseVLMResponse(result.text);
      setExtractedData(parsed);

    } catch (err) {
      console.error('Failed to process receipt:', err);
      setError(err instanceof Error ? err.message : 'Failed to process receipt');
    } finally {
      setProcessing(false);
      setModelLoading(false);
    }
  };

  const saveExpense = async () => {
    if (!extractedData) return;

    try {
      await expenseDB.addExpense({
        amount: extractedData.amount || 0,
        category: extractedData.category || 'other',
        note: extractedData.description || 'Expense from receipt',
        date: extractedData.date || new Date(),
        merchant: extractedData.merchant,
        source: 'ocr',
        imageUrl: image || undefined,
      });

      // Reset
      setImage(null);
      setExtractedData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    }
  };

  return (
    <div className="receipt-scanner">
      <h3>📸 Scan Receipt</h3>
      <p className="scanner-description">
        Upload a receipt or expense screenshot. AI will extract the details automatically.
      </p>

      <div className="scanner-content">
        {!image ? (
          <div className="upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="file-input"
              id="receipt-upload"
            />
            <label htmlFor="receipt-upload" className="upload-label">
              <div className="upload-icon">📷</div>
              <div className="upload-text">
                <p>Click to upload receipt</p>
                <span>or drag and drop</span>
              </div>
            </label>
          </div>
        ) : (
          <>
            <div className="image-preview">
              <img src={image} alt="Receipt" />
              <button
                className="btn-remove"
                onClick={() => {
                  setImage(null);
                  setExtractedData(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                ✕
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {!extractedData && (
              <button
                onClick={processReceipt}
                disabled={processing || modelLoading}
                className="btn-primary btn-process"
              >
                {modelLoading
                  ? '⏳ Loading AI Model...'
                  : processing
                  ? '🤖 Analyzing...'
                  : '✨ Extract Data'}
              </button>
            )}

            {extractedData && (
              <div className="extracted-data">
                <h4>Extracted Information:</h4>
                <div className="data-field">
                  <label>Amount:</label>
                  <input
                    type="number"
                    value={extractedData.amount}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, amount: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div className="data-field">
                  <label>Merchant:</label>
                  <input
                    type="text"
                    value={extractedData.merchant || ''}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, merchant: e.target.value })
                    }
                  />
                </div>
                <div className="data-field">
                  <label>Category:</label>
                  <select
                    value={extractedData.category}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, category: e.target.value })
                    }
                  >
                    <option value="food">Food</option>
                    <option value="shopping">Shopping</option>
                    <option value="travel">Travel</option>
                    <option value="bills">Bills</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="personal">Personal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="data-field">
                  <label>Description:</label>
                  <input
                    type="text"
                    value={extractedData.description}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, description: e.target.value })
                    }
                  />
                </div>

                <div className="form-actions">
                  <button onClick={saveExpense} className="btn-primary">
                    💾 Save Expense
                  </button>
                  <button
                    onClick={() => {
                      setImage(null);
                      setExtractedData(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="scanner-footer">
        <p className="privacy-note">
          🔒 Image processing happens locally. Your receipts never leave your device.
        </p>
      </div>
    </div>
  );
}

/**
 * Load image and convert to RGB data for VLM
 */
async function loadImageToRGB(
  imageUrl: string
): Promise<{ rgbData: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Resize if too large (max 1024px)
      let width = img.width;
      let height = img.height;
      const maxSize = 1024;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const rgbData = new Uint8Array(width * height * 3);

      for (let i = 0; i < imageData.data.length; i += 4) {
        const j = (i / 4) * 3;
        rgbData[j] = imageData.data[i]; // R
        rgbData[j + 1] = imageData.data[i + 1]; // G
        rgbData[j + 2] = imageData.data[i + 2]; // B
      }

      resolve({ rgbData, width, height });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Parse VLM response into structured data
 */
function parseVLMResponse(text: string): any {
  const lines = text.split('\n');
  const data: any = {
    amount: 0,
    merchant: '',
    date: new Date(),
    category: 'other' as ExpenseCategory,
    description: '',
  };

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (lower.includes('amount:')) {
      const match = line.match(/[\d,.]+/);
      if (match) data.amount = parseFloat(match[0].replace(/,/g, ''));
    } else if (lower.includes('merchant:')) {
      data.merchant = line.split(':')[1]?.trim() || '';
    } else if (lower.includes('category:')) {
      const cat = line.split(':')[1]?.trim().toLowerCase();
      if (cat) data.category = cat;
    } else if (lower.includes('description:')) {
      data.description = line.split(':')[1]?.trim() || '';
    }
  });

  return data;
}
