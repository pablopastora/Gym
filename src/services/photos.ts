/**
 * Fotos de progreso: se guardan SOLO en el almacenamiento privado de la app
 * (decisión 5a). No aparecen en la galería; se incluirán en la copia ZIP (fase 7).
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { db } from '@/db/client';
import type { PhotoView } from '@/domain/body';
import { addPhotoRecord, deletePhotoRecord, photosAt } from '@/repositories/body';

const DIR_NAME = 'progress-photos';

function photoDir(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Solo vista previa web (sin sistema de archivos): se guarda la URI temporal tal cual. */
const WEB_PREFIX = 'web:';

export function photoUri(fileName: string): string {
  if (fileName.startsWith(WEB_PREFIX)) return fileName.slice(WEB_PREFIX.length);
  return new File(Paths.document, DIR_NAME, fileName).uri;
}

export type PhotoSource = 'camara' | 'galeria';

/** Abre cámara o galería. Devuelve la URI temporal o null si se cancela / no hay permiso. */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: true,
    aspect: [3, 4],
  };
  if (source === 'camara') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    const r = await ImagePicker.launchCameraAsync(opts);
    return r.canceled ? null : r.assets[0].uri;
  }
  const r = await ImagePicker.launchImageLibraryAsync(opts);
  return r.canceled ? null : r.assets[0].uri;
}

/** Copia la foto al almacenamiento privado y la registra. Sustituye la de la misma fecha y vista. */
export async function savePhoto(tempUri: string, date: string, view: PhotoView) {
  if (Platform.OS === 'web') {
    for (const old of await photosAt(db, date, view)) await deletePhotoRecord(db, old.id);
    await addPhotoRecord(db, date, view, WEB_PREFIX + tempUri);
    return;
  }
  const ext = (tempUri.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase().slice(0, 4);
  const fileName = `${date}_${view}_${Date.now()}.${ext}`;
  const src = new File(tempUri);
  const dest = new File(photoDir(), fileName);
  await src.copy(dest);
  for (const old of await photosAt(db, date, view)) await removePhoto(old.id, old.fileName);
  await addPhotoRecord(db, date, view, fileName);
}

export async function removePhoto(id: number, fileName: string) {
  if (fileName.startsWith(WEB_PREFIX)) {
    await deletePhotoRecord(db, id);
    return;
  }
  try {
    const f = new File(Paths.document, DIR_NAME, fileName);
    if (f.exists) f.delete();
  } catch {
    // si el archivo ya no existe, basta con borrar el registro
  }
  await deletePhotoRecord(db, id);
}
