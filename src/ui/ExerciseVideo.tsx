import { useVideoPlayer, VideoView } from 'expo-video';
import { View } from 'react-native';

import { Txt } from './components';
import { colors, radius, space } from './theme';

/**
 * Vídeo de técnica en bucle y sin sonido, con controles nativos.
 * `useCaching`: expo-video lo guarda en caché y no lo vuelve a descargar.
 */
export function ExerciseVideo({ uri, attribution }: { uri: string; attribution?: string | null }) {
  const player = useVideoPlayer({ uri, useCaching: true }, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <View style={{ gap: space.xs }}>
      <View style={{ borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2 }}>
        <VideoView player={player} style={{ width: '100%', aspectRatio: 16 / 9 }} contentFit="contain" nativeControls />
      </View>
      {attribution ? (
        <Txt variant="caption" color={colors.textFaint}>
          {attribution}
        </Txt>
      ) : null}
    </View>
  );
}
