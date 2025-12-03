/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === THE VOID (Backgrounds) ===
        void: '#050505',
        'surface-base': '#0a0a0c',
        'surface-card': 'rgba(20, 20, 23, 0.6)',
        'surface-elevated': '#141417',
        'surface-modal': '#1a1a1d',

        // === GOLD LUXURY ===
        gold: {
          900: '#6b4f0f',
          800: '#7d5c12',
          700: '#8b6914',
          600: '#9e7a1a',
          500: '#b48e26',
          400: '#d4af37',
          300: '#e6c547',
          200: '#f5d061',
          100: '#ffeaa7',
        },

        // === BLOOD CRIMSON ===
        crimson: {
          900: '#3d0a0a',
          700: '#5c1010',
          500: '#8a1c1c',
          400: '#b93c3c',
          300: '#dc4c4c',
        },

        // === STATUS ===
        status: {
          success: '#22c55e',
          warning: '#eab308',
          error: '#ef4444',
          info: '#3b82f6',
        },

        // === TEXT ===
        'text-primary': '#f2f2f2',
        'text-secondary': '#a1a1aa',
        'text-muted': '#71717a',
      },

      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },

      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #F5D061 50%, #B48E26 100%)',
        'gold-gradient-vertical': 'linear-gradient(180deg, #e6c547 0%, #d4af37 50%, #b48e26 100%)',
        'gold-mesh': `
          radial-gradient(ellipse 60% 40% at 20% 30%, rgba(212,175,55,0.15) 0%, transparent 50%),
          radial-gradient(ellipse 50% 50% at 80% 70%, rgba(230,197,71,0.1) 0%, transparent 50%),
          linear-gradient(180deg, rgba(20,20,23,0.9) 0%, rgba(10,10,12,1) 100%)
        `,
        'steel-gradient': 'linear-gradient(180deg, #3a3a40 0%, #2a2a2e 50%, #1a1a1e 100%)',
        'noise': `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      },

      boxShadow: {
        'gold-glow': '0 0 20px -5px rgba(212, 175, 55, 0.4)',
        'gold-glow-strong': '0 0 40px -5px rgba(212, 175, 55, 0.6)',
        'gold-glow-intense': '0 0 60px -10px rgba(212, 175, 55, 0.8)',
        'inner-gold': 'inset 0 0 20px rgba(212, 175, 55, 0.1)',
        'vault': '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 60px -15px rgba(212, 175, 55, 0.15)',
        'card-heavy': '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
        'dossier': '0 10px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      },

      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },

      backdropBlur: {
        '3xl': '64px',
      },

      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'spin-reverse': 'spin-reverse 2s linear infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },

      keyframes: {
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 20px -5px rgba(212, 175, 55, 0.4)' },
          '50%': { boxShadow: '0 0 40px -5px rgba(212, 175, 55, 0.7)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'heavy': 'cubic-bezier(0.7, 0, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
