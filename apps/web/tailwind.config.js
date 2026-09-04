/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Ember — bold gold/amber accent against near-black, hospitality-premium
        brand: {
          50: '#fbf3e2',
          100: '#f6e2b8',
          200: '#f0cc80',
          300: '#eab449',
          400: '#e2992a',
          500: '#d4841e',
          600: '#b96a15',
          700: '#8f5313',
          800: '#6b3f13',
          900: '#4a2c10',
          950: '#2b1908',
        },
        // Ink — inverted neutral scale: 50 = darkest bg, 950 = brightest text.
        // Kept the same step semantics as the old light scale (50=bg, 900=heading
        // text) so every existing `bg-surface-50` / `text-surface-900` usage
        // flips to dark mode without touching each call site.
        surface: {
          50: '#0a0a0f',
          100: '#131319',
          200: '#1c1c24',
          300: '#2a2a35',
          400: '#52525f',
          500: '#7a7a89',
          600: '#9d9dac',
          700: '#c2c2cf',
          800: '#e2e2ea',
          900: '#f7f7fa',
          950: '#ffffff',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(212,132,30,0.15), 0 8px 30px -8px rgba(212,132,30,0.35)',
        'glow-lg': '0 0 0 1px rgba(212,132,30,0.2), 0 20px 60px -15px rgba(212,132,30,0.45)',
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
