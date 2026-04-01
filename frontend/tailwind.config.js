/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        copart: {
          blue: '#003087',
          'blue-light': '#0050B3',
          orange: '#FF6B00',
          'orange-light': '#FF8C00',
          dark: '#0A0A0A',
          gray: '#1A1A1A',
          'gray-light': '#2A2A2A',
        },
      },
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'bid-flash': 'bidFlash 0.5s ease-in-out',
        'pulse-ring': 'pulseRing 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'count-up': 'countUp 0.2s ease-out',
      },
      keyframes: {
        bidFlash: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(255, 107, 0, 0.2)' },
        },
        pulseRing: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        countUp: {
          '0%': { transform: 'scale(1.1)', color: '#FF6B00' },
          '100%': { transform: 'scale(1)', color: 'inherit' },
        },
      },
    },
  },
  plugins: [],
};
