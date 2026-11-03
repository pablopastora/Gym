/** Caché de imágenes (expo-image, en disco) y vídeos (expo-video). */
import { Image } from 'expo-image';
import { clearVideoCacheAsync, getCurrentVideoCacheSize, setVideoCacheSizeAsync } from 'expo-video';
import { Platform } from 'react-native';

/** Tamaño máximo de la caché de vídeo (se descartan los menos usados al llenarse). */
export const VIDEO_CACHE_BYTES = 400 * 1024 * 1024;

/** Llamar al arrancar, antes de crear reproductores. */
export async function setupMediaCache() {
  if (Platform.OS === 'web') return;
  try {
    await setVideoCacheSizeAsync(VIDEO_CACHE_BYTES);
  } catch {
    // ya hay un reproductor creado: se aplicará en el siguiente arranque
  }
}

export function videoCacheSize(): number | null {
  if (Platform.OS === 'web') return null;
  try {
    return getCurrentVideoCacheSize();
  } catch {
    return null;
  }
}

export async function clearMediaCache(): Promise<{ images: boolean; videos: boolean }> {
  const images = await Image.clearDiskCache().catch(() => false);
  let videos = false;
  if (Platform.OS !== 'web') {
    try {
      await clearVideoCacheAsync();
      videos = true;
    } catch {
      videos = false;
    }
  }
  return { images: !!images, videos };
}
