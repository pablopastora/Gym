import { exerciseImageUrl } from '@/data/library';

import { appFileUri } from './files';

/** Imagen principal de un ejercicio: la foto propia si la hay; si no, la de la biblioteca. */
export function exerciseThumbUri(ex: { customPhotoFile?: string | null; images: string[] }): string | undefined {
  if (ex.customPhotoFile) return appFileUri('exercise-photos', ex.customPhotoFile);
  return ex.images[0] ? exerciseImageUrl(ex.images[0]) : undefined;
}

export function customPhotoUri(fileName: string): string {
  return appFileUri('exercise-photos', fileName);
}
