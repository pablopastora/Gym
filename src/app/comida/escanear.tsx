import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { db } from '@/db/client';
import type { MealKey } from '@/db/schema';
import { toISODate } from '@/domain/dates';
import { isValidBarcode } from '@/domain/nutrition';
import { cacheOffFood, foodByBarcode } from '@/repositories/foods';
import { offProductByBarcode, OffError } from '@/services/openFoodFacts';
import { BigButton, Field, Txt } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

/**
 * Escáner de códigos de barras (expo-camera). Primero busca en los alimentos guardados
 * en el móvil y, si no está, en Open Food Facts (y lo guarda para usarlo sin conexión).
 */
export default function Escanear() {
  const params = useLocalSearchParams<{ date?: string; meal?: MealKey }>();
  const date = params.date ?? toISODate();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<'scan' | 'buscando' | 'no_encontrado' | 'error'>('scan');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);

  const lookup = async (raw: string) => {
    const c = raw.trim();
    if (busy.current || !c) return;
    busy.current = true;
    setCode(c);
    setStatus('buscando');
    try {
      const local = await foodByBarcode(db, c);
      if (local) {
        router.replace({ pathname: '/comida/cantidad', params: { foodId: local.id, date, meal: params.meal } });
        return;
      }
      const off = await offProductByBarcode(c);
      if (off) {
        const id = await cacheOffFood(db, off);
        router.replace({ pathname: '/comida/cantidad', params: { foodId: id, date, meal: params.meal } });
        return;
      }
      setStatus('no_encontrado');
    } catch (e) {
      setMessage(e instanceof OffError ? e.message : 'No se pudo consultar el producto.');
      setStatus('error');
    } finally {
      busy.current = false;
    }
  };

  const createOwn = () => router.replace({ pathname: '/comida/alimento', params: { barcode: code, date, meal: params.meal } });

  if (status !== 'scan') {
    return (
      <View style={styles.center}>
        {status === 'buscando' ? (
          <>
            <ActivityIndicator color={colors.accentText} size="large" />
            <Txt color={colors.textDim}>{`Buscando ${code}…`}</Txt>
          </>
        ) : (
          <>
            <Txt variant="h3" style={{ textAlign: 'center' }}>
              {status === 'no_encontrado' ? 'Producto no encontrado' : 'Sin conexión'}
            </Txt>
            <Txt color={colors.textDim} style={{ textAlign: 'center' }}>
              {status === 'no_encontrado' ? `El código ${code} no está en Open Food Facts ni en tus alimentos. Puedes crearlo con los datos de la etiqueta.` : message}
            </Txt>
            <BigButton title="Crear alimento con este código" icon="plus" onPress={createOwn} style={{ alignSelf: 'stretch' }} />
            <BigButton title="Escanear otro" icon="barcode-scan" kind="secondary" onPress={() => setStatus('scan')} style={{ alignSelf: 'stretch' }} />
          </>
        )}
      </View>
    );
  }

  if (!permission) return <View style={styles.center} />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Txt variant="h3" style={{ textAlign: 'center' }}>
          Permiso de cámara
        </Txt>
        <Txt color={colors.textDim} style={{ textAlign: 'center' }}>
          La cámara solo se usa para leer el código de barras. No se guardan imágenes.
        </Txt>
        <BigButton title="Permitir cámara" icon="camera-outline" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
        <ManualCode onSubmit={lookup} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={({ data }) => {
          if (isValidBarcode(data)) lookup(data);
        }}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.frame} />
        <Txt variant="smallBold" style={{ textAlign: 'center' }}>
          Apunta al código de barras
        </Txt>
      </View>
      <View style={styles.bottom}>
        <ManualCode onSubmit={lookup} />
      </View>
    </View>
  );
}

function ManualCode({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [v, setV] = useState('');
  return (
    <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
      <Field label="O escribe el código" keyboardType="number-pad" value={v} onChangeText={setV} returnKeyType="search" onSubmitEditing={() => onSubmit(v)} />
      <BigButton title="Buscar código" icon="magnify" kind="secondary" onPress={() => onSubmit(v)} disabled={!/^\d{8,14}$/.test(v.trim())} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: space.md },
  frame: { width: '80%', height: 160, borderWidth: 3, borderColor: colors.accent, borderRadius: radius.lg },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, backgroundColor: colors.overlay },
});
