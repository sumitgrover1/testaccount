import type { Config } from 'tailwindcss';

// Warm, elegant aesthetic-clinic palette — blush/rose accent on a cream base,
// deep charcoal for text. Swap these values to re-theme the whole site.
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fdfbf7',
          100: '#faf5ec',
          200: '#f3e9d7',
        },
        blush: {
          50: '#fdf2f4',
          100: '#fbe4e8',
          200: '#f5c6cf',
          300: '#eda2b1',
          400: '#df7a8e',
          500: '#c85c73',
          600: '#a8435a',
          700: '#87344a',
          800: '#6b2a3c',
          900: '#4a1d2a',
        },
        charcoal: {
          700: '#3a3532',
          800: '#2b2725',
          900: '#1c1918',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', "Times New Roman", 'Times', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
