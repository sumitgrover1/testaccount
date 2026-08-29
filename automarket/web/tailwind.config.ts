import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // One brand blue for the marketplace, with a vertical accent each for
        // finance (green) and insurance (indigo) so the two verticals read as
        // their own products the way CarDekho/InsuranceDekho do.
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd3ff',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          900: '#0f2557',
        },
        accent: {
          500: '#f97316',
          600: '#ea580c',
        },
        finance: { 50: '#ecfdf5', 500: '#059669', 600: '#047857' },
        insure: { 50: '#eef2ff', 500: '#4f46e5', 600: '#4338ca' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 37, 87, 0.06), 0 8px 24px -12px rgba(15, 37, 87, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
