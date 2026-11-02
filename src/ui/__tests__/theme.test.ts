import { colors } from '../theme';

/** Contraste WCAG 2.x entre dos colores hex. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe('contraste de la paleta (WCAG AA ≥ 4,5 para texto normal)', () => {
  it.each([
    ['texto blanco sobre rojo de acento', colors.onAccent, colors.accent],
    ['texto sobre fondo', colors.text, colors.bg],
    ['texto sobre superficie', colors.text, colors.surface],
    ['texto atenuado sobre superficie', colors.textDim, colors.surface],
    ['texto atenuado sobre superficie elevada', colors.textDim, colors.surface2],
    ['texto rojo sobre fondo', colors.accentText, colors.bg],
    ['texto rojo sobre superficie', colors.accentText, colors.surface],
    ['texto sobre fila completada', colors.text, colors.accentDim],
    ['aviso sobre su fondo', colors.warning, colors.warningDim],
    ['éxito sobre su fondo', colors.success, colors.successDim],
  ])('%s', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto tenue (pistas) llega al menos a 3:1 sobre la superficie', () => {
    expect(contrast(colors.textFaint, colors.surface)).toBeGreaterThanOrEqual(3);
  });

  it('el rojo de acento puro NO se usa como texto pequeño sobre negro', () => {
    expect(contrast(colors.accent, colors.bg)).toBeLessThan(4.5);
  });
});
