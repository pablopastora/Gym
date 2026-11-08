import { BASE_FOODS } from '@/data/foods';

import { dayPlanText, isAllowed, mealTarget, roleOf, suggestMeals, type PlannerFood } from '../mealPlanner';
import { ZERO_MACROS } from '../nutrition';

const foods = (): PlannerFood[] => BASE_FOODS.map((f, i) => ({ ...f, id: i + 1, baseKey: f.key, source: 'base' }));
const byKey = (list: PlannerFood[], k: string) => list.find((f) => f.baseKey === k)!;
const comida = { kcal: 750, protein: 55, fat: 20 };

describe('exclusiones', () => {
  it('«no me gusta» y alergia nunca se proponen', () => {
    const list = foods();
    byKey(list, 'atun_natural').pref = 'alergia';
    byKey(list, 'pollo_pechuga_plancha').pref = 'no_gusta';
    for (const meal of ['comida', 'cena'] as const) {
      const opts = suggestMeals({ foods: list, flags: [], meal, target: comida, count: 10 });
      const names = opts.flatMap((o) => o.items.map((i) => i.food.baseKey));
      expect(names).not.toContain('atun_natural');
      expect(names).not.toContain('pollo_pechuga_plancha');
    }
  });
  it('preferencias de dieta', () => {
    const list = foods();
    expect(isAllowed(byKey(list, 'pollo_pechuga_plancha'), ['vegetariano'])).toBe(false);
    expect(isAllowed(byKey(list, 'merluza_cocinada'), ['pescetariano'])).toBe(true);
    expect(isAllowed(byKey(list, 'yogur_griego_0'), ['sin_lactosa'])).toBe(false);
    expect(isAllowed(byKey(list, 'pan_integral'), ['sin_gluten'])).toBe(false);
    expect(isAllowed(byKey(list, 'almendras'), ['sin_frutos_secos'])).toBe(false);
    const veg = suggestMeals({ foods: list, flags: ['vegetariano', 'sin_lactosa'], meal: 'cena', target: comida, count: 5 });
    expect(veg.length).toBeGreaterThan(0);
    for (const o of veg)
      for (const i of o.items) {
        expect(['carne', 'pescado', 'marisco']).not.toContain(i.food.category);
        expect(i.food.tags).not.toContain('lactosa');
      }
  });
});

describe('propuestas', () => {
  it('3 opciones con proteína principal distinta que se acercan al objetivo (proteína primero)', () => {
    const opts = suggestMeals({ foods: foods(), flags: [], meal: 'comida', target: comida });
    expect(opts).toHaveLength(3);
    expect(new Set(opts.map((o) => o.items.find((i) => i.role === 'proteina')!.food.id)).size).toBe(3);
    for (const o of opts) {
      expect(o.total.protein).toBeGreaterThanOrEqual(comida.protein * 0.9);
      expect(Math.abs(o.total.kcal - comida.kcal)).toBeLessThanOrEqual(comida.kcal * 0.15);
      expect(o.items.map((i) => i.role)).toEqual(expect.arrayContaining(['proteina', 'hidrato', 'verdura']));
      expect(o.steps.length).toBe(o.items.length);
    }
  });
  it('desayuno y merienda usan proteínas ligeras (lácteos, huevo, fiambre)', () => {
    for (const meal of ['desayuno', 'merienda'] as const) {
      const opts = suggestMeals({ foods: foods(), flags: [], meal, target: { kcal: 400, protein: 30, fat: 12 } });
      expect(opts.length).toBeGreaterThan(0);
      for (const o of opts) {
        const p = o.items.find((i) => i.role === 'proteina')!.food;
        expect(['lacteo', 'huevo', 'carne']).toContain(p.category);
        if (p.category === 'carne') expect(p.name).toMatch(/fiambre|jamón cocido/i);
      }
    }
  });
  it('prioriza lo que tienes en casa y te gusta', () => {
    const list = foods();
    for (const k of ['salmon_cocinado', 'huevo', 'tofu']) byKey(list, k).inPantry = true;
    byKey(list, 'patata_cocida').pref = 'gusta';
    const opts = suggestMeals({ foods: list, flags: [], meal: 'cena', target: comida });
    for (const o of opts) {
      expect(['salmon_cocinado', 'huevo', 'tofu']).toContain(o.items.find((i) => i.role === 'proteina')!.food.baseKey);
      expect(o.items.find((i) => i.role === 'hidrato')!.food.baseKey).toBe('patata_cocida');
    }
  });
  it('raciones razonables y sin superar mucho las kcal', () => {
    const opts = suggestMeals({ foods: foods(), flags: [], meal: 'cena', target: { kcal: 450, protein: 45, fat: 12 }, count: 5 });
    for (const o of opts) {
      expect(o.total.kcal).toBeLessThanOrEqual(450 * 1.15);
      for (const i of o.items) expect(i.grams).toBeLessThanOrEqual(450);
    }
  });
  it('«otra opción» no repite lo ya visto', () => {
    const first = suggestMeals({ foods: foods(), flags: [], meal: 'comida', target: comida });
    const again = suggestMeals({ foods: foods(), flags: [], meal: 'comida', target: comida, exclude: new Set(first.map((o) => o.key)) });
    for (const o of again) expect(first.map((x) => x.key)).not.toContain(o.key);
  });
  it('papel de cada alimento', () => {
    const list = foods();
    expect(roleOf(byKey(list, 'pollo_pechuga_plancha'))).toBe('proteina');
    expect(roleOf(byKey(list, 'arroz_cocido'))).toBe('hidrato');
    expect(roleOf(byKey(list, 'brocoli_cocido'))).toBe('verdura');
    expect(roleOf(byKey(list, 'ajo'))).toBeNull();
    expect(roleOf(byKey(list, 'chorizo'))).toBeNull();
    expect(roleOf(byKey(list, 'aceite_oliva'))).toBe('grasa');
  });
});

describe('objetivo por comida', () => {
  it('reparte lo que queda entre las comidas pendientes', () => {
    const rem = { kcal: 1800, protein: 150, fat: 50 };
    // Sin nada registrado: la comida es 35/90 del resto (desayuno 25 + comida 35 + merienda 10 + cena 30 = 100 → 35 %).
    expect(mealTarget({ meal: 'comida', remaining: rem, loggedMeals: [] }).kcal).toBeCloseTo(1800 * 0.35);
    // Desayuno y comida hechos: la cena se lleva 30/40 del resto.
    expect(mealTarget({ meal: 'cena', remaining: rem, loggedMeals: ['desayuno', 'comida'] }).kcal).toBeCloseTo(1800 * 0.75);
    // Última comida: todo lo que queda.
    expect(mealTarget({ meal: 'cena', remaining: rem, loggedMeals: ['desayuno', 'comida', 'merienda'] }).kcal).toBeCloseTo(1800);
  });
});

describe('compartir el plan del día', () => {
  it('incluye objetivo, lo que llevo, lo que queda y preferencias', () => {
    const t = dayPlanText({
      dateLabel: 'lunes 9 nov',
      target: { kcal: 2200, protein: 190, carbs: 200, fat: 67 },
      consumed: { ...ZERO_MACROS, kcal: 900, protein: 70, carbs: 80, fat: 30 },
      spent: 2750,
      meals: [{ label: 'Desayuno', items: [{ name: 'Avena', grams: 60, kcal: 230 }] }],
      flags: ['Sin lactosa'],
      likes: ['Salmón'],
      pantry: ['Huevo', 'Arroz'],
      excluded: ['Atún'],
    });
    expect(t).toContain('Objetivo: 2200 kcal');
    expect(t).toContain('Llevo: 900 kcal');
    expect(t).toContain('Me queda: 1300 kcal · proteína 120 g');
    expect(t).toContain('Desayuno: Avena (60 g)');
    expect(t).toContain('Tengo en casa: Huevo, Arroz');
    expect(t).toContain('No como (no me gusta / alergia): Atún');
    expect(t).toContain('no es consejo médico');
  });
});
