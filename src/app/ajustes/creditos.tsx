import { Linking } from 'react-native';

import { Card, Screen, Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

const SOURCES = [
  {
    name: 'free-exercise-db',
    url: 'https://github.com/yuhonas/free-exercise-db',
    license: 'Unlicense (dominio público)',
    use: 'Datos base de los 876 ejercicios (músculos, equipamiento, instrucciones originales en inglés) e imágenes. Las imágenes se descargan al verlas y se guardan en caché.',
  },
  {
    name: 'wger',
    url: 'https://wger.de',
    license: 'CC-BY-SA (autor y licencia indicados bajo cada vídeo)',
    use: 'Vídeos de técnica. La app los busca en wger.de desde tu móvil la primera vez que abres un ejercicio y los guarda en caché. Bajo cada vídeo se muestran su autor y su licencia.',
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com',
    license: 'Contenido de cada canal',
    use: 'Solo se abre una búsqueda «<ejercicio> técnica»; no se descarga ni se incrusta nada.',
  },
  {
    name: 'USDA FoodData Central · SR28',
    url: 'https://fdc.nal.usda.gov',
    license: 'Dominio público (Gobierno de EE. UU.)',
    use: 'Valores por 100 g de los 248 alimentos básicos (USDA National Nutrient Database for Standard Reference, Release 28). Los nombres en español, las unidades y las raciones son propios. Hidratos sin fibra, como en las etiquetas europeas.',
  },
  {
    name: 'Open Food Facts',
    url: 'https://openfoodfacts.org',
    license: 'Open Database License (ODbL); imágenes CC-BY-SA',
    use: 'Productos envasados y códigos de barras. Solo se consulta cuando buscas o escaneas, identificando la app, y lo que eliges se guarda en el móvil para usarlo sin conexión.',
  },
  {
    name: 'Fórmulas',
    url: null,
    license: '—',
    use: 'Gasto basal: Mifflin-St Jeor. Caminar y correr: ecuaciones metabólicas del ACSM. Resto de actividades: MET del Compendium of Physical Activities. Todo son estimaciones, no consejo médico ni nutricional.',
  },
  {
    name: 'Textos propios',
    url: null,
    license: '—',
    use: 'Fichas en español de 154 ejercicios: nombres, instrucciones, notas de técnica y errores comunes. El resto de ejercicios muestra el texto original en inglés.',
  },
  {
    name: 'Tus fotos',
    url: null,
    license: 'Tuyas',
    use: 'Fotos de progreso y de ejercicios propios: se guardan solo dentro de la app.',
  },
];

export default function Creditos() {
  return (
    <Screen>
      {SOURCES.map((s) => (
        <Card key={s.name} onPress={s.url ? () => Linking.openURL(s.url!) : undefined}>
          <Txt variant="h3">{s.name}</Txt>
          <Txt variant="small" color={colors.textDim}>
            Licencia: {s.license}
          </Txt>
          <Txt variant="small">{s.use}</Txt>
          {s.url ? (
            <Txt variant="caption" color={colors.accentText}>
              {s.url}
            </Txt>
          ) : null}
        </Card>
      ))}
      <Txt variant="caption" color={colors.textFaint}>
        Iconos: Material Design Icons (Pictogrammers) vía @expo/vector-icons.
      </Txt>
    </Screen>
  );
}
