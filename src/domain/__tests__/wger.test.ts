import {
  matchScore,
  MIN_SCORE,
  pickFromExerciseInfo,
  pickFromSuggestions,
  pickFromVideoList,
  searchQuery,
  shouldLookup,
} from '../wger';

describe('emparejado de nombres', () => {
  it('mismo ejercicio con variaciones de formato', () => {
    expect(matchScore('Barbell Squat', 'Barbell squats')).toBe(1);
    expect(matchScore('Leg Extensions', 'Leg Extension')).toBe(1);
  });
  it('acepta si todos los términos de wger (≥2) están en el nuestro', () => {
    expect(matchScore('Barbell Bench Press - Medium Grip', 'Bench Press')).toBeGreaterThanOrEqual(MIN_SCORE);
  });
  it('rechaza ejercicios distintos', () => {
    expect(matchScore('Barbell Bench Press - Medium Grip', 'Incline Dumbbell Fly')).toBeLessThan(MIN_SCORE);
    expect(matchScore('Lying Leg Curls', 'Leg Press')).toBeLessThan(MIN_SCORE);
    // un solo término común no basta
    expect(matchScore('Dumbbell Shoulder Press', 'Press')).toBeLessThan(MIN_SCORE);
  });
  it('consulta sin variantes', () => {
    expect(searchQuery('Barbell Bench Press - Medium Grip')).toBe('Barbell Bench Press');
    expect(searchQuery('Hyperextensions (Back Extensions)')).toBe('Hyperextensions');
  });
});

describe('formato actual (exerciseinfo)', () => {
  const json = {
    count: 3,
    results: [
      { id: 1, translations: [{ name: 'Incline Bench Press', language: 2 }], videos: [{ video: 'https://wger.de/media/a.mp4' }] },
      {
        id: 73,
        translations: [{ name: 'Press de banca', language: 4 }, { name: 'Bench Press', language: 2 }],
        videos: [
          { video: 'https://wger.de/media/b2.mp4', is_main: false, license_author: 'Otro' },
          { video: 'https://wger.de/media/b.mp4', is_main: true, license_author: 'Ana', license_title: 'CC-BY-SA 4.0' },
        ],
      },
      { id: 9, translations: [{ name: 'Bench Press' }], videos: [] },
    ],
  };
  it('elige el mejor emparejado con vídeo y prefiere el principal', () => {
    expect(pickFromExerciseInfo(json, 'Bench Press')).toEqual({
      url: 'https://wger.de/media/b.mp4',
      attribution: 'Vídeo: Ana · CC-BY-SA 4.0 · wger.de',
      wgerExerciseId: 73,
    });
  });
  it('null si ningún resultado coincide o la respuesta no es válida', () => {
    expect(pickFromExerciseInfo(json, 'Seated Calf Raise')).toBeNull();
    expect(pickFromExerciseInfo({ detail: 'Not found' }, 'Bench Press')).toBeNull();
    expect(pickFromExerciseInfo(null, 'Bench Press')).toBeNull();
  });
  it('atribución por defecto si faltan datos', () => {
    const r = pickFromExerciseInfo({ results: [{ id: 5, translations: [{ name: 'Plank' }], videos: [{ video: 'https://x/p.mp4' }] }] }, 'Plank');
    expect(r?.attribution).toBe('Vídeo: comunidad wger · CC-BY-SA · wger.de');
  });
  it('ignora URLs de vídeo no válidas', () => {
    expect(pickFromExerciseInfo({ results: [{ id: 5, translations: [{ name: 'Plank' }], videos: [{ video: '/relative.mp4' }] }] }, 'Plank')).toBeNull();
  });
});

describe('formato antiguo', () => {
  it('sugerencias → id → vídeo', () => {
    const id = pickFromSuggestions(
      { suggestions: [{ value: 'Leg Press', data: { base_id: 11 } }, { value: 'Leg Curls (laying)', data: { base_id: 12 } }] },
      'Lying Leg Curls',
    );
    expect(id).toBe(12);
    expect(pickFromVideoList({ results: [{ video: 'https://wger.de/v.mp4', license_author: 'Pepe' }] }, 12)).toEqual({
      url: 'https://wger.de/v.mp4',
      attribution: 'Vídeo: Pepe · CC-BY-SA · wger.de',
      wgerExerciseId: 12,
    });
    expect(pickFromVideoList({ results: [] }, 12)).toBeNull();
  });
});

describe('cuándo buscar', () => {
  const now = 100 * 86_400_000;
  it('busca si nunca se buscó, no si ya tiene vídeo, y repite a los 30 días', () => {
    expect(shouldLookup({ videoUrl: null, videoCheckedAt: null, nameEn: 'Plank' }, now)).toBe(true);
    expect(shouldLookup({ videoUrl: 'https://x', videoCheckedAt: null, nameEn: 'Plank' }, now)).toBe(false);
    expect(shouldLookup({ videoUrl: null, videoCheckedAt: now - 5 * 86_400_000, nameEn: 'Plank' }, now)).toBe(false);
    expect(shouldLookup({ videoUrl: null, videoCheckedAt: now - 31 * 86_400_000, nameEn: 'Plank' }, now)).toBe(true);
    expect(shouldLookup({ videoUrl: null, videoCheckedAt: null, nameEn: null }, now)).toBe(false);
  });
});
