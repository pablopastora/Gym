import Constants from 'expo-constants';
import { router } from 'expo-router';
import { View } from 'react-native';

import { ListRow, SectionTitle, Screen, Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

export default function Ajustes() {
  return (
    <Screen>
      <SectionTitle>Personal</SectionTitle>
      <View style={{ borderRadius: 16, overflow: 'hidden', gap: 1 }}>
        <ListRow
          icon="account-outline"
          title="Perfil y objetivo"
          subtitle="Altura, peso, objetivo, edad, sexo y lesiones"
          onPress={() => router.push('/ajustes/perfil')}
        />
        <ListRow
          icon="dumbbell"
          title="Entrenamiento"
          subtitle="Días por semana, incrementos, descansos y modo déficit"
          onPress={() => router.push('/ajustes/entrenamiento')}
        />
        <ListRow
          icon="food-apple-outline"
          title="Nutrición y gasto"
          subtitle="Actividad diaria, ritmo, objetivo calórico y macros"
          onPress={() => router.push('/ajustes/nutricion')}
        />
      </View>
      <SectionTitle>Datos</SectionTitle>
      <View style={{ borderRadius: 16, overflow: 'hidden', gap: 1 }}>
        <ListRow
          icon="database-export-outline"
          title="Copia de seguridad"
          subtitle="Exportar (ZIP, JSON, CSV) e importar"
          onPress={() => router.push('/ajustes/copia')}
        />
        <ListRow
          icon="bell-outline"
          title="Recordatorios"
          subtitle="Aviso los días que entrenas"
          onPress={() => router.push('/ajustes/recordatorios')}
        />
        <ListRow
          icon="harddisk"
          title="Almacenamiento y caché"
          subtitle="Imágenes y vídeos descargados"
          onPress={() => router.push('/ajustes/almacenamiento')}
        />
      </View>
      <SectionTitle>Acerca de</SectionTitle>
      <View style={{ borderRadius: 16, overflow: 'hidden', gap: 1 }}>
        <ListRow
          icon="license"
          title="Créditos y licencias"
          subtitle="Fuentes de ejercicios e imágenes"
          onPress={() => router.push('/ajustes/creditos')}
        />
      </View>
      <Txt variant="caption" color={colors.textFaint} style={{ textAlign: 'center' }}>
        Versión {Constants.expoConfig?.version ?? '—'} · Todos los datos se guardan solo en este móvil.
      </Txt>
    </Screen>
  );
}
