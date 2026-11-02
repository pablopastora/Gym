# Benchmark de apps de gimnasio de pago

> Fase 0 · Investigación realizada en noviembre de 2026.
> Muchas comparativas públicas las escriben las propias apps o sus competidores, así que los veredictos llevan sesgo comercial. Los precios cambian según el país; aquí solo sirven de referencia.

## 1. Resumen por app

| App | Enfoque | Precio Pro aprox. | Lo más valorado | Puntos débiles |
|---|---|---|---|---|
| **Hevy** | Registro rápido + comunidad | ~3 $/mes, ~24 $/año, ~75 $ de por vida | Plan gratuito muy completo, registro rápido, temporizador de descanso por ejercicio que arranca solo al marcar la serie, *Live Activity* en la pantalla de bloqueo (iOS y Android) con ±15 s / saltar, gráficas | Gratis solo permite 4 rutinas; la parte social sobra para un uso personal |
| **Strong** | Registro minimalista | ~5 $/mes, ~30 $/año | La forma más rápida de apuntar series, calculadora de calentamiento, calculadora de discos, superseries, etiquetas de serie (calentamiento / al fallo / *drop set*), medidas corporales | Gratis solo da 3 rutinas; el Pro añade poco frente a la competencia |
| **JEFIT** | Base de datos de ejercicios + analítica | Elite ~13 $/mes, ~70 $/año | Biblioteca de ejercicios muy grande con animaciones, análisis detallado, planes de 12 semanas | Anuncios en el plan gratuito, interfaz recargada |
| **Fitbod** | Entrenador con IA | Sin plan gratuito real | Genera cada sesión según equipamiento, historial y **recuperación muscular** (mapa de calor con % por músculo; por debajo del 50 % se considera fatigado), sube peso o reps automáticamente cuando algo «sale fácil» | Caja negra, poco control; flojo para programación estructurada |
| **Boostcamp** | Programas estructurados | Pro ~60-80 $/año | Más de 11.000 programas gratis, creador de programas, insignias de récord en directo, superseries y *drop sets*, plantillas de calentamiento, informe semanal. En Pro: **progresión automática** (lineal, doble progresión, ajuste por reps fallidas), gráficas de 1RM estimado, «Strength Score» y seguimiento muscular | Sin app nativa para reloj |

## 2. Funciones más valoradas (en todas las apps)

1. **Registro rápido de series**: rellena automáticamente el peso y las reps de la sesión anterior y se marca con un toque.
2. **Temporizador de descanso automático** con aviso en segundo plano y en la pantalla de bloqueo, y botones para ajustarlo.
3. **Rutinas o plantillas** editables, con reordenación y sustitución de ejercicios.
4. **Mostrar el rendimiento anterior** («la última vez: 80 kg × 10») mientras entrenas.
5. **Récords personales automáticos** y aviso visual al batirlos.
6. **Gráficas por ejercicio** (1RM estimado, volumen, mejor serie).
7. **Progresión automática** (Boostcamp Pro, Fitbod), que muchos usuarios de Hevy y Strong reclaman.
8. **Biblioteca de ejercicios con vídeo o animación** e instrucciones.
9. **Medidas corporales y peso** con gráfica.
10. **Calendario o historial** y racha de entrenamientos.
11. Extras útiles: calculadora de discos, calculadora de calentamiento, superseries, etiquetas de serie e informe semanal.

## 3. Qué implementaremos

✅ = incluido · 🟡 = versión simplificada · ❌ = descartado

| Función | Inspirada en | Estado | Nota |
|---|---|---|---|
| Registro por serie (peso, reps, RIR/RPE opcional), con relleno automático desde la sesión anterior | Hevy/Strong | ✅ | Núcleo de la fase 3 |
| Etiquetas de serie: calentamiento, normal, al fallo, *drop set* | Strong | ✅ | Las series de calentamiento no cuentan para récords ni progresión |
| Temporizador de descanso automático con notificación y vibración en segundo plano, ±15 s y saltar | Hevy | ✅ | Notificación local programada + notificación persistente |
| «La última vez» por ejercicio durante la sesión | Hevy/Strong | ✅ | |
| Cronómetro de la sesión | Todas | ✅ | |
| Rutinas editables (crear, reordenar, sustituir, duplicar) sin límite | Hevy/Strong | ✅ | |
| Plan por defecto de 4-5 días (pecho+tríceps, espalda+bíceps, pierna, hombro+abs, día 5 opcional) | — | ✅ | Requisito propio |
| **Doble progresión automática** con incrementos configurables, mantener la carga si fallas y aviso de estancamiento | Boostcamp Pro | ✅ | Adaptada al déficit (ver arquitectura) |
| Semana de descarga sugerida (cada 6-8 semanas o por fatiga) | Fitbod/Boostcamp | ✅ | Basada en reglas, no en IA |
| Récords personales (peso máx., 1RM estimado, volumen) con aviso | Boostcamp/Hevy | ✅ | |
| Gráficas por ejercicio (1RM estimado, volumen) | Todas | ✅ | |
| Calculadora de calentamiento | Strong | ✅ | Barato de hacer y muy útil |
| Calculadora de discos | Strong | 🟡 | Simple: barra de 20 kg y discos estándar |
| Superseries | Strong/Boostcamp | 🟡 | Agrupar 2 ejercicios; si hace falta, en la fase 7 |
| Mapa de recuperación muscular | Fitbod | 🟡 | Solo informativo («series por músculo esta semana»), sin IA |
| Biblioteca con imagen, músculos, instrucciones, errores comunes y equipamiento | JEFIT | ✅ | Fuentes en la sección 4 |
| Ejercicios personalizados con foto propia | Hevy/Strong | ✅ | |
| Peso corporal con media móvil de 7 días | (Happy Scale, MacroFactor) | ✅ | Ninguna de las 5 apps lo hace bien: es un punto diferencial |
| Perímetros, % de grasa y fotos con comparador | Strong/Hevy | ✅ | |
| Resumen semanal | Boostcamp | ✅ | Con ritmo hacia el objetivo |
| Registro de cardio | Hevy | ✅ | |
| Calendario y racha | Todas | ✅ | |
| Recordatorios de entreno | JEFIT | ✅ | Notificaciones locales |
| Exportar/importar copia en JSON y exportar a CSV | Strong/Hevy | ✅ | Formato propio |
| Social, *feed*, seguidores | Hevy/JEFIT | ❌ | Uso personal |
| Cuentas, nube, sincronización | Todas | ❌ | Todo en local |
| Generación de sesiones con IA | Fitbod | ❌ | Lo sustituye la progresión por reglas, que es transparente |
| Miles de programas de terceros | Boostcamp | ❌ | Solo las rutinas propias |
| App para reloj | Hevy/Strong | ❌ | Fuera de alcance |
| **Nutrición** | — | ❌ | Descartada a petición del usuario |

## 4. Fuentes de contenido para la biblioteca de ejercicios

| Fuente | Qué ofrece | Licencia | Disponibilidad y límites | Uso propuesto |
|---|---|---|---|---|
| **free-exercise-db** (github.com/yuhonas/free-exercise-db) | Más de 800 ejercicios en JSON: músculos principales y secundarios, equipamiento, nivel, instrucciones y 2 fotos JPG por ejercicio (posición inicial y final) | **Unlicense (dominio público)** | Imágenes en `raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<id>/0.jpg`, sin clave ni límite conocido | **Fuente principal**: datos de músculos y equipamiento + imágenes. Se incluye en la app (JSON dentro del APK) y las imágenes se descargan y cachean la primera vez que se ven |
| **wger** (wger.de) | API REST gratuita, ejercicios con traducción al **español** en parte del catálogo, imágenes y algunos vídeos | Código AGPL-3.0; datos de ejercicios **CC-BY-SA** (3.0 en los datos iniciales; algunas fichas indican 4.0). Cada imagen o vídeo lleva su propio autor y licencia | API pública sin clave para lectura; no encontré una política oficial de límites, así que pediremos poco y cachearemos todo | **Complementaria**: vídeos e imágenes extra cuando existan, mostrando siempre autor y licencia. *Nota: desde este entorno de desarrollo `wger.de` está bloqueado por la red; desde el móvil funcionará igual* |
| **ExerciseDB** (exercisedb.dev / AscendAPI, antes en RapidAPI) | Más de 1.300 ejercicios con **GIF animados** | El código es AGPL-3.0, pero la web indica «© AscendAPI. All rights reserved» y hay unos términos de uso aparte. Algunas fuentes dicen que esos términos prohíben cachear o almacenar datos (sin verificar) | Versión V1 gratis sin clave, con «límites estrictos y posible inestabilidad»; la versión de pago va por suscripción | **No recomendado por defecto**: la licencia de los GIF no es libre y cachearlos podría incumplir sus términos. Se podría añadir como opción si lo pides |
| **YouTube** | Vídeos de técnica | Los de cada canal | Enlace de búsqueda, sin API ni clave | Botón «Ver técnica en YouTube» que abre `youtube.com/results?search_query=<nombre del ejercicio> técnica` en la app de YouTube. No se descarga ni se incrusta nada, así que no hay problema de licencia |
| **Textos propios** | Nombre en español, notas de técnica, errores comunes | Nuestros | — | Ninguna fuente libre trae «errores comunes» ni buenas traducciones al español, así que los redactamos para los ejercicios del plan por defecto y los más habituales |

**Atribuciones**: habrá una pantalla *Ajustes → Créditos y licencias* que lista free-exercise-db (Unlicense) y wger (CC-BY-SA, con autor y licencia de cada imagen o vídeo usado). En cada ficha se indica la fuente de su imagen.

## Fuentes consultadas

- [Hevy: temporizador de descanso](https://www.hevyapp.com/features/workout-rest-timer/) · [Hevy: Live Activity](https://www.hevyapp.com/features/live-activity/) · [Ayuda de Hevy: widget Live Activity](https://help.hevyapp.com/hc/en-us/articles/35649846517399) · [Hevy en el App Store](https://apps.apple.com/il/app/id1458862350)
- [Strong en el App Store](https://apps.apple.com/gb/app/id464254577)
- [JEFIT: funciones de Elite](https://jefit.com/wp/product-tips-faq/six-unique-features-found-on-jefit-elite-app) · [JEFIT en el App Store](https://apps.apple.com/us/app/id449810000) · [Comparativa de JEFIT](https://www.jefit.com/blog/fitbod-vs-strong-vs-jefit-vs-hevy)
- [Cómo crea Fitbod tu entrenamiento](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout) · [Algoritmo de Fitbod](https://fitbod.me/blog/fitbod-algorithm) · [Reseña de Fitbod (Indie Hackers)](https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b)
- [¿Es gratis Boostcamp?](https://www.boostcamp.app/is-boostcamp-free) · [Reseña de Boostcamp](https://gainframe.app/blog/boostcamp-app-review/) · [Comparativa de Boostcamp](https://www.boostcamp.app/best/workout-apps)
- [Comparativa en español (Sensai)](https://www.sensai.fit/es/blog/hevy-vs-strong-vs-fitbod-vs-jefit)
- [free-exercise-db](https://github.com/yuhonas/free-exercise-db) · [Documentación de wger](https://wger.readthedocs.io/) · [ExerciseDB API](https://github.com/exercisedb/exercisedb-api) · [ExerciseDB OSS](https://oss.exercisedb.dev/) · [Alternativa a ExerciseDB (dev.to)](https://dev.to/furkanuruk/i-built-a-free-exercisedb-alternative-1300-exercises-with-gif-animations-5868)
