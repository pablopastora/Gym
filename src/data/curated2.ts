/**
 * Fase 6: ampliación de las fichas en español (textos propios) hasta ~160 ejercicios.
 * Mismo formato que `curated.ts`; se combinan en `CURATED`.
 */
import type { CuratedExercise } from './curated';

const c = (
  nameEs: string,
  instructions: string[],
  commonErrors: string[],
  extra: Partial<Pick<CuratedExercise, 'techniqueNote' | 'kind' | 'restS'>> = {},
): CuratedExercise => ({ nameEs, instructions, commonErrors, ...extra });

export const CURATED_2: Record<string, CuratedExercise> = {
  // ───────────── Pecho ─────────────
  Dumbbell_Bench_Press: c(
    'Press de banca con mancuernas',
    [
      'Túmbate en el banco con una mancuerna en cada mano a la altura del pecho.',
      'Junta las escápulas y empuja las mancuernas hacia arriba hasta casi tocarse.',
      'Baja controlando hasta notar estiramiento en el pecho.',
    ],
    ['Bajar poco por usar demasiado peso.', 'Abrir los codos a 90°.'],
    { kind: 'compuesto', restS: 150 },
  ),
  'Barbell_Incline_Bench_Press_-_Medium_Grip': c(
    'Press inclinado con barra',
    [
      'Ajusta el banco a 30-45° y túmbate con los ojos bajo la barra.',
      'Baja la barra a la parte alta del pecho con los codos algo cerrados.',
      'Empuja en vertical hasta extender los brazos.',
    ],
    ['Banco demasiado inclinado (trabaja más el hombro).', 'Rebotar la barra en el pecho.'],
    { kind: 'compuesto', restS: 150 },
  ),
  Decline_Barbell_Bench_Press: c(
    'Press declinado con barra',
    [
      'Sujeta las piernas en el banco declinado y saca la barra con ayuda.',
      'Baja la barra a la parte baja del pecho.',
      'Empuja hasta extender los brazos.',
    ],
    ['Bajar la barra hacia el cuello.', 'Entrenar sin compañero ni seguros.'],
    { kind: 'compuesto', restS: 150 },
  ),
  Dumbbell_Flyes: c(
    'Aperturas con mancuernas',
    [
      'Túmbate con las mancuernas sobre el pecho y los codos ligeramente flexionados.',
      'Abre los brazos en arco hasta notar estiramiento en el pecho.',
      'Cierra los brazos manteniendo el ángulo del codo.',
    ],
    ['Doblar mucho los codos (se convierte en un press).', 'Bajar más allá de lo cómodo para el hombro.'],
  ),
  Incline_Dumbbell_Flyes: c(
    'Aperturas inclinadas con mancuernas',
    [
      'En un banco a 30°, sujeta las mancuernas sobre el pecho.',
      'Abre los brazos en arco con los codos semiflexionados.',
      'Vuelve juntando las mancuernas sin chocarlas.',
    ],
    ['Peso excesivo que obliga a doblar los codos.', 'Perder la retracción escapular.'],
  ),
  Incline_Cable_Flye: c(
    'Aperturas en polea (banco inclinado)',
    [
      'Coloca un banco inclinado entre dos poleas bajas.',
      'Con los codos ligeramente flexionados, junta las manos sobre el pecho alto.',
      'Vuelve despacio hasta notar estiramiento.',
    ],
    ['Tirar con los brazos en vez de con el pecho.', 'Soltar la tensión abajo.'],
  ),
  Machine_Bench_Press: c(
    'Press de pecho en máquina',
    [
      'Ajusta el asiento para que las asas queden a la altura del pecho medio.',
      'Empuja hasta casi extender los brazos.',
      'Vuelve controlando sin que las placas choquen.',
    ],
    ['Asiento mal ajustado.', 'Despegar la espalda del respaldo.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Smith_Machine_Bench_Press: c(
    'Press de banca en multipower',
    [
      'Coloca el banco para que la barra baje a la parte baja del pecho.',
      'Desbloquea la barra, bájala controlando y empuja.',
      'Bloquea la barra al terminar la serie.',
    ],
    ['Banco mal centrado bajo la barra.', 'Olvidar los topes de seguridad.'],
    { kind: 'compuesto', restS: 150 },
  ),
  Smith_Machine_Incline_Bench_Press: c(
    'Press inclinado en multipower',
    [
      'Coloca un banco a 30-45° bajo la barra del multipower.',
      'Baja la barra a la parte alta del pecho.',
      'Empuja hasta extender los brazos.',
    ],
    ['Banco demasiado inclinado.', 'Rebotar en el pecho.'],
    { kind: 'compuesto', restS: 150 },
  ),
  Pushups: c(
    'Flexiones',
    [
      'Apoya las manos algo más abiertas que los hombros con el cuerpo recto.',
      'Baja el pecho hasta casi tocar el suelo con los codos a unos 45°.',
      'Empuja hasta extender los brazos.',
    ],
    ['Hundir la cadera.', 'Recorrido corto.', 'Abrir los codos a 90°.'],
    { kind: 'compuesto', restS: 90, techniqueNote: 'Si superas el rango, añade un lastre en la espalda o eleva los pies.' },
  ),
  'Close-Grip_Barbell_Bench_Press': c(
    'Press de banca agarre cerrado',
    [
      'Agarra la barra a la anchura de los hombros.',
      'Baja a la parte baja del pecho con los codos pegados al cuerpo.',
      'Empuja extendiendo los codos.',
    ],
    ['Agarre demasiado estrecho (dolor de muñeca).', 'Abrir los codos.'],
    { kind: 'compuesto', restS: 120, techniqueNote: 'Básico de tríceps: permite mucha carga.' },
  ),
  Leverage_Incline_Chest_Press: c(
    'Press inclinado en máquina',
    [
      'Ajusta el asiento para que las asas queden a la altura del pecho alto.',
      'Empuja hacia arriba y adelante.',
      'Vuelve despacio hasta notar estiramiento.',
    ],
    ['Encoger los hombros.', 'Bajar sin control.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Cable_Crossover: c(
    'Cruces en polea alta',
    [
      'Agarra los estribos de las poleas altas y da un paso al frente.',
      'Con los codos semiflexionados, junta las manos delante de la cadera.',
      'Vuelve despacio abriendo los brazos.',
    ],
    ['Inclinarse demasiado y usar el peso del cuerpo.', 'Doblar y estirar los codos.'],
  ),
  'Straight-Arm_Dumbbell_Pullover': c(
    'Pullover con mancuerna',
    [
      'Túmbate en un banco sujetando una mancuerna con ambas manos sobre el pecho.',
      'Lleva la mancuerna por detrás de la cabeza con los brazos casi rectos.',
      'Vuelve a la posición inicial.',
    ],
    ['Bajar demasiado y forzar el hombro.', 'Doblar mucho los codos.'],
  ),
  // ───────────── Espalda ─────────────
  'Chin-Up': c(
    'Dominadas supinas',
    [
      'Cuélgate con las palmas hacia ti a la anchura de los hombros.',
      'Tira hasta pasar la barbilla por encima de la barra.',
      'Baja controlando hasta extender los brazos.',
    ],
    ['Medias repeticiones.', 'Balancearse.'],
    { kind: 'compuesto', restS: 150 },
  ),
  'Close-Grip_Front_Lat_Pulldown': c(
    'Jalón al pecho agarre estrecho',
    [
      'Siéntate y agarra la barra con las manos juntas.',
      'Tira hacia el pecho llevando los codos hacia abajo.',
      'Sube controlando.',
    ],
    ['Echarse muy atrás.', 'Tirar con los bíceps.'],
    { kind: 'compuesto', restS: 120 },
  ),
  'V-Bar_Pulldown': c(
    'Jalón con agarre neutro (triángulo)',
    [
      'Engancha el triángulo a la polea alta y siéntate.',
      'Tira hacia la parte alta del pecho sacando pecho.',
      'Sube hasta estirar los dorsales.',
    ],
    ['Encoger los hombros.', 'Balancear el torso.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Underhand_Cable_Pulldowns: c(
    'Jalón al pecho supino',
    [
      'Agarra la barra con las palmas hacia ti a la anchura de los hombros.',
      'Tira hacia el pecho llevando los codos junto al cuerpo.',
      'Sube controlando.',
    ],
    ['Echarse atrás.', 'Recorrido corto arriba.'],
    { kind: 'compuesto', restS: 120 },
  ),
  'Straight-Arm_Pulldown': c(
    'Pullover en polea alta',
    [
      'De pie frente a la polea alta, agarra la barra con los brazos casi rectos.',
      'Lleva la barra hasta los muslos con los brazos rectos.',
      'Vuelve despacio.',
    ],
    ['Doblar los codos (se convierte en un jalón).', 'Mover el torso.'],
  ),
  'T-Bar_Row_with_Handle': c(
    'Remo en T',
    [
      'Colócate sobre la barra con la espalda neutra y el torso inclinado.',
      'Tira del agarre hacia el abdomen.',
      'Baja controlando.',
    ],
    ['Redondear la espalda.', 'Incorporarse para mover el peso.'],
    { kind: 'compuesto', restS: 150 },
  ),
  'Bent_Over_Two-Dumbbell_Row': c(
    'Remo con mancuernas inclinado',
    [
      'Con una mancuerna en cada mano, inclina el torso con la espalda neutra.',
      'Tira de las mancuernas hacia la cadera.',
      'Baja estirando los brazos.',
    ],
    ['Redondear la espalda.', 'Usar impulso.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Leverage_Iso_Row: c(
    'Remo en máquina',
    [
      'Ajusta el asiento y apoya el pecho en el respaldo.',
      'Tira de las asas llevando los codos atrás.',
      'Vuelve hasta estirar.',
    ],
    ['Despegar el pecho del apoyo.', 'Encoger los hombros.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Leverage_High_Row: c(
    'Remo alto en máquina',
    [
      'Siéntate y agarra las asas por encima de la cabeza.',
      'Tira hacia abajo y atrás juntando las escápulas.',
      'Vuelve controlando.',
    ],
    ['Tirar solo con los brazos.', 'Recorrido corto.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Barbell_Deadlift: c(
    'Peso muerto convencional',
    [
      'Pies a la anchura de la cadera con la barra sobre el centro del pie.',
      'Agarra la barra, baja la cadera, saca pecho y tensa la espalda.',
      'Levanta empujando el suelo y manteniendo la barra pegada al cuerpo.',
      'Baja con el mismo recorrido.',
    ],
    ['Redondear la espalda.', 'Alejar la barra de las piernas.', 'Tirar con los brazos.'],
    { kind: 'compuesto', restS: 180, techniqueNote: 'En déficit, mantén 1-3 reps en reserva: fatiga mucho.' },
  ),
  Sumo_Deadlift: c(
    'Peso muerto sumo',
    [
      'Pies muy abiertos con las puntas hacia fuera y la barra pegada a las espinillas.',
      'Agarra la barra entre las piernas con la espalda neutra.',
      'Empuja el suelo abriendo las rodillas hasta incorporarte.',
    ],
    ['Rodillas hacia dentro.', 'Cadera demasiado alta al empezar.'],
    { kind: 'compuesto', restS: 180 },
  ),
  Trap_Bar_Deadlift: c(
    'Peso muerto con barra hexagonal',
    [
      'Colócate dentro de la barra y agarra las asas.',
      'Con la espalda neutra, empuja el suelo hasta quedar de pie.',
      'Baja controlando.',
    ],
    ['Redondear la espalda.', 'Bloquear las rodillas antes que la cadera.'],
    { kind: 'compuesto', restS: 180 },
  ),
  Hyperextensions_Back_Extensions: c(
    'Hiperextensiones lumbares',
    [
      'Colócate en el banco con la cadera apoyada y los pies sujetos.',
      'Baja el torso con la espalda neutra.',
      'Sube hasta alinear el cuerpo, sin hiperextender.',
    ],
    ['Subir de más arqueando la zona lumbar.', 'Hacerlo con impulso.'],
    { kind: 'accesorio', restS: 75 },
  ),
  Inverted_Row: c(
    'Remo invertido',
    [
      'Cuélgate bajo una barra baja con el cuerpo recto y los talones en el suelo.',
      'Tira del pecho hacia la barra.',
      'Baja controlando.',
    ],
    ['Hundir la cadera.', 'Recorrido corto.'],
    { kind: 'compuesto', restS: 90 },
  ),
  'Seated_One-arm_Cable_Pulley_Rows': c(
    'Remo en polea a una mano',
    [
      'Sentado frente a la polea baja, agarra el estribo con una mano.',
      'Tira hacia la cadera llevando el codo atrás.',
      'Estira el brazo dejando que la escápula avance.',
    ],
    ['Girar el torso.', 'Tirar hacia el hombro.'],
  ),
  'Reverse_Grip_Bent-Over_Rows': c(
    'Remo con barra agarre supino',
    [
      'Agarra la barra con las palmas hacia arriba e inclina el torso.',
      'Tira hacia el ombligo con los codos pegados.',
      'Baja controlando.',
    ],
    ['Redondear la espalda.', 'Incorporarse en cada repetición.'],
    { kind: 'compuesto', restS: 150 },
  ),
  'Band_Assisted_Pull-Up': c(
    'Dominadas asistidas con banda',
    [
      'Engancha una banda en la barra y apoya en ella las rodillas o los pies.',
      'Tira hasta pasar la barbilla por encima de la barra.',
      'Baja controlando.',
    ],
    ['Rebotar abajo con la banda.', 'Medias repeticiones.'],
    { kind: 'compuesto', restS: 120, techniqueNote: 'Usa una banda más fina cuando llegues al techo del rango.' },
  ),
  Rack_Pulls: c(
    'Peso muerto desde soportes (rack pull)',
    [
      'Coloca la barra en los soportes a la altura de las rodillas.',
      'Agarra la barra con la espalda neutra y el pecho fuera.',
      'Empuja la cadera hacia delante hasta quedar de pie.',
    ],
    ['Hiperextender la espalda arriba.', 'Redondear la espalda.'],
    { kind: 'compuesto', restS: 180 },
  ),
  Good_Morning: c(
    'Buenos días con barra',
    [
      'Con la barra sobre los trapecios, flexiona ligeramente las rodillas.',
      'Lleva la cadera atrás inclinando el torso con la espalda neutra.',
      'Vuelve empujando la cadera hacia delante.',
    ],
    ['Redondear la espalda.', 'Usar demasiado peso.'],
    { kind: 'compuesto', restS: 120 },
  ),
  // ───────────── Hombro ─────────────
  Seated_Barbell_Military_Press: c(
    'Press militar sentado con barra',
    [
      'Siéntate con la espalda apoyada y la barra a la altura de las clavículas.',
      'Empuja la barra en vertical.',
      'Baja controlando a las clavículas.',
    ],
    ['Arquear demasiado la zona lumbar.', 'Bajar la barra detrás de la nuca.'],
    { kind: 'compuesto', restS: 150 },
  ),
  Machine_Shoulder_Military_Press: c(
    'Press de hombro en máquina',
    [
      'Ajusta el asiento para que las asas queden a la altura de los hombros.',
      'Empuja hacia arriba sin bloquear del todo los codos.',
      'Baja controlando.',
    ],
    ['Despegar la espalda.', 'Recorrido corto.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Leverage_Shoulder_Press: c(
    'Press de hombro en máquina convergente',
    ['Siéntate con la espalda apoyada.', 'Empuja las asas hacia arriba.', 'Baja hasta la altura de las orejas.'],
    ['Encoger los hombros.', 'Bajar sin control.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Arnold_Dumbbell_Press: c(
    'Press Arnold',
    [
      'Sentado, sujeta las mancuernas delante de la cara con las palmas hacia ti.',
      'Empuja hacia arriba girando las palmas hacia delante.',
      'Baja deshaciendo el giro.',
    ],
    ['Ir demasiado rápido.', 'Arquear la espalda.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Front_Dumbbell_Raise: c(
    'Elevaciones frontales con mancuernas',
    ['De pie, sujeta las mancuernas delante de los muslos.', 'Eleva los brazos al frente hasta la altura de los hombros.', 'Baja despacio.'],
    ['Balancear el cuerpo.', 'Subir por encima de los hombros.'],
  ),
  Cable_Rear_Delt_Fly: c(
    'Pájaros en polea',
    [
      'Cruza los cables de las poleas altas y agarra cada uno con la mano contraria.',
      'Abre los brazos hacia atrás a la altura de los hombros.',
      'Vuelve controlando.',
    ],
    ['Juntar demasiado las escápulas.', 'Usar impulso.'],
  ),
  Reverse_Machine_Flyes: c(
    'Pájaros en máquina (contractor inverso)',
    ['Siéntate mirando al respaldo con las asas a la altura de los hombros.', 'Abre los brazos hacia atrás.', 'Vuelve despacio.'],
    ['Usar demasiado peso.', 'Encoger los hombros.'],
  ),
  Upright_Barbell_Row: c(
    'Remo al mentón con barra',
    [
      'De pie, agarra la barra algo más ancho que los hombros.',
      'Sube la barra pegada al cuerpo llevando los codos hacia arriba y afuera.',
      'Para a la altura del pecho y baja.',
    ],
    ['Agarre demasiado estrecho.', 'Subir por encima del pecho si molesta el hombro.'],
  ),
  Barbell_Shrug: c(
    'Encogimientos con barra',
    ['Sujeta la barra delante de los muslos.', 'Eleva los hombros hacia las orejas.', 'Aguanta un segundo y baja.'],
    ['Rotar los hombros.', 'Doblar los codos.'],
  ),
  Smith_Machine_Overhead_Shoulder_Press: c(
    'Press de hombro en multipower',
    ['Siéntate bajo la barra con el banco vertical.', 'Empuja la barra hacia arriba.', 'Baja hasta la barbilla.'],
    ['Banco mal colocado.', 'Arquear la espalda.'],
    { kind: 'compuesto', restS: 120 },
  ),
  'One-Arm_Incline_Lateral_Raise': c(
    'Elevación lateral tumbado de lado',
    [
      'Túmbate de lado en un banco inclinado con una mancuerna.',
      'Eleva el brazo hasta la vertical.',
      'Baja despacio.',
    ],
    ['Usar demasiado peso.', 'Girar el torso.'],
  ),
  Seated_Side_Lateral_Raise: c(
    'Elevaciones laterales sentado',
    ['Sentado en un banco, sujeta las mancuernas a los lados.', 'Eleva los brazos hasta la altura de los hombros.', 'Baja despacio.'],
    ['Encoger los hombros.', 'Subir con impulso.'],
  ),
  // ───────────── Bíceps ─────────────
  Barbell_Curl: c(
    'Curl de bíceps con barra',
    ['De pie, agarra la barra con las palmas hacia delante.', 'Flexiona los codos sin moverlos.', 'Baja hasta extender los brazos.'],
    ['Balancear el cuerpo.', 'Adelantar los codos.'],
  ),
  Dumbbell_Bicep_Curl: c(
    'Curl de bíceps con mancuernas',
    ['De pie, con una mancuerna en cada mano.', 'Flexiona los codos girando las palmas hacia arriba.', 'Baja despacio.'],
    ['Usar impulso.', 'Recorrido incompleto.'],
  ),
  Dumbbell_Alternate_Bicep_Curl: c(
    'Curl alterno con mancuernas',
    ['De pie, con una mancuerna en cada mano.', 'Sube una mancuerna girando la palma hacia arriba.', 'Baja y alterna con el otro brazo.'],
    ['Balancear el torso.', 'Ir demasiado rápido.'],
  ),
  Preacher_Curl: c(
    'Curl en banco Scott con barra',
    ['Apoya la parte trasera de los brazos en el banco Scott.', 'Flexiona los codos subiendo la barra.', 'Baja hasta casi extender.'],
    ['Bloquear de golpe abajo.', 'Despegar los brazos del apoyo.'],
  ),
  Machine_Preacher_Curls: c(
    'Curl de bíceps en máquina',
    ['Ajusta el asiento y apoya los brazos.', 'Flexiona los codos.', 'Vuelve despacio.'],
    ['Asiento mal ajustado.', 'Recorrido corto.'],
  ),
  'Cable_Hammer_Curls_-_Rope_Attachment': c(
    'Curl martillo en polea con cuerda',
    ['Agarra la cuerda en la polea baja con las palmas enfrentadas.', 'Flexiona los codos sin moverlos.', 'Baja despacio.'],
    ['Adelantar los codos.', 'Inclinarse atrás.'],
  ),
  Concentration_Curls: c(
    'Curl concentrado',
    ['Sentado, apoya el codo en la cara interna del muslo.', 'Sube la mancuerna hacia el hombro.', 'Baja despacio.'],
    ['Mover el hombro.', 'Recorrido corto.'],
  ),
  High_Cable_Curls: c(
    'Curl en polea alta (doble bíceps)',
    ['Entre dos poleas altas, agarra un estribo con cada mano.', 'Flexiona los codos llevando las manos a las orejas.', 'Vuelve despacio.'],
    ['Bajar los codos.', 'Usar impulso.'],
  ),
  Cable_Preacher_Curl: c(
    'Curl Scott en polea',
    ['Coloca el banco Scott frente a la polea baja.', 'Flexiona los codos con los brazos apoyados.', 'Baja despacio.'],
    ['Despegar los brazos.', 'Recorrido corto.'],
  ),
  Spider_Curl: c(
    'Curl araña',
    ['Túmbate boca abajo en un banco inclinado con los brazos colgando.', 'Flexiona los codos subiendo las mancuernas.', 'Baja despacio.'],
    ['Mover los hombros.', 'Peso excesivo.'],
  ),
  Standing_Biceps_Cable_Curl: c(
    'Curl de bíceps en polea baja',
    ['De pie frente a la polea baja, agarra la barra.', 'Flexiona los codos sin moverlos.', 'Baja despacio.'],
    ['Inclinarse atrás.', 'Adelantar los codos.'],
  ),
  // ───────────── Tríceps ─────────────
  Triceps_Pushdown: c(
    'Extensión de tríceps en polea con barra',
    ['De pie frente a la polea alta, agarra la barra con los codos pegados.', 'Extiende los codos.', 'Vuelve hasta unos 90°.'],
    ['Despegar los codos.', 'Inclinarse sobre la barra.'],
  ),
  'Triceps_Pushdown_-_V-Bar_Attachment': c(
    'Extensión de tríceps en polea con barra en V',
    ['Agarra la barra en V con los codos pegados al cuerpo.', 'Extiende los codos.', 'Vuelve despacio.'],
    ['Mover los hombros.', 'Usar el peso del cuerpo.'],
  ),
  Reverse_Grip_Triceps_Pushdown: c(
    'Extensión de tríceps en polea agarre supino',
    ['Agarra la barra con las palmas hacia arriba.', 'Extiende los codos manteniéndolos pegados.', 'Vuelve despacio.'],
    ['Peso excesivo.', 'Doblar las muñecas.'],
  ),
  'Dips_-_Triceps_Version': c(
    'Fondos en paralelas (tríceps)',
    ['Sujétate en las paralelas con el torso vertical.', 'Baja flexionando los codos hacia atrás.', 'Empuja hasta extender.'],
    ['Inclinarse hacia delante.', 'Bajar demasiado con dolor de hombro.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Bench_Dips: c(
    'Fondos en banco',
    ['Apoya las manos en un banco a tu espalda y los talones en el suelo.', 'Baja flexionando los codos.', 'Empuja hasta extender.'],
    ['Bajar demasiado.', 'Alejar la espalda del banco.'],
  ),
  Standing_Dumbbell_Triceps_Extension: c(
    'Extensión de tríceps con mancuerna por encima de la cabeza',
    ['Sujeta una mancuerna con ambas manos sobre la cabeza.', 'Baja la mancuerna detrás de la cabeza.', 'Extiende los codos.'],
    ['Abrir los codos.', 'Arquear la espalda.'],
  ),
  Seated_Triceps_Press: c(
    'Press francés sentado con mancuerna',
    ['Sentado con la espalda recta, sujeta la mancuerna sobre la cabeza.', 'Baja detrás de la cabeza.', 'Extiende los codos.'],
    ['Mover los codos.', 'Recorrido corto.'],
  ),
  Lying_Triceps_Press: c(
    'Press francés tumbado con barra Z',
    ['Túmbate con la barra Z sobre el pecho.', 'Baja la barra hacia la frente flexionando los codos.', 'Extiende.'],
    ['Abrir los codos.', 'Mover los hombros.'],
  ),
  Machine_Triceps_Extension: c(
    'Extensión de tríceps en máquina',
    ['Ajusta el asiento y apoya los brazos.', 'Extiende los codos.', 'Vuelve despacio.'],
    ['Asiento mal ajustado.', 'Usar impulso.'],
  ),
  Kneeling_Cable_Triceps_Extension: c(
    'Extensión de tríceps en polea de rodillas',
    ['De rodillas de espaldas a la polea, sujeta la cuerda detrás de la cabeza.', 'Extiende los codos hacia delante.', 'Vuelve despacio.'],
    ['Mover el torso.', 'Abrir los codos.'],
  ),
  Tricep_Dumbbell_Kickback: c(
    'Patada de tríceps con mancuerna',
    ['Inclina el torso con el brazo pegado al cuerpo y el codo a 90°.', 'Extiende el codo hacia atrás.', 'Vuelve despacio.'],
    ['Bajar el codo.', 'Balancear la mancuerna.'],
  ),
  // ───────────── Pierna ─────────────
  Front_Barbell_Squat: c(
    'Sentadilla frontal',
    [
      'Apoya la barra sobre los hombros delanteros con los codos altos.',
      'Baja manteniendo el torso erguido.',
      'Sube empujando con todo el pie.',
    ],
    ['Bajar los codos.', 'Inclinar el torso hacia delante.'],
    { kind: 'compuesto', restS: 180 },
  ),
  Goblet_Squat: c(
    'Sentadilla goblet',
    ['Sujeta una mancuerna o kettlebell pegada al pecho.', 'Baja entre las piernas con el torso erguido.', 'Sube empujando el suelo.'],
    ['Rodillas hacia dentro.', 'Despegar los talones.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Smith_Machine_Squat: c(
    'Sentadilla en multipower',
    ['Coloca la barra sobre los trapecios con los pies algo adelantados.', 'Baja hasta la paralela.', 'Sube empujando.'],
    ['Pies demasiado atrás.', 'Recorrido corto.'],
    { kind: 'compuesto', restS: 150 },
  ),
  Barbell_Lunge: c(
    'Zancada con barra',
    ['Con la barra en los trapecios, da un paso largo al frente.', 'Baja la rodilla trasera hacia el suelo.', 'Vuelve a la posición inicial.'],
    ['Paso demasiado corto.', 'Rodilla delantera hacia dentro.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Barbell_Walking_Lunge: c(
    'Zancadas caminando con barra',
    ['Con la barra en los trapecios, avanza dando zancadas.', 'Baja la rodilla trasera cerca del suelo en cada paso.', 'Mantén el torso erguido.'],
    ['Perder el equilibrio por pasos cortos.', 'Inclinarse hacia delante.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Dumbbell_Lunges: c(
    'Zancadas con mancuernas',
    ['Con una mancuerna en cada mano, da un paso al frente.', 'Baja hasta que ambas rodillas formen 90°.', 'Vuelve y alterna.'],
    ['Rodilla delantera hacia dentro.', 'Torso inclinado.'],
    { kind: 'compuesto', restS: 90 },
  ),
  Dumbbell_Rear_Lunge: c(
    'Zancada hacia atrás con mancuernas',
    ['Da un paso atrás y baja la rodilla trasera.', 'Mantén el peso en la pierna delantera.', 'Vuelve a la posición inicial.'],
    ['Paso demasiado corto.', 'Perder la verticalidad.'],
    { kind: 'compuesto', restS: 90 },
  ),
  'Stiff-Legged_Dumbbell_Deadlift': c(
    'Peso muerto rumano con mancuernas',
    ['Con las mancuernas delante de los muslos, flexiona un poco las rodillas.', 'Lleva la cadera atrás bajando las mancuernas pegadas a las piernas.', 'Vuelve empujando la cadera.'],
    ['Redondear la espalda.', 'Flexionar demasiado las rodillas.'],
    { kind: 'compuesto', restS: 120 },
  ),
  'Stiff-Legged_Barbell_Deadlift': c(
    'Peso muerto piernas rígidas',
    ['Con la barra en las manos y las rodillas casi rectas.', 'Baja la barra llevando la cadera atrás con la espalda neutra.', 'Sube empujando la cadera.'],
    ['Redondear la espalda.', 'Bajar más de lo que permite la flexibilidad.'],
    { kind: 'compuesto', restS: 150 },
  ),
  Standing_Leg_Curl: c(
    'Curl femoral de pie a una pierna',
    ['Apoya el tobillo bajo el rodillo de la máquina.', 'Flexiona la rodilla llevando el talón al glúteo.', 'Baja despacio.'],
    ['Mover la cadera.', 'Ir con impulso.'],
  ),
  'Single-Leg_Leg_Extension': c(
    'Extensión de cuádriceps a una pierna',
    ['Siéntate en la máquina con un tobillo bajo el rodillo.', 'Extiende la rodilla.', 'Baja despacio.'],
    ['Dar patadas.', 'Despegar el glúteo.'],
  ),
  Narrow_Stance_Leg_Press: c(
    'Prensa con pies juntos',
    ['Coloca los pies juntos en el centro de la plataforma.', 'Baja controlando.', 'Empuja sin bloquear las rodillas.'],
    ['Despegar la zona lumbar.', 'Talones despegados.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Calf_Press_On_The_Leg_Press_Machine: c(
    'Gemelo en prensa',
    ['En la prensa, apoya solo la parte delantera de los pies en el borde.', 'Empuja con los tobillos.', 'Baja hasta estirar.'],
    ['Doblar las rodillas.', 'Recorrido corto.'],
    { restS: 60 },
  ),
  Smith_Machine_Calf_Raise: c(
    'Gemelo de pie en multipower',
    ['Con la barra en los trapecios y la punta de los pies en un escalón.', 'Sube de puntillas.', 'Baja hasta estirar.'],
    ['Rebotar.', 'Doblar las rodillas.'],
    { restS: 60 },
  ),
  Standing_Dumbbell_Calf_Raise: c(
    'Gemelo de pie con mancuerna',
    ['Con una mancuerna en la mano y el pie en un escalón.', 'Sube de puntillas.', 'Baja hasta estirar.'],
    ['Recorrido corto.', 'Ir rápido.'],
    { restS: 60 },
  ),
  Donkey_Calf_Raises: c(
    'Gemelo tipo burro',
    ['Inclina el torso apoyando las manos con la punta de los pies en un escalón.', 'Sube de puntillas.', 'Baja hasta estirar.'],
    ['Doblar las rodillas.', 'Rebotar.'],
    { restS: 60 },
  ),
  Barbell_Glute_Bridge: c(
    'Puente de glúteo con barra',
    ['Tumbado en el suelo con la barra sobre la cadera y las rodillas flexionadas.', 'Eleva la cadera apretando los glúteos.', 'Baja controlando.'],
    ['Arquear la zona lumbar.', 'Empujar con la punta de los pies.'],
    { kind: 'compuesto', restS: 120 },
  ),
  Glute_Kickback: c(
    'Patada de glúteo',
    ['En cuadrupedia, eleva una pierna hacia atrás con la rodilla flexionada.', 'Aprieta el glúteo arriba.', 'Baja despacio.'],
    ['Arquear la espalda.', 'Girar la cadera.'],
  ),
  Thigh_Abductor: c(
    'Abductores en máquina',
    ['Siéntate con las almohadillas por fuera de las rodillas.', 'Abre las piernas.', 'Vuelve despacio.'],
    ['Usar impulso.', 'Despegar la espalda.'],
  ),
  Thigh_Adductor: c(
    'Aductores en máquina',
    ['Siéntate con las almohadillas por dentro de las rodillas.', 'Cierra las piernas.', 'Vuelve despacio.'],
    ['Abrir demasiado al empezar.', 'Ir con impulso.'],
  ),
  Dumbbell_Step_Ups: c(
    'Subidas al cajón con mancuernas',
    ['Con una mancuerna en cada mano, apoya un pie en el cajón.', 'Sube empujando con la pierna de arriba.', 'Baja controlando.'],
    ['Impulsarse con la pierna de abajo.', 'Cajón demasiado alto.'],
    { kind: 'compuesto', restS: 90 },
  ),
  Box_Squat: c(
    'Sentadilla al cajón',
    ['Con la barra en los trapecios, baja hasta sentarte brevemente en el cajón.', 'Mantén la tensión sin relajarte.', 'Sube empujando.'],
    ['Dejarse caer en el cajón.', 'Rebotar.'],
    { kind: 'compuesto', restS: 180 },
  ),
  Pull_Through: c(
    'Pull-through en polea',
    ['De espaldas a la polea baja, sujeta la cuerda entre las piernas.', 'Lleva la cadera atrás con la espalda neutra.', 'Empuja la cadera hacia delante apretando glúteos.'],
    ['Tirar con los brazos.', 'Redondear la espalda.'],
  ),
  Barbell_Hack_Squat: c(
    'Sentadilla hack con barra',
    ['Sujeta la barra detrás de las piernas.', 'Baja flexionando las rodillas con el torso erguido.', 'Sube empujando con todo el pie.'],
    ['Redondear la espalda.', 'Recorrido corto.'],
    { kind: 'compuesto', restS: 150 },
  ),
  // ───────────── Abdominales ─────────────
  Crunches: c(
    'Crunch abdominal',
    ['Tumbado con las rodillas flexionadas y las manos junto a la cabeza.', 'Flexiona la columna despegando los hombros del suelo.', 'Baja despacio.'],
    ['Tirar del cuello.', 'Subir con impulso.'],
  ),
  Reverse_Crunch: c(
    'Crunch inverso',
    ['Tumbado con las piernas flexionadas en el aire.', 'Lleva las rodillas al pecho despegando la pelvis.', 'Baja despacio.'],
    ['Balancear las piernas.', 'No despegar la pelvis.'],
  ),
  Ab_Crunch_Machine: c(
    'Crunch en máquina',
    ['Ajusta la máquina y sujeta las asas.', 'Flexiona la columna llevando el pecho hacia la pelvis.', 'Vuelve despacio.'],
    ['Tirar con los brazos.', 'Flexionar la cadera en vez de la columna.'],
  ),
  Decline_Crunch: c(
    'Crunch en banco declinado',
    ['Sujeta los pies en el banco declinado.', 'Sube flexionando la columna.', 'Baja despacio sin apoyar del todo.'],
    ['Tirar del cuello.', 'Subir con impulso.'],
  ),
  Flat_Bench_Lying_Leg_Raise: c(
    'Elevación de piernas tumbado',
    ['Tumbado en un banco, sujétate por detrás de la cabeza.', 'Eleva las piernas rectas hasta la vertical.', 'Baja sin tocar el banco.'],
    ['Arquear la zona lumbar.', 'Balancearse.'],
  ),
  Russian_Twist: c(
    'Giros rusos',
    ['Sentado con el torso inclinado y los pies apoyados o en el aire.', 'Gira el torso de lado a lado.', 'Mantén la espalda recta.'],
    ['Mover solo los brazos.', 'Redondear la espalda.'],
  ),
  Pallof_Press: c(
    'Press Pallof',
    ['De lado a una polea a la altura del pecho, sujeta el estribo con ambas manos.', 'Extiende los brazos al frente sin dejar que el cuerpo gire.', 'Vuelve al pecho.'],
    ['Girar el torso.', 'Peso excesivo.'],
    { kind: 'abs' },
  ),
  Standing_Cable_Wood_Chop: c(
    'Leñador en polea',
    ['De lado a la polea alta, sujeta el estribo con ambas manos.', 'Tira en diagonal hacia la cadera contraria girando el torso.', 'Vuelve despacio.'],
    ['Tirar solo con los brazos.', 'Girar las rodillas.'],
    { kind: 'abs' },
  ),
  Oblique_Crunches: c(
    'Crunch oblicuo',
    ['Tumbado de lado o con las piernas giradas.', 'Flexiona el torso hacia el lado.', 'Baja despacio.'],
    ['Tirar del cuello.', 'Ir con impulso.'],
  ),
  Dead_Bug: c(
    'Bicho muerto (dead bug)',
    ['Tumbado boca arriba con brazos y piernas en el aire.', 'Extiende a la vez un brazo y la pierna contraria sin despegar la zona lumbar.', 'Vuelve y alterna.'],
    ['Despegar la zona lumbar.', 'Ir rápido.'],
    { kind: 'abs' },
  ),
  Mountain_Climbers: c(
    'Escaladores',
    ['En posición de plancha alta.', 'Lleva las rodillas al pecho alternando rápido.', 'Mantén la cadera baja.'],
    ['Subir la cadera.', 'Apoyar mal las manos.'],
    { kind: 'abs' },
  ),
  'Barbell_Ab_Rollout_-_On_Knees': c(
    'Rueda abdominal con barra',
    ['De rodillas, sujeta una barra con discos.', 'Rueda hacia delante sin hundir la zona lumbar.', 'Vuelve contrayendo el abdomen.'],
    ['Hundir la espalda.', 'Ir más lejos de lo que controlas.'],
    { kind: 'abs' },
  ),
  Cable_Reverse_Crunch: c(
    'Crunch inverso en polea',
    ['Tumbado con los tobillos enganchados a la polea baja.', 'Lleva las rodillas al pecho despegando la pelvis.', 'Vuelve despacio.'],
    ['Balancear.', 'Recorrido corto.'],
  ),
  Air_Bike: c(
    'Crunch bicicleta',
    ['Tumbado con las manos junto a la cabeza.', 'Lleva el codo hacia la rodilla contraria mientras estiras la otra pierna.', 'Alterna sin prisa.'],
    ['Tirar del cuello.', 'Ir demasiado rápido.'],
  ),
  Knee_Hip_Raise_On_Parallel_Bars: c(
    'Elevación de rodillas en paralelas',
    ['Apóyate en las paralelas con los brazos extendidos.', 'Eleva las rodillas al pecho curvando la pelvis.', 'Baja despacio.'],
    ['Balancearse.', 'Hundir los hombros.'],
  ),
  Weighted_Crunches: c(
    'Crunch con peso',
    ['Tumbado sujetando un disco o balón sobre el pecho.', 'Flexiona la columna.', 'Baja despacio.'],
    ['Tirar del cuello.', 'Usar impulso.'],
  ),
  // ───────────── Otros ─────────────
  Farmers_Walk: c(
    'Paseo del granjero',
    ['Sujeta una mancuerna o kettlebell pesada en cada mano.', 'Camina con el torso erguido y los hombros atrás.', 'Mantén el abdomen firme.'],
    ['Encoger los hombros.', 'Inclinarse.'],
    { kind: 'compuesto', restS: 90 },
  ),
  'Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench': c(
    'Curl de muñeca con mancuerna',
    ['Apoya el antebrazo en un banco con la palma hacia arriba.', 'Flexiona la muñeca subiendo la mancuerna.', 'Baja despacio.'],
    ['Mover el antebrazo.', 'Ir con impulso.'],
  ),
  'One-Arm_Kettlebell_Swings': c(
    'Swing con kettlebell a una mano',
    ['Con la kettlebell entre las piernas, lleva la cadera atrás.', 'Empuja la cadera hacia delante para balancear la kettlebell.', 'Déjala caer controlando.'],
    ['Hacer una sentadilla en vez de bisagra de cadera.', 'Subir con los brazos.'],
    { kind: 'compuesto', restS: 90 },
  ),
  // ───────────── Cardio ─────────────
  Running_Treadmill: c('Correr en cinta', ['Empieza caminando 3-5 min.', 'Sube a un ritmo cómodo.', 'Termina caminando.'], ['Agarrarse a la barandilla.']),
  Jogging_Treadmill: c('Trotar en cinta', ['Ritmo suave en el que puedas hablar.', 'Mantén la postura erguida.'], ['Zancada demasiado larga.']),
  Bicycling_Stationary: c('Bicicleta estática', ['Ajusta el sillín a la altura de la cadera.', 'Pedalea a ritmo constante.'], ['Sillín demasiado bajo.']),
  Elliptical_Trainer: c('Elíptica', ['Sujeta las asas y mantén la espalda recta.', 'Empuja con todo el pie.'], ['Apoyar el peso en los brazos.']),
  Rowing_Stationary: c('Remo ergómetro', ['Empuja primero con las piernas, luego cadera y por último brazos.', 'Vuelve en orden inverso.'], ['Tirar solo con los brazos.', 'Redondear la espalda.']),
  Stairmaster: c('Escaladora (Stairmaster)', ['Sube a ritmo constante sin apoyarte en las barras.', 'Mantén el torso erguido.'], ['Cargar el peso en los brazos.']),
};
