/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        display: [
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        amazonBrand: '#FF9900',
        walmartBrand: '#0071ce',
      },
      backgroundImage: {
        'page-gradient':
          'radial-gradient(at 20% 0%, #ffe4f1 0px, transparent 50%), radial-gradient(at 80% 0%, #dbeafe 0px, transparent 50%), radial-gradient(at 50% 100%, #ede9fe 0px, transparent 50%), linear-gradient(180deg, #fafbff 0%, #f5f3ff 100%)',
        'hero-gradient':
          'linear-gradient(135deg, rgba(99,102,241,0.95) 0%, rgba(139,92,246,0.9) 50%, rgba(236,72,153,0.85) 100%)',
        'brand-gradient':
          'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
        'shimmer':
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
        card: '0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06)',
        'card-hover': '0 8px 32px rgba(99,102,241,0.18), 0 2px 8px rgba(15,23,42,0.08)',
        soft: '0 2px 8px rgba(15, 23, 42, 0.06)',
        focus: '0 0 0 4px rgba(99, 102, 241, 0.18)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in-slow': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'pop': {
          '0%': { transform: 'scale(0.96)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-in-slow': 'fade-in-slow 0.8s ease-out both',
        'pop': 'pop 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
