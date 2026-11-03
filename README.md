# Gym · seguimiento de entrenamiento y recomposición

App Android personal (un solo usuario, sin cuentas) para registrar entrenamientos de gimnasio, la progresión de fuerza y la evolución corporal. Todo se guarda en el móvil (SQLite).

- **Stack:** Expo SDK 58 · React Native 0.88 · TypeScript · expo-router · expo-sqlite + Drizzle ORM · Jest
- **Documentación:** [`docs/benchmark.md`](docs/benchmark.md) (comparativa de apps y fuentes de ejercicios) · [`docs/arquitectura.md`](docs/arquitectura.md) (stack, modelo de datos y reglas)

## Estado por fases

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Benchmark y arquitectura | ✅ |
| 2 | Proyecto, base de datos, migraciones, datos iniciales, navegación, perfil y objetivo | ✅ |
| 3 | Sesión activa, temporizador de descanso, registro de series, editor de rutinas, cardio, rediseño negro/rojo | ✅ |
| 4 | Doble progresión, récords, historial y gráficas por ejercicio, descarga | ✅ |
| 5 | Peso con media móvil, medidas, fotos y comparador, resumen semanal y racha | ✅ |
| 6 | Biblioteca multimedia: 154 fichas en español, vídeos de wger con caché, filtros, ejercicios propios | ✅ |
| 7 | Calendario, recordatorios, copia de seguridad (JSON/ZIP/CSV), pulido y APK final | ⏳ |

## Requisitos

- Node.js 20 o superior (probado con Node 22) y npm
- Para probar en el móvil: la app **Expo Go** (Google Play) en la misma red wifi que el ordenador
- Para generar el APK: una cuenta gratuita en [expo.dev](https://expo.dev)

## Instalación y ejecución

```bash
npm install
npm start            # arranca Metro y muestra un QR
```

1. Abre **Expo Go** en el Android y escanea el QR.
2. Si el móvil no está en la misma red, usa `npx expo start --tunnel`.

> **Expo Go** sirve para probar todo, incluido el aviso de fin de descanso (notificación local con vibración). Solo hay una diferencia: en el **APK** el aviso usa alarmas exactas y llega al segundo aunque el móvil lleve rato bloqueado; en Expo Go Android puede retrasarlo unos segundos en reposo profundo.

## Diseño

Todo el aspecto visual está en **`src/ui/theme.ts`**: colores, fuentes, estilos de texto, navegación y colores de las gráficas. Si cambias un valor allí, cambia en toda la app.

- **Paleta:** fondo `#0A0A0A`, superficies `#141414` / `#1E1E1E`, rojo de acento `#E10600` y texto blanco/gris claro.
- **Contraste:** el texto blanco sobre rojo tiene 5,0:1 (WCAG AA). Para el texto rojo sobre fondo oscuro se usa `#FF4D45`, porque el rojo puro no llega a 4,5:1. Lo comprueba `src/ui/__tests__/theme.test.ts`.
- **Tipografía:** Bebas Neue para títulos y números grandes (peso, reps, temporizador) y Barlow para el texto, cargadas con `@expo-google-fonts`.

## Comprobaciones

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint (config de Expo)
npm test             # Jest: lógica de dominio + base de datos en memoria (node:sqlite)
npm run check        # las tres anteriores
```

## Generar el APK (EAS Build, en la nube)

```bash
npx eas-cli@latest login                  # una sola vez
npx eas-cli@latest build:configure        # una sola vez: vincula el proyecto a tu cuenta
npm run build:apk                         # = eas build -p android --profile preview
```

Al terminar, EAS muestra un enlace y un QR para descargar el `.apk`. Ábrelo en el móvil y acepta «instalar apps de origen desconocido». Los perfiles están en `eas.json`:

- `preview`: APK instalable, el que usarás normalmente.
- `development`: APK con *dev client* para desarrollar con recarga en caliente (`npx expo start --dev-client`).

## Estructura

```
src/app/            pantallas (expo-router): (tabs)/ inicio, entrenar, rutinas, ejercicios, progreso
                    + calendario, ajustes/*, rutina/[id], ejercicio/[id]
src/db/             schema.ts (Drizzle), migrations.ts (generado), seed.ts, client.ts
src/domain/         lógica pura y testeada (IMC, media móvil, objetivo, 1RM, rotación de días…)
src/data/           free-exercise-db.json, fichas curadas en español, rutina por defecto, etiquetas
src/repositories/   acceso a datos
src/hooks/          hooks de datos reactivos
src/ui/             theme.ts (único archivo de tema), componentes, sesión activa (session/)
src/services/       notificaciones (fin de descanso)
src/stores/         estado global: temporizador de descanso, selector de ejercicios
drizzle/            SQL de migraciones generado por drizzle-kit
scripts/            build-migrations.mjs, import-free-exercise-db.mjs
```

### Cambiar el modelo de datos

1. Edita `src/db/schema.ts`.
2. Ejecuta `npm run db:generate`: crea el SQL en `drizzle/` y regenera `src/db/migrations.ts`.
3. Al arrancar, la app aplica las migraciones pendientes sin perder datos.

### Actualizar la biblioteca de ejercicios

`npm run data:import [-- <commit>]` descarga free-exercise-db y regenera `src/data/free-exercise-db.json`. Si cambias el JSON o las fichas curadas (`src/data/curated.ts`), sube `LIBRARY_VERSION` en `src/db/seed.ts` para que se reapliquen. Los favoritos se conservan.

## Fuentes y licencias

- **free-exercise-db** ([yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db)), Unlicense (dominio público): datos base e imágenes de los ejercicios. Las imágenes se descargan al verlas y se guardan en caché en disco.
- **Textos en español** (nombres, instrucciones, notas de técnica y errores comunes): propios.
- **YouTube:** solo enlaces de búsqueda; no se descarga ni se incrusta nada.
- **wger** (CC-BY-SA): vídeos de técnica. La app los busca en wger.de desde el móvil la primera vez que abres un ejercicio, muestra su autor y su licencia, y los guarda en caché (expo-video).

## Vista previa en el navegador (solo desarrollo)

`npm run web` abre la app en el navegador. Es **experimental**: expo-sqlite en web usa WebAssembly + OPFS y necesita aislamiento entre orígenes (`crossOriginIsolated`). `metro.config.js` añade las cabeceras COOP/COEP a los bundles, pero no a la página HTML, así que el navegador tiene que aplicarlas aparte. Además, al recargar la página el bloqueo de OPFS puede impedir abrir la base de datos. Solo sirve para revisar la interfaz; el objetivo es Android.
