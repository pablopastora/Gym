import { BASE_FOODS } from '@/data/foods';

import { gramsFor, isValidBarcode, macrosFor, parseOffProduct, recipeTotals, sumMacros, unitsFor, validateFood } from '../nutrition';

const pollo = { kcal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, unitG: null, servingG: 130 };
const huevo = { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0, unitG: 55, unitLabel: '1 huevo (M)', servingG: 110 };

describe('cantidades y macros por ración', () => {
  it('gramos, unidades y raciones', () => {
    expect(gramsFor(pollo, 150, 'g')).toBe(150);
    expect(gramsFor(huevo, 2, 'unidad')).toBe(110);
    expect(gramsFor(pollo, 1.5, 'racion')).toBe(195);
    expect(gramsFor(pollo, 1, 'unidad')).toBeNull();
    expect(gramsFor(pollo, 0, 'g')).toBeNull();
  });
  it('macros recalculados por gramos', () => {
    expect(macrosFor(pollo, 150)).toEqual({ kcal: 248, protein: 46.5, carbs: 0, fat: 5.4, fiber: 0 });
    expect(macrosFor(huevo, 110).kcal).toBe(157);
  });
  it('unidades disponibles según el alimento', () => {
    expect(unitsFor(huevo).map((u) => u.value)).toEqual(['g', 'unidad', 'racion']);
    expect(unitsFor(huevo)[1].label).toBe('huevo (M)');
    expect(unitsFor({ ...pollo, servingG: null }).map((u) => u.value)).toEqual(['g']);
  });
  it('suma de entradas', () => {
    expect(sumMacros([macrosFor(pollo, 100), macrosFor(huevo, 55)])).toEqual({ kcal: 165 + 79, protein: 31 + 6.9, carbs: 0.4, fat: 3.6 + 5.2, fiber: 0 });
  });
});

describe('recetas', () => {
  const arroz = { kcal: 365, protein: 7.1, carbs: 78.7, fat: 0.7, fiber: 1.3 };
  it('suma de ingredientes, por 100 g y por ración', () => {
    const t = recipeTotals(
      [
        { food: pollo, grams: 300 },
        { food: arroz, grams: 200 },
      ],
      2,
    );
    expect(t.total.kcal).toBe(495 + 730);
    expect(t.totalG).toBe(500);
    expect(t.perServing.kcal).toBe(613);
    expect(t.servingG).toBe(250);
    expect(t.per100.kcal).toBe(245);
  });
  it('con peso final cocinado, por 100 g se calcula sobre ese peso', () => {
    const t = recipeTotals([{ food: arroz, grams: 100 }], 1, 300);
    expect(t.per100.kcal).toBe(122);
    expect(t.servingG).toBe(300);
  });
});

describe('alimentos propios', () => {
  it('valida valores por 100 g', () => {
    expect(validateFood({ name: '', kcal: 100, protein: 1, carbs: 1, fat: 1 })).toMatch(/nombre/);
    expect(validateFood({ name: 'x', kcal: null, protein: 1, carbs: 1, fat: 1 })).toMatch(/kcal/);
    expect(validateFood({ name: 'x', kcal: 400, protein: 60, carbs: 40, fat: 10 })).toMatch(/100 g/);
    expect(validateFood({ name: 'Galleta', kcal: 450, protein: 7, carbs: 70, fat: 15 })).toBeNull();
  });
});

describe('Open Food Facts', () => {
  it('convierte un producto a valores por 100 g', () => {
    const f = parseOffProduct({
      code: '8410000000000',
      product_name_es: 'Yogur natural',
      brands: 'Marca, Otra',
      serving_quantity: '125',
      nutriments: { 'energy-kcal_100g': 61.4, proteins_100g: 3.6, carbohydrates_100g: 4.7, fat_100g: 3.1, fiber_100g: 0, salt_100g: 0.13 },
    });
    expect(f).toEqual({ barcode: '8410000000000', name: 'Yogur natural', brand: 'Marca', kcal: 61, protein: 3.6, carbs: 4.7, fat: 3.1, fiber: 0, salt: 0.13, servingG: 125 });
  });
  it('si solo hay kJ, los pasa a kcal', () => {
    expect(parseOffProduct({ product_name: 'X', nutriments: { energy_100g: 418.4 } })!.kcal).toBe(100);
  });
  it('descarta productos sin nombre o sin energía', () => {
    expect(parseOffProduct({ product_name: '', nutriments: { 'energy-kcal_100g': 100 } })).toBeNull();
    expect(parseOffProduct({ product_name: 'X', nutriments: {} })).toBeNull();
    expect(parseOffProduct(null)).toBeNull();
  });
  it('códigos de barras EAN-13/EAN-8 con dígito de control', () => {
    expect(isValidBarcode('4006381333931')).toBe(true);
    expect(isValidBarcode('4006381333932')).toBe(false);
    expect(isValidBarcode('96385074')).toBe(true);
    expect(isValidBarcode('abc')).toBe(false);
  });
});

describe('lista local de alimentos básicos', () => {
  it('unos 250 alimentos con claves únicas y valores coherentes', () => {
    expect(BASE_FOODS.length).toBeGreaterThanOrEqual(200);
    expect(BASE_FOODS.length).toBeLessThanOrEqual(300);
    expect(new Set(BASE_FOODS.map((f) => f.key)).size).toBe(BASE_FOODS.length);
    for (const f of BASE_FOODS) {
      expect(f.protein + f.carbs + f.fat + f.fiber).toBeLessThanOrEqual(101);
      if (f.category === 'bebida') continue; // el alcohol aporta kcal que no son macros
      // kcal ≈ 4·P + 4·(H + fibra) + 9·G (factores de Atwater; USDA usa factores específicos)
      const atwater = 4 * f.protein + 4 * (f.carbs + f.fiber) + 9 * f.fat;
      expect([f.key, Math.abs(atwater - f.kcal) <= Math.max(20, f.kcal * 0.15)]).toEqual([f.key, true]);
    }
  });
  it('incluye las categorías básicas', () => {
    const cats = new Set(BASE_FOODS.map((f) => f.category));
    for (const c of ['carne', 'pescado', 'huevo', 'lacteo', 'legumbre', 'cereal', 'fruta', 'verdura', 'grasa', 'frutos_secos']) expect(cats.has(c as never)).toBe(true);
  });
});
