import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { View, type ColorValue } from 'react-native';

import { Icon, IconButton, type IconName } from '@/ui/components';
import { colors, nav } from '@/ui/theme';

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
        headerStyle: nav.headerStyle,
        headerTintColor: colors.text,
        headerTitleStyle: nav.headerTitleStyle,
        headerShadowVisible: false,
        headerRight: () => <HeaderActions />,
        tabBarStyle: nav.tabBarStyle,
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarLabelStyle: nav.tabBarLabelStyle,
        tabBarActiveTintColor: nav.tabActive,
        tabBarInactiveTintColor: nav.tabInactive,
      }}>
      <Tabs.Screen name="index" options={tab('Inicio', 'home-variant-outline')} />
      <Tabs.Screen name="entrenar" options={tab('Entrenar', 'dumbbell')} />
      <Tabs.Screen name="nutricion" options={tab('Nutrición', 'food-apple-outline')} />
      <Tabs.Screen name="rutinas" options={tab('Rutinas', 'clipboard-list-outline')} />
      <Tabs.Screen name="ejercicios" options={tab('Ejercicios', 'book-open-variant')} />
      <Tabs.Screen name="progreso" options={tab('Progreso', 'chart-line')} />
    </Tabs>
  );
}
