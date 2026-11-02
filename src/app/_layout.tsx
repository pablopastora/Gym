import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { db, initDb } from '@/db/client';
import migrationBundle from '@/db/migrations';
import { runSeed } from '@/db/seed';
import { setupNotifications } from '@/services/notifications';
import { Txt } from '@/ui/components';
import { RestTimerWatcher } from '@/ui/RestTimerWatcher';
import { colors, fontAssets, fonts, nav } from '@/ui/theme';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    border: colors.border,
    primary: colors.accent,
    text: colors.text,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: fonts.regular, fontWeight: 'normal' as const },
    medium: { fontFamily: fonts.medium, fontWeight: 'normal' as const },
    bold: { fontFamily: fonts.bold, fontWeight: 'normal' as const },
    heavy: { fontFamily: fonts.bold, fontWeight: 'normal' as const },
  },
};

function DbError({ error }: { error: Error }) {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Txt variant="h2">No se pudo abrir la base de datos</Txt>
      <Txt color={colors.textDim}>{error.message}</Txt>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [opened, setOpened] = useState(false);
  const [openError, setOpenError] = useState<Error | null>(null);
  useEffect(() => {
    initDb()
      .then(() => setOpened(true))
      .catch((e: Error) => setOpenError(e));
    setupNotifications().catch(() => {});
  }, []);
  if (openError) return <DbError error={openError} />;
  // Si las fuentes fallan, seguimos con las del sistema en vez de bloquear la app.
  if (!opened || (!fontsLoaded && !fontError)) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return <MigratedApp />;
}

function MigratedApp() {
  const { success, error: migrationError } = useMigrations(db, migrationBundle);
  const [ready, setReady] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success) return;
    runSeed(db)
      .then(() => setReady(true))
      .catch((e: Error) => setSeedError(e));
  }, [success]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  const error = migrationError ?? seedError;
  if (error) return <DbError error={error} />;
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <RestTimerWatcher />
      <Stack
        screenOptions={{
          headerStyle: nav.headerStyle,
          headerTintColor: colors.text,
          headerTitleStyle: nav.headerTitleStyle,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sesion/index" options={{ title: 'Entrenando', gestureEnabled: false }} />
        <Stack.Screen name="sesion/resumen/[id]" options={{ title: 'Resumen' }} />
        <Stack.Screen name="selector-ejercicio" options={{ title: 'Elegir ejercicio', presentation: 'modal' }} />
        <Stack.Screen name="cardio/nuevo" options={{ title: 'Registrar cardio' }} />
        <Stack.Screen name="calendario" options={{ title: 'Calendario' }} />
        <Stack.Screen name="ajustes/index" options={{ title: 'Ajustes' }} />
        <Stack.Screen name="ajustes/perfil" options={{ title: 'Perfil y objetivo' }} />
        <Stack.Screen name="ajustes/entrenamiento" options={{ title: 'Entrenamiento' }} />
        <Stack.Screen name="ajustes/creditos" options={{ title: 'Créditos y licencias' }} />
        <Stack.Screen name="rutina/[id]" options={{ title: 'Rutina' }} />
        <Stack.Screen name="rutina/ejercicio/[id]" options={{ title: 'Ejercicio de la rutina' }} />
        <Stack.Screen name="ejercicio/[id]" options={{ title: '' }} />
        <Stack.Screen name="ejercicio/historial/[id]" options={{ title: 'Historial' }} />
        <Stack.Screen name="records" options={{ title: 'Récords personales' }} />
        <Stack.Screen name="cuerpo/peso" options={{ title: 'Peso' }} />
        <Stack.Screen name="cuerpo/medidas" options={{ title: 'Medidas' }} />
        <Stack.Screen name="cuerpo/fotos" options={{ title: 'Fotos de progreso' }} />
        <Stack.Screen name="cuerpo/comparar" options={{ title: 'Comparar fotos' }} />
      </Stack>
    </ThemeProvider>
  );
}
