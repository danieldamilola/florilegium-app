/* Monochrome tokens ported from the web app's :root and reader themes
   (C:\dev\library\index.html, main @ 1393d8d). Do not invent new colours or
   accents; the brand is paper / ink / wash only. */

export const palette = {
  paper: '#F7F6F1',
  white: '#FFFFFF',
  ink: '#161513',
  muted: '#6F6D65',
  faint: '#98968C',
  line: 'rgba(22,21,19,0.14)',
  lineStrong: 'rgba(22,21,19,0.30)',
  wash: '#ECEAE3',
  backdrop: '#E4E2DC',
  night: {
    bg: '#101010',
    ink: '#EFEDE6',
    muted: '#A6A39A',
    faint: '#77746C',
    line: 'rgba(255,255,255,0.18)',
    lineStrong: 'rgba(255,255,255,0.34)',
    wash: '#1C1C1A',
  },
} as const;

export const radii = { cover: 3, card: 18, sheet: 26, pill: 999 } as const;

export const metrics = { pad: 22, navH: 66, statusH: 44 } as const;

export const fonts = { serif: 'Newsreader', sans: 'Inter' } as const;

/* Reader surface colours per theme (web: READER_THEME_COLORS). */
export const readerThemeColors = {
  paper: '#F7F6F1',
  white: '#FFFFFF',
  night: '#101010',
} as const;

export const readerTokens = {
  sizes: { default: 18 },
  /* margin 0|1|2 -> horizontal body padding, from index.html line 1284. */
  margins: [16, 24, 32] as const,
  defaultMargin: 1 as const,
  lineHeight: 1.72,
  maxWidth: 580,
  bodyPaddingTop: 28,
  bodyPaddingBottom: 44,
} as const;

export const defaultReaderSettings = {
  theme: 'paper' as const,
  family: 'serif' as const,
  size: readerTokens.sizes.default,
  margin: readerTokens.defaultMargin,
};
