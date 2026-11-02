# Propuesta de stack y arquitectura (fase 0, **pendiente de tu OK**)

## 1. Stack recomendado

| Capa | Elección | Motivo |
|---|---|---|
| Framework | **React Native + Expo (SDK estable más reciente) + TypeScript** | Un solo código, APK instalable con EAS Build o con Gradle en local, y pruebas rápidas en el móvil |
| Navegación | **expo-router** (pestañas + pilas) | Navegación basada en archivos y con tipos |
| Base de datos | **expo-sqlite + Drizzle ORM** (con migraciones) | SQLite local, consultas con tipos y migraciones versionadas para no perder datos al actualizar |
| Estado | **Zustand** para la sesión activa y el temporizador; consultas directas a SQLite para el resto | Ligero; la sesión activa se guarda en la BD en cada serie, así que no se pierde si Android cierra la app |
| UI | Componentes propios con tema oscuro y botones grandes (mín. 56 dp) + **react-native-reanimated** | Al estilo de Hevy/Strong, rápido de usar con una mano |
| Gráficas | **victory-native** (Skia) | Rendimiento fluido; líneas para peso, media móvil, 1RM y volumen |
| Imágenes/GIF | **expo-image** con caché en disco (`cachePolicy="disk"`) | Cumple «no descargar dos veces» sin código extra |
| Vídeos | **expo-video** + caché propia con expo-file-system (se descarga una vez y se reproduce desde el archivo local) | Para los vídeos de wger |
| Notificaciones | **expo-notifications** (aviso local programado al terminar el descanso, canal Android con vibración y sonido) | Funciona con la app en segundo plano o con el móvil bloqueado |
| Fotos de progreso | expo-image-picker / cámara; se guardan en el almacenamiento privado de la app | Privadas, no aparecen en la galería |
| Copias de seguridad | expo-file-system + expo-sharing (exportar) + expo-document-picker (importar) | JSON completo (opción de incluir las fotos en .zip) y CSV por tabla |
| Pruebas | Jest para la lógica pura (progresión, 1RM, media móvil, IMC, ritmo) + `tsc` + ESLint | La lógica crítica se prueba sin emulador |

### ¿Por qué no Flutter o PWA?
- **PWA** ❌: en Android no puede garantizar el aviso de fin de descanso con la pantalla bloqueada ni la vibración en segundo plano, y no es un APK. Ese temporizador es crítico.
- **Flutter** 🟰: sería igual de válido (buen rendimiento y SQLite con drift), pero Expo permite probar en el móvil al instante y generar el APK en la nube sin instalar Android Studio. No hay una razón técnica de peso para cambiar.
- **Kotlin nativo**: lo máximo en integración (servicio en primer plano con cuenta atrás en vivo), pero es mucho más lento de desarrollar. Con Expo cubrimos lo necesario.

### Aviso importante sobre Expo Go
Expo Go sirve para probar la mayoría de las pantallas, pero desde hace varias versiones de SDK tiene limitaciones con las notificaciones en Android. Para probar **el temporizador en segundo plano** de forma fiable usaremos un **APK de desarrollo** (*development build*) o el APK de *preview*. En cada fase te diré qué se puede probar con Expo Go y qué necesita el APK.

## 2. Arquitectura

```
app/                      ← pantallas (expo-router)
  (tabs)/inicio, entrenar, rutinas, ejercicios, progreso, ajustes
  calendario, sesion/[id], ejercicio/[id], rutina/[id], fotos/comparar …
src/
  db/          schema.ts (Drizzle), migraciones, seed (plan por defecto + biblioteca)
  domain/      lógica pura y testeada:
               progression.ts · oneRm.ts · records.ts · bodyTrend.ts · goals.ts · deload.ts · warmup.ts
  repositories/ acceso a datos por agregado (workouts, routines, body, exercises)
  services/    restTimer (notificaciones), mediaCache, backup (JSON/CSV), reminders
  stores/      activeSession (Zustand)
  ui/          componentes (BigButton, SetRow, RestTimerBar, Chart…), tema oscuro
assets/data/   free-exercise-db.json + traducciones al español y textos propios
docs/          benchmark.md, arquitectura.md
```

**Principio clave**: la lógica de negocio (progresión, récords, tendencias) va en `domain/` como funciones puras, sin depender de React ni de SQLite. Así se prueba con Jest y se puede cambiar sin tocar la interfaz.

## 3. Modelo de datos (borrador; se cierra en la fase 2)

- `profile` (fila única): altura, edad, sexo, lesiones, peso objetivo, fecha objetivo, unidades, incrementos (tren superior / inferior), días por semana.
- `body_weight` (fecha, kg) · `body_measurement` (fecha, cintura, pecho, brazo, muslo, cadera, % grasa) · `progress_photo` (fecha, vista frontal/lateral/espalda, ruta del archivo).
- `exercise` (id, nombre_es, fuente, id_externo, músculos principales/secundarios, equipamiento, tren superior/inferior/core, tipo compuesto/accesorio/abs → descanso por defecto, instrucciones, errores comunes, nota de técnica, imágenes, vídeo, favorito, personalizado, foto propia).
- `routine` (nombre, orden, activa) → `routine_day` (nombre, día de la semana, orden) → `routine_exercise` (orden, series, reps mín./máx., descanso en s, nota, grupo de superserie).
- `workout` (inicio, fin, routine_day_id, notas, descarga sí/no) → `workout_exercise` (orden, ejercicio, nota) → `workout_set` (orden, tipo calentamiento/normal/fallo/drop, kg, reps, RIR, RPE, completada, hora).
- `exercise_progress` (ejercicio, peso de trabajo actual, sesiones estancado, última recomendación) para que la progresión sea rápida y transparente.
- `personal_record` (ejercicio, tipo peso máx./1RM estimado/volumen, valor, set_id, fecha).
- `cardio_session` (fecha, tipo, minutos, pasos, km, notas) · `reminder` (día de la semana, hora, activo) · `media_cache` (url → ruta local, bytes, último uso).

## 4. Reglas de dominio propuestas

- **IMC** = kg / m². Con 185 cm y 95 kg sale 27,8.
- **Media móvil de 7 días**: media de los registros de los últimos 7 días naturales (si un día no hay dato, no se inventa). El resumen semanal compara la media de esta semana con la anterior.
- **Ritmo hacia el objetivo**: (peso de tendencia actual − objetivo) / semanas hasta la fecha objetivo. Por encima de 0,75 kg/semana sale aviso de «agresivo»; por encima de 1 % del peso corporal por semana, aviso fuerte. Recomendado: 0,5-0,75 kg/semana.
- **1RM estimado**: fórmula de Epley `kg × (1 + reps/30)`, solo con series de ≤ 12 reps y sin contar los calentamientos.
- **Doble progresión** (por ejercicio, solo series de trabajo):
  - Todas las series en el techo del rango (con RIR ≥ 1 si se registró) → siguiente sesión: +2,5 kg tren superior / +5 kg tren inferior (configurable) y reps al suelo del rango.
  - **Ajuste por déficit** (activado por defecto): si sube la carga del tren inferior pero la última sesión fue «justa» (RIR 0), se sugiere +2,5 kg en vez de +5. Nunca se encadenan dos subidas sin una sesión de consolidación.
  - Alguna serie por debajo del suelo → mantener la carga.
  - 3 sesiones sin mejorar (ni carga ni reps totales) → sugerir −10 % o sustituir el ejercicio.
  - La app **sugiere**; tú confirmas o cambias el peso en la sesión.
- **Descarga**: se sugiere a las 6-8 semanas desde la última, o antes si en 2 semanas seguidas hay ≥ 30 % de ejercicios estancados o el RPE medio sube. En la semana de descarga: mitad de series y la misma carga (o −10 %).
- **Descansos por defecto**: compuestos pesados 150 s (rango 2-3 min), accesorios 75 s, abs 50 s; editables por ejercicio.
- **Temporizador de descanso**: guarda la hora de fin (no una cuenta atrás en memoria) y programa una notificación local para esa hora. Al extender o reducir el descanso, se reprograma. Así sigue siendo correcto aunque Android pause la app.

## 5. Plan por fases (sin cambios respecto a lo que pediste)

1. Benchmark y arquitectura ← **esta fase**
2. Proyecto Expo, BD, migraciones, datos iniciales (plan por defecto + biblioteca), navegación con las 7 pantallas vacías, perfil, tests de dominio
3. Sesión activa, registro de series, temporizador con notificación, cronómetro, «la última vez», cardio
4. Progresión, récords, historial y gráficas por ejercicio, descarga
5. Peso, medidas, fotos, comparador, resumen semanal, objetivo y avisos
6. Biblioteca multimedia (filtros, favoritos, caché de imágenes y vídeos, ejercicios propios, créditos)
7. Calendario, recordatorios, copias de seguridad JSON/CSV, pulido, README final y APK

Tras cada fase: `tsc` + tests + exportación del bundle para comprobar que compila, commit y push, e instrucciones para probar en el móvil.
