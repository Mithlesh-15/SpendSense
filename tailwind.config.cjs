/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        fintech: '0 12px 28px -18px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
};
