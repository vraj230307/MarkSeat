// Design System Color & Theme Tokens
// Strictly adheres to project palette and WCAG AA contrast rules
export const THEME_COLORS = {
  text: '#0b0519',
  bg: '#f4f1fc',
  primary: '#5c34d7',
  secondary: '#e98dc5',
  accent: '#e1658b',
  cardBg: '#ffffff',
  cardBorder: '#dfd8f5',
  inputBorder: '#cbbfef',
  seatAvailable: '#ffffff',
  seatHeld: '#e98dc5',
  seatSold: '#d8d1e7',
  seatSelected: '#5c34d7',
} as const;

export const BORDER_RADIUS = {
  button: '6px',
  card: '8px',
  input: '6px',
} as const;
