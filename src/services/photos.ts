/**
 * Fotos de progreso: se guardan SOLO en el almacenamiento privado de la app
 * (decisión 5a). No aparecen en la galería; se incluirán en la copia ZIP (fase 7).
 */
import * as ImagePicker from 'expo-image-picker';

import { db } from '@/db/client';
import type { PhotoView } from '@/domain/body';
import { addPhotoRecord, deletePhotoRecord, photosAt } from '@/repositories/body';

import { appFileUri, deleteAppFile, saveToAppDir } from './files';

export function photoUri(fileName: string): string {
  return appFileUri('progress-photos', fileName);
}

export type PhotoSource = 'camara' | 'galeria';

/** Abre cámara o galería. Devuelve la URI temporal o null si se cancela / no hay permiso. */
export async function pickPhoto(source: PhotoSource, aspect: [number, number] = [3, 4]): Promise<string | null> {
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: true,
    aspect,
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
  const fileName = await saveToAppDir(tempUri, 'progress-photos', `${date}_${view}`);
  for (const old of await photosAt(db, date, view)) await removePhoto(old.id, old.fileName);
  await addPhotoRecord(db, date, view, fileName);
}

export async function removePhoto(id: number, fileName: string) {
  deleteAppFile('progress-photos', fileName);
  await deletePhotoRecord(db, id);
}
