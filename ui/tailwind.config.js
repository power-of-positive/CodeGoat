/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: {
          light: '#e5e7eb',
          dark: '#374151',
        },
        input: {
          light: '#f9fafb',
          dark: '#1f2937',
        },
        ring: {
          light: '#3b82f6',
          dark: '#60a5fa',
        },
        background: {
          light: '#ffffff',
          dark: '#111827',
        },
        foreground: {
          light: '#111827',
          dark: '#f9fafb',
        },
        card: {
          light: '#ffffff',
          dark: '#1f2937',
        },
        cardForeground: {
          light: '#111827',
          dark: '#f9fafb',
        },
        popover: {
          light: '#ffffff',
          dark: '#1f2937',
        },
        popoverForeground: {
          light: '#111827',
          dark: '#f9fafb',
        },
        primary: {
          light: '#1f2937',
          dark: '#f9fafb',
        },
        primaryForeground: {
          light: '#f9fafb',
          dark: '#1f2937',
        },
        secondary: {
          light: '#f3f4f6',
          dark: '#374151',
        },
        secondaryForeground: {
          light: '#1f2937',
          dark: '#f9fafb',
        },
        muted: {
          light: '#f3f4f6',
          dark: '#374151',
        },
        mutedForeground: {
          light: '#6b7280',
          dark: '#9ca3af',
        },
        accent: {
          light: '#f3f4f6',
          dark: '#374151',
        },
        accentForeground: {
          light: '#1f2937',
          dark: '#f9fafb',
        },
        destructive: {
          light: '#ef4444',
          dark: '#f87171',
        },
        destructiveForeground: {
          light: '#f9fafb',
          dark: '#fef2f2',
        },
      },
    },
  },
  plugins: [],
}