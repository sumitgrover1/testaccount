import type { Config } from 'tailwindcss';

// Brand palette matched to the Lumine Aesthetics logo (deep indigo/purple)
// on a cream base, deep charcoal for text. Swap these values to re-theme.
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
        brand: {
          50: '#f5f3fc',
          100: '#ebe7f8',
          200: '#d3cbf0',
          300: '#b3a3e3',
          400: '#9078d2',
          500: '#6f55be',
          600: '#5a3fa8',
          700: '#4b3494',
          800: '#3a2773',
          900: '#281b52',
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
