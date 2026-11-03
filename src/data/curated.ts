/**
 * Fichas en español redactadas a mano (textos propios) para los ejercicios más
 * habituales. Se aplican encima de los datos de free-exercise-db (por `id`).
 * En la fase 6 se amplía hasta ~150 ejercicios.
 */
import type { ExerciseKind } from '@/db/schema';

import { CURATED_2 } from './curated2';

export interface CuratedExercise {
  nameEs: string;
  instructions: string[];
  commonErrors: string[];
  techniqueNote?: string;
  /** Sobrescribe la clasificación automática (compuesto/accesorio/abs). */
  kind?: ExerciseKind;
  /** Descanso específico en segundos. */
  restS?: number;
}

const CURATED_1: Record<string, CuratedExercise> = {
  // ───────────── Pecho ─────────────
  'Barbell_Bench_Press_-_Medium_Grip': {
    nameEs: 'Press de banca con barra',
    instructions: [
      'Túmbate en el banco con los ojos bajo la barra y los pies firmes en el suelo.',
      'Agarra la barra algo más ancho que los hombros, junta las escápulas y haz un ligero arco lumbar.',
      'Desciende controlando hasta tocar la parte baja del pecho, con los codos a unos 45-70° del torso.',
      'Empuja la barra hacia arriba y ligeramente hacia la cara hasta extender los brazos.',
    ],
    commonErrors: [
      'Abrir los codos a 90° (sobrecarga el hombro).',
      'Rebotar la barra en el pecho.',
      'Despegar los glúteos del banco.',
      'Perder la retracción escapular al subir.',
    ],
    techniqueNote: 'Escápulas atrás y abajo durante toda la serie. Usa siempre topes o compañero.',
    kind: 'compuesto',
    restS: 180,
  },
  Incline_Dumbbell_Press: {
    nameEs: 'Press inclinado con mancuernas',
    instructions: [
      'Ajusta el banco a 30-45° y sube las mancuernas apoyándolas en los muslos.',
      'Con las escápulas retraídas, baja las mancuernas a los lados del pecho alto.',
      'Empuja hacia arriba juntándolas ligeramente sin chocarlas.',
    ],
    commonErrors: [
      'Inclinación excesiva (pasa a ser press de hombro).',
      'Recorrido corto por usar demasiado peso.',
      'Muñecas dobladas hacia atrás.',
    ],
    techniqueNote: 'Prioriza un estiramiento controlado abajo; 30° es suficiente para el pecho alto.',
    kind: 'compuesto',
    restS: 150,
  },
  Flat_Bench_Cable_Flyes: {
    nameEs: 'Aperturas en polea (banco plano)',
    instructions: [
      'Coloca un banco plano entre dos poleas bajas y agarra un estribo en cada mano.',
      'Con los codos ligeramente flexionados, abre los brazos hasta notar estiramiento en el pecho.',
      'Cierra los brazos en arco hasta juntar las manos sobre el pecho.',
    ],
    commonErrors: ['Convertirlo en un press doblando los codos.', 'Bajar demasiado y forzar el hombro.'],
    techniqueNote: 'Piensa en «abrazar un árbol». Ángulo de codo fijo.',
  },
  Butterfly: {
    nameEs: 'Contractor de pecho (pec deck)',
    instructions: [
      'Ajusta el asiento para que las asas queden a la altura del pecho.',
      'Con la espalda apoyada, junta los brazos delante del pecho.',
      'Vuelve despacio hasta notar estiramiento sin perder la tensión.',
    ],
    commonErrors: ['Asiento demasiado bajo o alto.', 'Usar impulso y soltar el peso de golpe.'],
  },
  'Dips_-_Chest_Version': {
    nameEs: 'Fondos en paralelas (pecho)',
    instructions: [
      'Sujétate en las paralelas con los brazos extendidos.',
      'Inclina el torso hacia delante y baja flexionando los codos hasta que los hombros queden algo por debajo de los codos.',
      'Empuja hasta extender los brazos.',
    ],
    commonErrors: ['Bajar demasiado con dolor de hombro.', 'Balancear las piernas.'],
    techniqueNote: 'Si ya haces 12 reps limpias, añade peso con cinturón.',
    kind: 'compuesto',
    restS: 120,
  },
  // ───────────── Tríceps ─────────────
  'EZ-Bar_Skullcrusher': {
    nameEs: 'Press francés con barra Z',
    instructions: [
      'Túmbate en un banco plano con la barra Z sobre el pecho y los brazos extendidos.',
      'Flexiona solo los codos llevando la barra hacia la frente o justo detrás de la cabeza.',
      'Extiende los codos para volver arriba.',
    ],
    commonErrors: ['Abrir los codos hacia fuera.', 'Mover los hombros (convertirlo en un pullover).'],
    techniqueNote: 'Bajar la barra ligeramente detrás de la cabeza estira más la porción larga.',
  },
  'Triceps_Pushdown_-_Rope_Attachment': {
    nameEs: 'Extensión de tríceps en polea con cuerda',
    instructions: [
      'De pie frente a la polea alta, agarra la cuerda con los codos pegados al cuerpo.',
      'Extiende los codos y separa los extremos de la cuerda al final.',
      'Vuelve controlando hasta unos 90° de flexión.',
    ],
    commonErrors: ['Despegar los codos del torso.', 'Inclinarse y empujar con el peso del cuerpo.'],
  },
  Cable_Rope_Overhead_Triceps_Extension: {
    nameEs: 'Extensión de tríceps por encima de la cabeza en polea',
    instructions: [
      'De espaldas a la polea, sujeta la cuerda detrás de la cabeza con los codos apuntando al frente.',
      'Extiende los codos llevando las manos hacia delante y arriba.',
      'Vuelve despacio hasta notar estiramiento en el tríceps.',
    ],
    commonErrors: ['Abrir mucho los codos.', 'Arquear la zona lumbar.'],
    techniqueNote: 'Es el ejercicio que mejor trabaja la porción larga del tríceps.',
  },
  // ───────────── Espalda ─────────────
  Pullups: {
    nameEs: 'Dominadas',
    instructions: [
      'Cuélgate de la barra con agarre prono algo más ancho que los hombros.',
      'Tira de los codos hacia abajo y atrás hasta pasar la barbilla por encima de la barra.',
      'Baja controlando hasta extender casi por completo los brazos.',
    ],
    commonErrors: ['Hacer medias repeticiones.', 'Balancearse (kipping).', 'Encoger los hombros hacia las orejas.'],
    techniqueNote: 'Si no llegas al rango, usa banda o máquina asistida; si lo superas, añade lastre.',
    kind: 'compuesto',
    restS: 150,
  },
  'Wide-Grip_Lat_Pulldown': {
    nameEs: 'Jalón al pecho',
    instructions: [
      'Siéntate con los muslos bajo los rodillos y agarra la barra algo más ancho que los hombros.',
      'Saca pecho y tira de la barra hacia la parte alta del pecho llevando los codos hacia abajo.',
      'Sube controlando hasta estirar los dorsales.',
    ],
    commonErrors: ['Echarse muy atrás y tirar con la espalda baja.', 'Llevar la barra detrás de la nuca.'],
    kind: 'compuesto',
    restS: 120,
  },
  Bent_Over_Barbell_Row: {
    nameEs: 'Remo con barra',
    instructions: [
      'Con la barra en las manos, flexiona la cadera hasta que el torso quede a unos 30-45° del suelo.',
      'Manteniendo la espalda neutra, tira de la barra hacia el ombligo.',
      'Baja controlando sin perder la posición.',
    ],
    commonErrors: ['Redondear la espalda.', 'Incorporarse en cada repetición para usar impulso.'],
    techniqueNote: 'Abdomen apretado. Si la lumbar se cansa antes que la espalda, usa remo apoyado.',
    kind: 'compuesto',
    restS: 180,
  },
  Seated_Cable_Rows: {
    nameEs: 'Remo en polea baja',
    instructions: [
      'Siéntate con las rodillas ligeramente flexionadas y agarra el triángulo.',
      'Con el torso erguido, tira hacia el abdomen juntando las escápulas.',
      'Estira los brazos dejando que las escápulas se separen, sin balancear el torso.',
    ],
    commonErrors: ['Balancear el torso adelante y atrás.', 'Tirar solo con los brazos.'],
    kind: 'compuesto',
    restS: 120,
  },
  'One-Arm_Dumbbell_Row': {
    nameEs: 'Remo con mancuerna a una mano',
    instructions: [
      'Apoya una rodilla y la mano del mismo lado en un banco, con la espalda paralela al suelo.',
      'Tira de la mancuerna hacia la cadera llevando el codo atrás.',
      'Baja estirando completamente el brazo.',
    ],
    commonErrors: ['Girar el torso para subir más peso.', 'Tirar hacia el hombro en vez de hacia la cadera.'],
    restS: 90,
  },
  Face_Pull: {
    nameEs: 'Face pull',
    instructions: [
      'Coloca la cuerda en la polea a la altura de la cara y agárrala con las palmas hacia abajo.',
      'Tira hacia la cara separando las manos y rotando los hombros hacia fuera.',
      'Vuelve despacio.',
    ],
    commonErrors: ['Usar demasiado peso y tirar con la espalda baja.', 'No rotar los hombros al final.'],
    techniqueNote: 'Ejercicio de salud del hombro: peso ligero y contracción controlada.',
  },
  // ───────────── Bíceps ─────────────
  'EZ-Bar_Curl': {
    nameEs: 'Curl de bíceps con barra Z',
    instructions: [
      'De pie, agarra la barra Z por los tramos inclinados con los brazos extendidos.',
      'Flexiona los codos subiendo la barra sin mover los codos hacia delante.',
      'Baja controlando hasta extender los brazos.',
    ],
    commonErrors: ['Balancear el cuerpo.', 'Adelantar los codos al subir.', 'Recorrido incompleto abajo.'],
  },
  Hammer_Curls: {
    nameEs: 'Curl martillo',
    instructions: [
      'De pie con una mancuerna en cada mano y las palmas mirándose.',
      'Flexiona los codos manteniendo el agarre neutro.',
      'Baja despacio.',
    ],
    commonErrors: ['Usar impulso con la cadera.', 'Girar las muñecas.'],
    techniqueNote: 'Trabaja el braquial y el antebrazo, lo que da grosor al brazo.',
  },
  Incline_Dumbbell_Curl: {
    nameEs: 'Curl inclinado con mancuernas',
    instructions: [
      'Siéntate en un banco a 45-60° con los brazos colgando.',
      'Flexiona los codos sin adelantarlos.',
      'Baja hasta estirar por completo el bíceps.',
    ],
    commonErrors: ['Adelantar los hombros.', 'Usar demasiado peso y acortar el recorrido.'],
  },
  // ───────────── Pierna ─────────────
  Barbell_Squat: {
    nameEs: 'Sentadilla con barra',
    instructions: [
      'Coloca la barra sobre los trapecios, saca la barra del soporte y da dos pasos atrás.',
      'Pies a la anchura de los hombros, puntas algo abiertas. Coge aire y aprieta el abdomen.',
      'Baja flexionando cadera y rodillas a la vez hasta que la cadera quede a la altura de las rodillas o por debajo.',
      'Sube empujando el suelo con todo el pie.',
    ],
    commonErrors: [
      'Rodillas que se van hacia dentro.',
      'Levantar los talones.',
      'Redondear la espalda abajo.',
      'Subir primero la cadera («good morning»).',
    ],
    techniqueNote: 'Usa siempre los seguros del rack. Profundidad constante entre repeticiones.',
    kind: 'compuesto',
    restS: 180,
  },
  Romanian_Deadlift: {
    nameEs: 'Peso muerto rumano',
    instructions: [
      'De pie con la barra en las manos y las rodillas algo flexionadas.',
      'Lleva la cadera atrás deslizando la barra pegada a los muslos con la espalda neutra.',
      'Baja hasta notar un estiramiento fuerte en los isquiotibiales (justo debajo de la rodilla).',
      'Vuelve empujando la cadera hacia delante.',
    ],
    commonErrors: ['Redondear la espalda.', 'Flexionar demasiado las rodillas (se convierte en peso muerto).', 'Alejar la barra del cuerpo.'],
    kind: 'compuesto',
    restS: 150,
  },
  Leg_Press: {
    nameEs: 'Prensa de piernas',
    instructions: [
      'Siéntate con la espalda bien apoyada y los pies a la anchura de la cadera en la plataforma.',
      'Quita los seguros y baja la plataforma flexionando las rodillas hacia el pecho.',
      'Empuja sin bloquear del todo las rodillas.',
    ],
    commonErrors: ['Despegar la zona lumbar del respaldo abajo.', 'Bloquear las rodillas arriba.', 'Recorrido muy corto.'],
    kind: 'compuesto',
    restS: 120,
  },
  Lying_Leg_Curls: {
    nameEs: 'Curl femoral tumbado',
    instructions: [
      'Túmbate boca abajo con el rodillo justo encima de los tobillos.',
      'Flexiona las rodillas llevando los talones hacia los glúteos.',
      'Baja despacio.',
    ],
    commonErrors: ['Levantar la cadera del banco.', 'Bajar de golpe.'],
  },
  Seated_Leg_Curl: {
    nameEs: 'Curl femoral sentado',
    instructions: [
      'Siéntate con la rodilla alineada con el eje de la máquina y el rodillo sobre los tobillos.',
      'Flexiona las rodillas llevando los pies hacia abajo y atrás.',
      'Vuelve controlando.',
    ],
    commonErrors: ['No ajustar el rodillo del muslo.', 'Recorrido incompleto.'],
  },
  Leg_Extensions: {
    nameEs: 'Extensión de cuádriceps',
    instructions: [
      'Siéntate con el rodillo sobre los tobillos y la rodilla alineada con el eje.',
      'Extiende las rodillas hasta tener las piernas rectas.',
      'Baja controlando.',
    ],
    commonErrors: ['Dar patadas con impulso.', 'Despegar los glúteos del asiento.'],
  },
  Standing_Calf_Raises: {
    nameEs: 'Elevación de gemelos de pie',
    instructions: [
      'Coloca la parte delantera de los pies en el escalón con los talones en el aire.',
      'Baja los talones todo lo posible.',
      'Sube de puntillas lo más alto posible y aguanta un segundo.',
    ],
    commonErrors: ['Rebotar abajo.', 'Flexionar las rodillas para ayudarse.'],
    techniqueNote: 'Pausa de 1-2 s abajo en estiramiento: es donde más crece el gemelo.',
    restS: 60,
  },
  Seated_Calf_Raise: {
    nameEs: 'Elevación de gemelos sentado',
    instructions: [
      'Siéntate con el acolchado sobre los muslos y la parte delantera del pie en la plataforma.',
      'Baja los talones al máximo y sube de puntillas.',
    ],
    commonErrors: ['Recorrido corto.', 'Ir demasiado rápido.'],
    restS: 60,
  },
  Barbell_Hip_Thrust: {
    nameEs: 'Hip thrust con barra',
    instructions: [
      'Apoya la parte alta de la espalda en un banco con la barra (con protector) sobre la cadera.',
      'Pies apoyados a la anchura de la cadera, con las rodillas a 90° arriba.',
      'Empuja la cadera hacia arriba apretando los glúteos y mirando al frente.',
      'Baja controlando.',
    ],
    commonErrors: ['Hiperextender la zona lumbar arriba.', 'Pies demasiado lejos o demasiado cerca.'],
    kind: 'compuesto',
    restS: 150,
  },
  Split_Squat_with_Dumbbells: {
    nameEs: 'Sentadilla búlgara / zancada estática con mancuernas',
    instructions: [
      'Con una mancuerna en cada mano, da un paso largo (o apoya el pie trasero en un banco para la versión búlgara).',
      'Baja la rodilla trasera hacia el suelo manteniendo el torso erguido.',
      'Sube empujando con la pierna delantera.',
    ],
    commonErrors: ['Rodilla delantera hacia dentro.', 'Paso demasiado corto.'],
    kind: 'compuesto',
    restS: 120,
  },
  Hack_Squat: {
    nameEs: 'Sentadilla hack en máquina',
    instructions: [
      'Apoya la espalda y los hombros en la máquina con los pies a la anchura de los hombros.',
      'Quita los seguros y baja hasta que los muslos queden paralelos o más abajo.',
      'Sube empujando con todo el pie.',
    ],
    commonErrors: ['Despegar los talones.', 'Recorrido corto.'],
    kind: 'compuesto',
    restS: 150,
  },
  // ───────────── Hombro ─────────────
  Standing_Military_Press: {
    nameEs: 'Press militar de pie con barra',
    instructions: [
      'Saca la barra del rack a la altura de las clavículas con agarre algo más ancho que los hombros.',
      'Aprieta glúteos y abdomen y empuja la barra en vertical, apartando la cabeza.',
      'Al pasar la cabeza, mete la cabeza «dentro» y bloquea arriba.',
      'Baja controlando a las clavículas.',
    ],
    commonErrors: ['Arquear demasiado la zona lumbar.', 'Empujar la barra hacia delante.', 'Usar las piernas (push press) sin querer.'],
    kind: 'compuesto',
    restS: 180,
  },
  Dumbbell_Shoulder_Press: {
    nameEs: 'Press de hombro con mancuernas',
    instructions: [
      'Sentado en un banco con respaldo vertical, sube las mancuernas a la altura de los hombros.',
      'Empuja hacia arriba hasta casi juntar las mancuernas.',
      'Baja hasta que los codos queden algo por debajo de los hombros.',
    ],
    commonErrors: ['Despegar la espalda del respaldo.', 'Recorrido muy corto.'],
    kind: 'compuesto',
    restS: 120,
  },
  Side_Lateral_Raise: {
    nameEs: 'Elevaciones laterales con mancuernas',
    instructions: [
      'De pie con una mancuerna en cada mano a los lados.',
      'Con los codos ligeramente flexionados, eleva los brazos a los lados hasta la altura de los hombros.',
      'Baja despacio.',
    ],
    commonErrors: ['Subir con impulso del cuerpo.', 'Subir los hombros hacia las orejas.', 'Peso demasiado alto.'],
    techniqueNote: 'Lleva las mancuernas «hacia fuera», no hacia arriba. Más reps y menos peso.',
  },
  Cable_Seated_Lateral_Raise: {
    nameEs: 'Elevación lateral en polea',
    instructions: [
      'Colócate de lado a una polea baja y agarra el estribo con la mano más alejada.',
      'Eleva el brazo lateralmente hasta la altura del hombro.',
      'Baja controlando sin dejar que el peso descanse.',
    ],
    commonErrors: ['Inclinar el torso para ayudarse.', 'Doblar mucho el codo.'],
    techniqueNote: 'La polea mantiene la tensión abajo, donde la mancuerna no trabaja.',
  },
  Reverse_Flyes: {
    nameEs: 'Pájaros (aperturas invertidas) con mancuernas',
    instructions: [
      'Inclina el torso hacia delante casi paralelo al suelo, con una mancuerna en cada mano.',
      'Abre los brazos a los lados con los codos ligeramente flexionados.',
      'Baja despacio.',
    ],
    commonErrors: ['Usar demasiado peso y juntar las escápulas en exceso (pasa a ser un remo).', 'Balancear el torso.'],
  },
  Dumbbell_Shrug: {
    nameEs: 'Encogimientos de hombros con mancuernas',
    instructions: [
      'De pie con una mancuerna pesada en cada mano.',
      'Eleva los hombros hacia las orejas y aguanta un segundo.',
      'Baja despacio.',
    ],
    commonErrors: ['Rotar los hombros.', 'Flexionar los codos.'],
  },
  // ───────────── Abdominales ─────────────
  Cable_Crunch: {
    nameEs: 'Crunch en polea alta',
    instructions: [
      'De rodillas frente a la polea alta, sujeta la cuerda junto a la cabeza.',
      'Flexiona la columna llevando los codos hacia los muslos.',
      'Vuelve despacio sin sentarte sobre los talones.',
    ],
    commonErrors: ['Flexionar la cadera en vez de la columna.', 'Tirar con los brazos.'],
    kind: 'abs',
  },
  Hanging_Leg_Raise: {
    nameEs: 'Elevación de piernas colgado',
    instructions: [
      'Cuélgate de una barra con los brazos extendidos.',
      'Eleva las piernas (rectas o con rodillas flexionadas) curvando la pelvis hacia arriba.',
      'Baja sin balancearte.',
    ],
    commonErrors: ['Balancearse.', 'Elevar solo las piernas sin girar la pelvis.'],
    kind: 'abs',
  },
  Ab_Roller: {
    nameEs: 'Rueda abdominal',
    instructions: [
      'De rodillas, sujeta la rueda bajo los hombros.',
      'Rueda hacia delante extendiendo el cuerpo sin hundir la zona lumbar.',
      'Vuelve contrayendo el abdomen.',
    ],
    commonErrors: ['Hundir la zona lumbar.', 'Ir más lejos de lo que puedes controlar.'],
    kind: 'abs',
  },
  Plank: {
    nameEs: 'Plancha',
    instructions: [
      'Apóyate en antebrazos y puntas de los pies con el cuerpo recto.',
      'Aprieta glúteos y abdomen y aguanta la posición.',
    ],
    commonErrors: ['Cadera demasiado alta o hundida.', 'Contener la respiración.'],
    kind: 'abs',
  },
};

/** Todas las fichas en español (fase 2 + fase 6). */
export const CURATED: Record<string, CuratedExercise> = { ...CURATED_1, ...CURATED_2 };
