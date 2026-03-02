import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ExpenseProvider } from './context/ExpenseContext';
import { AddExpensePage } from './pages/AddExpensePage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { UploadAnalyzePage } from './pages/UploadAnalyzePage';

export function App() {
  return (
    <ExpenseProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="add" element={<AddExpensePage />} />
            <Route path="upload" element={<UploadAnalyzePage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ExpenseProvider>
  );
}
