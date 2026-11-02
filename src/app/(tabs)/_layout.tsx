import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { View, type ColorValue } from 'react-native';

import { Icon, IconButton, type IconName } from '@/ui/components';
import { colors } from '@/ui/theme';

function HeaderActions() {
  return (
    <View style={{ flexDirection: 'row', marginRight: 8 }}>
      <IconButton name="calendar-month-outline" label="Calendario" onPress={() => router.push('/calendario')} />
      <IconButton name="cog-outline" label="Ajustes" onPress={() => router.push('/ajustes')} />
    </View>
  );
}

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color }: { color: ColorValue }) => <Icon name={icon} color={String(color)} size={26} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => <HeaderActions />,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 68 },
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
      }}>
      <Tabs.Screen name="index" options={tab('Inicio', 'home-variant-outline')} />
      <Tabs.Screen name="entrenar" options={tab('Entrenar', 'dumbbell')} />
      <Tabs.Screen name="rutinas" options={tab('Rutinas', 'clipboard-list-outline')} />
      <Tabs.Screen name="ejercicios" options={tab('Ejercicios', 'book-open-variant')} />
      <Tabs.Screen name="progreso" options={tab('Progreso', 'chart-line')} />
    </Tabs>
  );
}
