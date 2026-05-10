import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/app/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          sage: '#8B9A8E',
          'sage-light': '#A3B0A6',
          'sage-dark': '#6B7A6E',
          'sage-glow': 'rgba(139, 154, 142, 0.15)',
          'sage-wash': 'rgba(139, 154, 142, 0.04)',
        },
        panguard: {
          green: '#34D399',
          'green-light': '#6EE7B7',
          'green-dark': '#059669',
          red: '#C75050',
        },
        surface: {
          0: '#1A1614',
          1: '#1F1C19',
          2: '#272320',
          3: '#302B27',
          hero: '#0C0A09',
        },
        border: {
          DEFAULT: '#2E2A27',
          hover: '#3D3835',
          subtle: '#242120',
        },
        text: {
          primary: '#F5F1E8',
          secondary: '#A09890',
          tertiary: '#9A9490',
          muted: '#9A9490',
        },
        status: {
          safe: '#2ED573',
          caution: '#FBBF24',
          alert: '#FF6B35',
          danger: '#EF4444',
          info: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderColor: {
        DEFAULT: '#2E2A27',
      },
    },
  },
  plugins: [],
};

export default config;
