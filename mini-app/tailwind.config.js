/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '375px',   // Small phones
      'sm': '640px',   // Large phones
      'md': '768px',   // Tablets
      'lg': '1024px',  // Laptops
      'xl': '1280px',  // Desktops
    },
    extend: {
      colors: {
        // === THE VOID (Deepest Onyx/Charcoal) ===
        void: '#09090b',
        onyx: '#0c0c0e',
        'surface-base': '#0a0a0c',
        'surface-card': 'rgba(18, 18, 21, 0.6)',
        'surface-elevated': '#141417',
        'surface-modal': '#1a1a1d',
        'surface-glass': 'rgba(255, 255, 255, 0.05)',

        // === LIQUID GOLD (Premium Metallic) ===
        gold: {
          950: '#5c4510',
          900: '#6b4f0f',
          800: '#7d5c12',
          700: '#8b6914',
          600: '#9e7a1a',
          500: '#b48e26',
          400: '#d4af37',
          350: '#dfc14a',
          300: '#e6c547',
          250: '#f0d35c',
          200: '#f5d061',
          150: '#f9e07a',
          100: '#ffeaa7',
          50: '#fff8e1',
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
        'text-gold': '#d4af37',
      },

      fontFamily: {
        display: ['Montserrat', 'system-ui', 'sans-serif'],
        serif: ['Cinzel', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Manrope', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },

      backgroundImage: {
        // === LIQUID GOLD GRADIENT (The Signature) ===
        'liquid-gold': 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 50%, #B38728 75%, #FBF5B7 100%)',
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #F5D061 50%, #B48E26 100%)',
        'gold-gradient-vertical': 'linear-gradient(180deg, #f5d061 0%, #d4af37 40%, #b48e26 100%)',
        'gold-shimmer': 'linear-gradient(90deg, transparent 0%, rgba(251,245,183,0.4) 50%, transparent 100%)',
        'gold-mesh': `
          radial-gradient(ellipse 60% 40% at 20% 30%, rgba(212,175,55,0.12) 0%, transparent 50%),
          radial-gradient(ellipse 50% 50% at 80% 70%, rgba(230,197,71,0.08) 0%, transparent 50%),
          linear-gradient(180deg, rgba(18,18,21,0.95) 0%, rgba(9,9,11,1) 100%)
        `,
        // === GLASS BACKGROUNDS ===
        'glass-dark': 'linear-gradient(180deg, rgba(18, 18, 21, 0.8) 0%, rgba(12, 12, 14, 0.9) 100%)',
        'glass-gold': 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(18,18,21,0.95) 50%, rgba(212,175,55,0.05) 100%)',
        // === OTHER ===
        'steel-gradient': 'linear-gradient(180deg, #3a3a40 0%, #2a2a2e 50%, #1a1a1e 100%)',
        'noise': `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        'radial-top': 'radial-gradient(ellipse 100% 60% at 50% -20%, rgba(212,175,55,0.08) 0%, transparent 60%)',
      },

      boxShadow: {
        'gold-glow': '0 0 20px -5px rgba(212, 175, 55, 0.4)',
        'gold-glow-strong': '0 0 40px -5px rgba(212, 175, 55, 0.6)',
        'gold-glow-intense': '0 0 60px -10px rgba(212, 175, 55, 0.8)',
        'inner-gold': 'inset 0 0 30px rgba(212, 175, 55, 0.08)',
        'vault': '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 80px -20px rgba(212, 175, 55, 0.12)',
        'card-heavy': '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
        'card-glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        'dossier': '0 10px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        'nav-dock': '0 -4px 30px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.6), 0 0 60px -20px rgba(212,175,55,0.1)',
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
        'spin-slow': 'spin 8s linear infinite',
        'spin-medium': 'spin 4s linear infinite',
        'spin-reverse': 'spin-reverse 6s linear infinite',
        'pulse-gold': 'pulse-gold 2.5s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'shimmer-gold': 'shimmer-gold 3s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'border-spin': 'border-spin 8s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
      },

      keyframes: {
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 20px -5px rgba(212, 175, 55, 0.4)' },
          '50%': { boxShadow: '0 0 50px -5px rgba(212, 175, 55, 0.7)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'shimmer-gold': {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'border-spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'heavy': 'cubic-bezier(0.7, 0, 0.3, 1)',
      },

      letterSpacing: {
        'ultra-wide': '0.25em',
      },
    },
  },
  plugins: [],
}
