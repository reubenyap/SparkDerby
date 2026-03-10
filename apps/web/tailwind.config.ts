import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        spark: {
          primary: '#6C2BD9',
          'primary-light': '#8B5CF6',
          secondary: '#F59E0B',
          'secondary-light': '#FBBF24',
          dark: '#060a13',
          'dark-800': '#0f172a',
          'dark-700': '#1e293b',
          'dark-600': '#334155',
          light: '#F8FAFC',
          accent: '#10B981',
          'accent-light': '#34D399',
          danger: '#EF4444',
          'danger-light': '#F87171',
          cyan: '#06B6D4',
          'cyan-light': '#22D3EE',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
