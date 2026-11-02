import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { db, initDb } from '@/db/client';
import migrationBundle from '@/db/migrations';
import { runSeed } from '@/db/seed';
import { Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
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
  const [opened, setOpened] = useState(false);
  const [openError, setOpenError] = useState<Error | null>(null);
  useEffect(() => {
    initDb()
      .then(() => setOpened(true))
      .catch((e: Error) => setOpenError(e));
  }, []);
  if (openError) return <DbError error={openError} />;
  if (!opened) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
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
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="calendario" options={{ title: 'Calendario' }} />
        <Stack.Screen name="ajustes/index" options={{ title: 'Ajustes' }} />
        <Stack.Screen name="ajustes/perfil" options={{ title: 'Perfil y objetivo' }} />
        <Stack.Screen name="ajustes/entrenamiento" options={{ title: 'Entrenamiento' }} />
        <Stack.Screen name="ajustes/creditos" options={{ title: 'Créditos y licencias' }} />
        <Stack.Screen name="rutina/[id]" options={{ title: 'Rutina' }} />
        <Stack.Screen name="ejercicio/[id]" options={{ title: 'Ejercicio' }} />
      </Stack>
    </ThemeProvider>
  );
}
