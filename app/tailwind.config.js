/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{html,ts}",
    ],
    // darkMode: 'class',
    theme: {
      extend: {
        colors: {
          // Primary = logo dark/royal blue
          primary: {
            DEFAULT: '#0066FF',   // main brand blue (logo darker)
            hover:   '#0052CC',
            light:   '#4DA6FF',
            dark:    '#0041A8',
          },
        
          // Accent = logo cyan / aqua tone
          accent: {
            DEFAULT: '#00B5FF',   // bright cyan (logo lighter tone)
            hover:   '#00A0E6',
            light:   '#66E0FF',
            dark:    '#0086B3',
          },
        
          // Brand gradient (cyan → blue)
          brand: {
            start: '#00B5FF',   // gradient start (cyan)
            DEFAULT: '#0066FF',
            end:   '#3B4BFF',   // slight indigo to add depth
            light: '#66E0FF',
          },
        
          // Surface & Glass
          surface: {
            DEFAULT: 'rgba(255,255,255,0.06)',
            glass:   'rgba(255,255,255,0.09)',
            solid:   '#FFFFFF',
            muted:   '#F5F8FB',
            subtleBlue: '#F1F7FF', // very light blue-tint background
          },
        
          // Text
          text: {
            primary:   '#0F1724', // nearly-black for strong contrast
            secondary: '#667085', // subdued
            muted:     '#98A0B3',
            body:      '#0F1724',
          },
        
          // Status colors (unchanged semantics, tuned slightly)
          success: { DEFAULT: '#10B981', light: '#34D399', dark: '#059669' },
          error:   { DEFAULT: '#EF4444', light: '#F87171', dark: '#DC2626' },
          warning: { DEFAULT: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
          info:    '#0066FF',
        
          // Legacy / convenience aliases
          'primary-hover': '#0052CC',
          background: '#F6F9FF',
          border: '#E6EDF9',
          'text-primary': '#0F1724',
          'text-secondary': '#667085',
        },
        
        // Gradient stops (theme.extend.gradientColorStops)
        gradientColorStops: {
          'brand-start': '#00B5FF',
          'brand-end': '#0066FF',
          'primary-start': '#00B5FF',
          'primary-end': '#0066FF',
        },
        fontFamily: {
          sans: [
            'Inter',
            'Source Sans Pro',
            'Open Sans',
            'system-ui',
            '-apple-system',
            'BlinkMacSystemFont',
            'Segoe UI',
            'Roboto',
            'Helvetica Neue',
            'Arial',
            'sans-serif'
          ],
        },
        borderRadius: {
          '2xl': '1rem',
        },
        boxShadow: {
          'elev-md': '0 6px 16px rgba(0,0,0,0.08)',
          'elev-xl': '0 20px 25px -5px rgba(0,0,0,0.10), 0 10px 10px -5px rgba(0,0,0,0.04)'
        },
      },
    },
    plugins: [],
  }