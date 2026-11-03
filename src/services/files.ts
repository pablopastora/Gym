/**
 * Archivos propios de la app (fotos de progreso, fotos de ejercicios propios),
 * guardados en el directorio de documentos: privados y persistentes.
 * En la vista previa web (sin sistema de archivos) se guarda la URI temporal.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

export type AppDir = 'progress-photos' | 'exercise-photos';

const WEB_PREFIX = 'web:';

function dir(name: AppDir): Directory {
  const d = new Directory(Paths.document, name);
  if (!d.exists) d.create({ intermediates: true });
  return d;
}

export function appFileUri(dirName: AppDir, fileName: string): string {
  if (fileName.startsWith(WEB_PREFIX)) return fileName.slice(WEB_PREFIX.length);
  return new File(Paths.document, dirName, fileName).uri;
}

/** Copia un archivo temporal (cámara/galería) al directorio de la app. Devuelve el nombre guardado. */
export async function saveToAppDir(tempUri: string, dirName: AppDir, baseName: string): Promise<string> {
  if (Platform.OS === 'web') return WEB_PREFIX + tempUri;
  const ext = (tempUri.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'jpg';
  const fileName = `${baseName}_${Date.now()}.${ext}`;
  await new File(tempUri).copy(new File(dir(dirName), fileName));
  return fileName;
}

export function deleteAppFile(dirName: AppDir, fileName: string | null | undefined) {
  if (!fileName || fileName.startsWith(WEB_PREFIX)) return;
  try {
    const f = new File(Paths.document, dirName, fileName);
    if (f.exists) f.delete();
  } catch {
    // ya no existe
  }
}
