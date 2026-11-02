import { Linking } from 'react-native';

import { Card, Screen, Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

const SOURCES = [
  {
    name: 'free-exercise-db',
    url: 'https://github.com/yuhonas/free-exercise-db',
    license: 'Unlicense (dominio público)',
    use: 'Datos base de los ejercicios (músculos, equipamiento, instrucciones originales en inglés) e imágenes.',
  },
  {
    name: 'wger',
    url: 'https://wger.de',
    license: 'CC-BY-SA (autor y licencia indicados en cada imagen o vídeo)',
    use: 'Vídeos e imágenes complementarios (a partir de la fase 6).',
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com',
    license: 'Contenido de cada canal',
    use: 'Solo se abre una búsqueda «<ejercicio> técnica»; no se descarga ni se incrusta nada.',
  },
  {
    name: 'Textos propios',
    url: null,
    license: '—',
    use: 'Nombres en español, instrucciones traducidas, notas de técnica y errores comunes.',
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
            <Txt variant="caption" color={colors.primary}>
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
