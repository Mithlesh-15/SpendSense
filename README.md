# SpendSense

Privacy-first offline expense insights app for the RunAnywhere GPT Challenge.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- React Router
- Recharts
- Local state + localStorage (no backend)

## Features

- Dashboard with:
- Total Spent This Month
- Last Month Spend
- Difference card with increase/decrease color signal
- Category pie chart
- Monthly trend chart
- Local AI insights panel (mock, RunAnywhere-ready)
- Floating `+ Add Expense` button
- Add Expense page with validation
- Upload & Analyze page with drag-and-drop, preview, and mock extraction
- Transactions page with category filter and sorting
- Settings page with local privacy info, clear data, and export data
- Bottom mobile navigation across all pages

## Tailwind Setup

The project already includes:

- [`tailwind.config.cjs`](/d:/project/HackThon/SpendSense/tailwind.config.cjs)
- [`postcss.config.cjs`](/d:/project/HackThon/SpendSense/postcss.config.cjs)
- Tailwind directives in [`src/styles/index.css`](/d:/project/HackThon/SpendSense/src/styles/index.css)

To run:

```bash
npm install
npm run dev
```

## Project Structure

```text
src/
  App.tsx
  main.tsx
  styles/
    index.css
  types/
    spendsense.ts
  data/
    mockData.ts
  context/
    ExpenseContext.tsx
  services/
    localAi.ts
  pages/
    DashboardPage.tsx
    AddExpensePage.tsx
    UploadAnalyzePage.tsx
    TransactionsPage.tsx
    SettingsPage.tsx
  components/
    layout/
      AppShell.tsx
    charts/
      CategoryPieChart.tsx
      MonthlyTrendChart.tsx
    dashboard/
      SummaryCards.tsx
      AIInsightsPanel.tsx
    forms/
      AddExpenseForm.tsx
    upload/
      UploadAnalyzer.tsx
    transactions/
      TransactionsTable.tsx
    settings/
      SettingsPanel.tsx
    FloatingAddButton.tsx
```

## Offline Behavior

- Expense data is persisted to browser localStorage.
- No authentication, no backend calls, no cloud dependencies.
- Mock local analysis service lives in [`src/services/localAi.ts`](/d:/project/HackThon/SpendSense/src/services/localAi.ts) and is designed to be replaced by RunAnywhere SDK integration later.
