export const theme = {
  colors: {
    primary: '#33034f',
    primaryHover: '#af19e1',
    text: '#374151',
    subtleText: '#6B7280',
    border: '#E5E7EB',
    surface: '#FFFFFF',
    mutedSurface: '#F9FAFB',
  },
  radius: {
    card: '1rem',
    button: '1rem',
    modal: '1rem',
  },
  shadow: {
    md: '0 6px 16px rgba(0,0,0,0.08)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.10), 0 10px 10px -5px rgba(0,0,0,0.04)',
  },
  spacing: {
    cardPadding: '1rem',
    sectionGap: '1.5rem',
  },
} as const;

export type Theme = typeof theme;


