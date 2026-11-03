import { useState } from 'react';
import { Platform, View } from 'react-native';

import { formatDateLong, toISODate } from '@/domain/dates';
import {
  applyImport,
  exportBackup,
  exportCsv,
  listAutoBackups,
  pickBackup,
  restoreAutoBackup,
} from '@/services/backup';
import { showAlert } from '@/ui/alert';
import { Banner, BigButton, Card, ListRow, SectionTitle, Screen, Txt } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

export default function Copia() {
  const [busy, setBusy] = useState<string | null>(null);
  const [autos, setAutos] = useState(() => (Platform.OS === 'web' ? [] : listAutoBackups()));

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      showAlert('No se pudo completar', (e as Error).message);
    } finally {
      setBusy(null);
      if (Platform.OS !== 'web') setAutos(listAutoBackups());
    }
  };

  const importFlow = () =>
    run('import', async () => {
      const p = await pickBackup();
      if (!p) return;
      const s = p.summary;
      const date = formatDateLong(toISODate(new Date(s.exportedAt)));
      showAlert(
        'Restaurar copia',
        `Copia del ${date}: ${s.workouts} entrenos (${s.sets} series), ${s.weights} pesos, ${s.measurements} medidas, ${s.photos} fotos, ${s.routines} rutinas y ${s.customExercises} ejercicios propios.\n\nSe SUSTITUIRÁN todos los datos actuales. Antes se guarda una copia automática para poder deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sustituir',
            style: 'destructive',
            onPress: () =>
              run('import', async () => {
                await applyImport(p);
                showAlert('Copia restaurada', 'Tus datos se han sustituido por los de la copia.');
              }),
          },
        ],
      );
    });

  if (Platform.OS === 'web') {
    return (
      <Screen>
        <Banner kind="info">La copia de seguridad solo está disponible en el móvil.</Banner>
      </Screen>
    );
  }

  return (
    <Screen>
      <Txt color={colors.textDim}>
        Todo se guarda solo en este móvil. Haz una copia de vez en cuando y guárdala en Google Drive, el correo o tu
        ordenador. Si cambias de móvil o reinstalas la app, la restauras aquí.
      </Txt>

      <SectionTitle>Exportar</SectionTitle>
      <Card>
        <BigButton title="Copia completa con fotos (ZIP)" icon="folder-zip-outline" loading={busy === 'zip'} disabled={!!busy} onPress={() => run('zip', () => exportBackup(true))} />
        <BigButton title="Solo datos (JSON)" icon="code-json" kind="secondary" loading={busy === 'json'} disabled={!!busy} onPress={() => run('json', () => exportBackup(false))} />
        <BigButton title="Exportar a CSV (Excel)" icon="file-delimited-outline" kind="secondary" loading={busy === 'csv'} disabled={!!busy} onPress={() => run('csv', exportCsv)} />
        <Txt variant="caption" color={colors.textFaint}>
          El CSV usa «;» como separador y coma decimal (Excel y Google Sheets en español). Incluye series, entrenos, peso,
          medidas y cardio. Sirve para analizar tus datos, no para restaurarlos.
        </Txt>
      </Card>

      <SectionTitle>Importar</SectionTitle>
      <Card>
        <BigButton title="Restaurar desde archivo" icon="database-import-outline" kind="secondary" loading={busy === 'import'} disabled={!!busy} onPress={importFlow} />
        <Txt variant="caption" color={colors.textFaint}>
          Acepta el ZIP (con fotos) o el JSON. Los datos actuales se sustituyen por los de la copia.
        </Txt>
      </Card>

      <SectionTitle>Copias automáticas</SectionTitle>
      {autos.length ? (
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', gap: 1 }}>
          {autos.map((a) => (
            <ListRow
              key={a.name}
              icon="backup-restore"
              title={`Antes de importar · ${formatDateLong(toISODate(a.date))}`}
              subtitle={`${a.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · toca para volver a este estado`}
              onPress={() =>
                showAlert('Deshacer importación', 'Se sustituirán los datos actuales por los de esta copia automática.', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Restaurar',
                    style: 'destructive',
                    onPress: () =>
                      run('auto', async () => {
                        await restoreAutoBackup(a.name);
                        showAlert('Hecho', 'Se han recuperado los datos anteriores a la importación.');
                      }),
                  },
                ])
              }
            />
          ))}
        </View>
      ) : (
        <Txt variant="small" color={colors.textDim} style={{ marginBottom: space.md }}>
          Se crean al importar una copia (se guardan las 3 últimas).
        </Txt>
      )}
    </Screen>
  );
}
