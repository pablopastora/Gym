/**
 * ÚNICO archivo de tema: colores, tipografías y estilos de texto de toda la app
 * (pantallas, navegación y gráficas). Para retocar el diseño, cambia solo esto.
 *
 * Paleta negro + rojo. Contraste comprobado en src/ui/__tests__/theme.test.ts:
 *  - Texto blanco sobre `accent` (#E10600): 5,0:1 → cumple WCAG AA.
 *  - El rojo `accent` sobre negro no llega a 4,5:1, así que el TEXTO rojo
 *    sobre fondo oscuro usa `accentText` (#FF4D45), que sí cumple.
 */
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';

export const colors = {
  /** Fondo general: negro casi puro. */
  bg: '#0A0A0A',
  /** Tarjetas, cabeceras y barra de pestañas. */
  surface: '#141414',
  /** Campos de texto, filas pulsadas, elementos elevados. */
  surface2: '#1E1E1E',
  border: '#2B2B2B',

  text: '#F5F5F5',
  textDim: '#A3A3A3',
  textFaint: '#737373',

  /** Rojo de acento: botones, series completadas, récords, progreso. */
  accent: '#E10600',
  /** Rojo pulsado / variante oscura para fondos de estado. */
  accentPressed: '#B30500',
  /** Fondo rojo muy oscuro (filas completadas, banners). */
  accentDim: '#2A0B0A',
  /** Rojo para TEXTO o iconos finos sobre fondos oscuros (más claro para contraste). */
  accentText: '#FF4D45',
  /** Texto sobre el rojo de acento. */
  onAccent: '#FFFFFF',

  success: '#3DDC84',
  successDim: '#0F2A1A',
  warning: '#FFB020',
  warningDim: '#2E2109',
  danger: '#FF4D45',
  dangerDim: '#2A0B0A',
  /** Fondo semitransparente tras menús y diálogos. */
  overlay: 'rgba(0, 0, 0, 0.7)',
} as const;

/** Colores para gráficas (fase 4-5): serie principal roja, secundarias en grises. */
export const chart = {
  primary: colors.accent,
  primaryArea: 'rgba(225, 6, 0, 0.18)',
  secondary: '#D4D4D4',
  tertiary: '#737373',
  grid: '#262626',
  axis: colors.textFaint,
  label: colors.textDim,
  record: colors.accentText,
  recordStroke: colors.text,
} as const;

/** Fuentes que se cargan al arrancar (layout raíz). */
export const fontAssets = {
  BebasNeue_400Regular,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
};

/** Familias. En Android, con fuentes personalizadas el peso se elige por familia, no con fontWeight. */
export const fonts = {
  display: 'BebasNeue_400Regular',
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;
/** Alto mínimo de los objetivos táctiles principales (dp). */
export const TOUCH = 56;

/**
 * Estilos de texto. `display*` (Bebas Neue) para títulos y números grandes:
 * peso, repeticiones, temporizador. Barlow para el resto.
 */
export const font = {
  displayXL: { fontFamily: fonts.display, fontSize: 64, lineHeight: 66, letterSpacing: 1 },
  displayL: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: 0.5 },
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32, letterSpacing: 0.5 },
  displayS: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24, letterSpacing: 0.5 },
  h1: { fontFamily: fonts.display, fontSize: 36, lineHeight: 38, letterSpacing: 0.5 },
  h2: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, letterSpacing: 0.5 },
  h3: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  smallBold: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  /** Etiquetas en mayúsculas (secciones, columnas). */
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  /** Cabeceras de columna compactas (tabla de series). */
  colLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4, textTransform: 'uppercase' as const },
  button: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, letterSpacing: 0.5, textTransform: 'uppercase' as const },
} as const;

/** Estilos compartidos de navegación (cabeceras y barra de pestañas). */
export const nav = {
  headerStyle: { backgroundColor: colors.bg },
  headerTitleStyle: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border, height: 68 },
  tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
  tabActive: colors.accentText,
  tabInactive: colors.textFaint,
} as const;
