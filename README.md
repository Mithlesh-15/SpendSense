# SpendSense

#### SpendSense transforms raw receipts into structured financial insights — entirely on-device.

SpendSense is a privacy-first, fully offline expense intelligence web app built for the RunAnywhere GPT Challenge.

It combines OCR, rule-based parsing, and on-device LLM inference to extract and analyze expenses without sending receipts or financial data to external servers.

## Problem

Most AI-powered expense tools depend on cloud OCR and cloud LLM APIs. That creates three practical issues:

- Sensitive financial documents leave the user device.
- Offline usage is weak or impossible.
- Repeated inference requests increase latency, cost, and dependency on network quality.

## Solution

SpendSense runs receipt understanding and spending analysis on-device:

- OCR runs locally with Tesseract.js.
- Transaction extraction uses a hybrid parser (rules first, LLM only when useful).
- Spending insights are generated with RunAnywhere Web SDK using a local model.
- Expense data is persisted in browser storage (IndexedDB / localStorage).

After first-time model download and initialization, the core workflow operates offline.

## Core Capabilities

- Dashboard with month-over-month comparison
- Category distribution via pie chart
- Monthly trend visualization
- On-device AI spending insights
- Receipt and statement scanner
- Multi-transaction extraction from statement-style receipts
- Hybrid parsing engine (regex + LLM assist)
- Local persistence and offline-first UX

## Tech Stack

- React 19
- Vite 6
- TypeScript 5
- Tailwind CSS 3
- Recharts
- Tesseract.js (OCR)
- RunAnywhere Web SDK (`@runanywhere/web`, `@runanywhere/web-llamacpp`, `@runanywhere/web-onnx`)
- IndexedDB + localStorage

## Architecture Overview

### Frontend Layer

- React SPA with route-based pages
- Tailwind-driven responsive UI
- Recharts for financial visual analytics

### Local Data Layer

- Expense records stored in IndexedDB
- Model readiness/cache markers in localStorage
- No backend database, no account system

### On-Device AI Layer

- RunAnywhere SDK initialized once at app startup
- Shared model lifecycle for language/vision/audio tasks
- Language model reused across features after load

### Receipt Intelligence Pipeline

- OCR text extraction from uploaded image
- Mode selection based on text structure
- Rule-based parsing for predictable formats
- LLM-assisted extraction only for ambiguous simple receipts
- Safe fallback that always returns editable output

## AI System Design

### Hybrid Receipt Parsing Engine

SpendSense uses three parsing modes:

1. Statement Mode (Rule-Based)

- Triggered by `Transaction History` or high date-density patterns
- Parses each line with regex for date, merchant, and amount
- Ignores summary/non-transaction rows
- Extracts the last numeric token as amount
- Skips LLM to maximize reliability on tabular statements

2. Simple Receipt Mode (Hybrid)

- Normalizes OCR text
- Detects amount near `Total` (fallback: highest numeric value)
- Calls on-device LLM only to infer merchant/date and confirm amount
- Enforces strict JSON output handling

3. Fallback Mode (Always Available)

- Uses highest detected numeric value as amount
- Uses first strong uppercase-like line as merchant candidate
- Produces editable transaction output
- Never hard-blocks save flow

### Design Principles

- Deterministic rules for structured receipts
- Narrow LLM scope for unstructured ambiguity
- Failure-tolerant parsing with manual correction path
- Zero cloud dependency for inference once local models are ready

## Privacy and Offline Guarantees

- Receipt images are processed locally in-browser
- OCR and parsing execute on-device
- Expense data remains in local browser storage
- No server-side data pipeline
- After first-time model initialization, all AI inference and receipt analysis run fully offline with zero network dependency.

## Demo Flow

1. Open the app and allow first-time model initialization.
2. Add a few manual expenses to populate baseline trends.
3. Upload a simple receipt image and run analysis.
4. Observe extraction mode, review fields if confidence is low, then save.
5. Upload a statement-style screenshot and verify multi-transaction extraction.
6. Return to dashboard and validate updated totals, category chart, and trends.
7. Trigger AI insights and verify on-device generation without network calls.

## Why SpendSense Stands Out

- Privacy by architecture, not policy language
- Practical offline-first AI workflow for real financial use
- Hybrid extraction strategy tuned for reliability over generic prompting
- End-to-end local processing from receipt scan to insight generation
- Designed for real-world financial document variability
- Separation of deterministic parsing and probabilistic AI reasoning

## Performance Considerations

- Model initialized once and reused globally
- LLM calls limited to structured extraction tasks
- Statement receipts parsed without LLM to reduce latency
- Progressive UI states prevent perceived blocking

## Project Structure

```text
src/
  components/
    charts/
    dashboard/
    layout/
    upload/
  context/
  db/
  hooks/
  pages/
  services/
    receiptScanner.ts
    spendingAnalysis.ts
    storageService.ts
  runanywhere.ts
  main.tsx
```

## Getting Started

### Prerequisites

- Node.js 18+
- Modern Chromium-based browser recommended for best on-device model performance

### Run Locally

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

## Challenge Fit

SpendSense is aligned with the RunAnywhere GPT Challenge goal: deliver useful AI features that run privately and locally on user devices with minimal cloud dependency.

SpendSense directly addresses the core challenge theme:

- On-device AI execution
- Privacy-preserving workflows
- Real-world, high-impact use case
- Hybrid AI + deterministic engineering approach
