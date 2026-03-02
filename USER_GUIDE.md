# SpendSense - User Guide

## Getting Started

### 1. Installation & Running

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will open at `http://localhost:5173`

### 2. First Time Setup

When you first open SpendSense:

1. The app will initialize the RunAnywhere SDK (AI engine)
2. Local IndexedDB database will be created automatically
3. No sign-up or authentication required!

## Core Features

### 📊 Dashboard

**What it shows:**
- Total monthly spending
- Number of transactions
- Average transaction amount
- Top spending category
- Category breakdown chart (horizontal bars)
- Month-to-month comparison

**How to use:**
1. Click "Dashboard" tab
2. View your spending overview
3. Click "🔄 Refresh" to update data

### ➕ Add Expense

**Manual Entry:**
1. Click "Add" tab
2. Fill in the form:
   - **Amount**: Enter in ₹ (Indian Rupees)
   - **Category**: Select from 9 categories (food, shopping, travel, etc.)
   - **Description**: Brief note about the expense
   - **Date**: Select transaction date
   - **Merchant** (optional): Store/service name
   - **Payment Method**: UPI, Card, Cash, etc.
3. Click "Add Expense"

**Categories Available:**
- 🍔 Food & Dining
- 🛍️ Shopping
- 🚗 Travel & Transport
- 💡 Bills & Utilities
- 🎬 Entertainment
- ⚕️ Healthcare
- 📚 Education
- 💆 Personal Care
- 📦 Other

### 📝 Expenses List

View all your transactions:
- Sorted by date (newest first)
- Shows amount, category, merchant, date
- Delete expenses with 🗑️ button
- Scroll through transaction history

### 📸 Scan Receipt

**AI-Powered OCR:**
1. Click "Scan" tab
2. Upload a receipt/screenshot image
3. Click "✨ Extract Data"
4. AI will analyze and extract:
   - Amount
   - Merchant name
   - Category (auto-suggested)
   - Description
5. Review and edit extracted data
6. Click "💾 Save Expense"

**Supported:**
- Restaurant bills
- Shopping receipts
- UPI payment screenshots
- Bank statements
- Any expense document with visible amount

**First use:** The AI model (~450MB) will download automatically

### 💡 AI Insights

**Generate Smart Recommendations:**
1. Click "Insights" tab
2. Click "✨ Generate Insights"
3. AI will analyze your spending and provide:
   - Spending trend analysis
   - Money-saving recommendations
   - Pattern identification
   - Actionable advice

**First use:** The LLM model (~250MB) will download automatically

**Example insights:**
- "You spent 35% more on food this month compared to last month"
- "Consider using public transport to save ₹2000/month"
- "Your entertainment spending doubled - review subscriptions"

## Privacy & Security

### 🔒 100% Private & Offline

**What stays local:**
- ✅ All expense data (stored in IndexedDB)
- ✅ AI models (cached in browser OPFS)
- ✅ Receipt images
- ✅ Generated insights

**What goes online:**
- ❌ NOTHING after initial load
- ✅ Only model downloads (one-time, from HuggingFace)

### Data Storage

**Where is my data?**
- Browser's IndexedDB: All expense records
- Browser's OPFS: AI models (persistent cache)
- Never sent to any server!

**Can I export my data?**
Currently manual. Future feature: CSV/JSON export

**What if I clear browser data?**
- Expenses will be lost (stored locally)
- AI models need re-download
- Consider browser backup or export feature (coming soon)

## Technical Details

### AI Models Used

1. **LLM (Insights)**
   - Model: Liquid AI LFM2 350M Q4_K_M
   - Size: ~250MB
   - Purpose: Generate spending insights
   - Speed: ~20-50 tokens/sec (depending on device)

2. **VLM (Receipt Scanner)**
   - Model: Liquid AI LFM2-VL 450M Q4_0
   - Size: ~450MB
   - Purpose: Extract text from receipt images
   - Speed: ~5-10 sec per image

3. **Acceleration**
   - WebGPU: If supported (Chrome 113+)
   - CPU fallback: Always available

### Browser Requirements

**Minimum:**
- Chrome 96+ or Edge 96+
- 2GB RAM
- 1GB free storage

**Recommended:**
- Chrome 120+ or Edge 120+
- 4GB+ RAM
- WebGPU support (for 3-5x faster AI)

**Not supported:**
- Firefox (WebGPU coming soon)
- Safari (partial support)
- Mobile browsers (may be slow)

### Performance Tips

1. **First time is slow:** Models download once (~700MB total)
2. **Use WebGPU:** Check header badge - "⚡ WebGPU" is best
3. **Smaller batches:** Process 1 receipt at a time
4. **Keep tab open:** Background tabs may throttle AI

## Troubleshooting

### Models won't download
- Check internet connection
- Ensure 1GB+ free storage
- Try clearing browser cache and reload

### AI is slow
- Check if WebGPU badge shows (header)
- Close other tabs to free memory
- Try CPU mode if WebGPU fails

### Receipt scanner not working
- Use clear, well-lit images
- JPG/PNG format recommended
- Max 1024px (auto-resized)
- Text should be readable

### Data not showing
- Click "🔄 Refresh" button
- Check browser console for errors
- Ensure IndexedDB is enabled

### App won't load
- Check console for errors
- Verify Cross-Origin headers (production)
- Clear browser cache and reload

## Deployment

### Vercel (Recommended)

```bash
npm run build
npx vercel --prod
```

The `vercel.json` file includes required headers.

### Other Hosts

Ensure these HTTP headers on all responses:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

These are required for multi-threaded WebAssembly (SharedArrayBuffer).

## Future Features (Roadmap)

- [ ] CSV/JSON data export
- [ ] Budget setting and alerts
- [ ] Recurring expenses tracking
- [ ] Multi-currency support
- [ ] Dark mode toggle
- [ ] Expense categories customization
- [ ] Bank statement PDF parsing
- [ ] Voice input for expenses
- [ ] Progressive Web App (PWA)
- [ ] Data backup/restore

## Need Help?

- **Documentation:** https://docs.runanywhere.ai
- **GitHub Issues:** Report bugs on the repository
- **Privacy Questions:** Read the README.md

---

**Built for RunAnywhere GPT Challenge 2026**

**Remember:** Your data never leaves your device. Everything runs locally. Your privacy is our guarantee.
