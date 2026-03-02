import { useNavigate } from 'react-router-dom';

export function FloatingAddButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/add')}
      className="fixed bottom-20 right-4 z-20 rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-700"
    >
      + Add Expense
    </button>
  );
}
