import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        card: 'var(--radius-card)',
        ctl: 'var(--radius-ctl)',
      },
      colors: {
        primary: 'var(--primary)',
        danger: 'var(--danger)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        card: 'var(--card)',
        focus: 'var(--focus)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        DEFAULT: 'var(--shadow)',
      },
    },
  },
  plugins: [],
};
export default config;
