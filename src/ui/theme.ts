/** Tema oscuro único, pensado para usarse con una mano en el gimnasio. */
export const colors = {
  bg: '#0D0F13',
  surface: '#161920',
  surface2: '#1F232C',
  border: '#2A2F3A',
  text: '#F3F4F6',
  textDim: '#9CA3AF',
  textFaint: '#6B7280',
  primary: '#4C8DFF',
  primaryDim: '#1E3A6B',
  onPrimary: '#FFFFFF',
  success: '#22C55E',
  successDim: '#123B24',
  warning: '#F5A524',
  warningDim: '#3D2C0C',
  danger: '#EF4444',
  dangerDim: '#3F1616',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
/** Alto mínimo de los objetivos táctiles principales (dp). */
export const TOUCH = 56;

export const font = {
  h1: { fontSize: 28, fontWeight: '800' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  small: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  big: { fontSize: 34, fontWeight: '800' as const },
};
