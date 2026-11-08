/**
 * Open Food Facts (https://openfoodfacts.org): base de datos abierta de productos
 * (licencia ODbL). Sin clave de API. Se identifica la app con su propio User-Agent,
 * como piden sus condiciones de uso, y solo se consulta cuando el usuario busca o
 * escanea (la búsqueda está limitada a unas 10 peticiones por minuto).
 */
import Constants from 'expo-constants';

import { parseOffProduct, type OffFood } from '@/domain/nutrition';

const USER_AGENT = `GymPersonal/${Constants.expoConfig?.version ?? '1.0'} (app Android personal; uso no comercial)`;
const FIELDS = 'code,product_name,product_name_es,generic_name,generic_name_es,brands,nutriments,serving_quantity';
const TIMEOUT_MS = 10_000;

export class OffError extends Error {
  constructor(
    message: string,
    readonly kind: 'red' | 'servidor',
  ) {
    super(message);
  }
}

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }, signal: ctrl.signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new OffError(`Open Food Facts respondió ${res.status}. Prueba más tarde.`, 'servidor');
    return await res.json();
  } catch (e) {
    if (e instanceof OffError) throw e;
    throw new OffError('Sin conexión con Open Food Facts. Puedes usar los alimentos locales y los ya guardados.', 'red');
  } finally {
    clearTimeout(t);
  }
}

/** Producto por código de barras, o null si no existe o no tiene datos útiles. */
export async function offProductByBarcode(code: string): Promise<OffFood | null> {
  const json = (await getJson(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${FIELDS}`)) as {
    status?: number;
    product?: unknown;
  } | null;
  if (!json || json.status !== 1 || !json.product) return null;
  const f = parseOffProduct(json.product);
  return f ? { ...f, barcode: f.barcode ?? code } : null;
}

/** Búsqueda por texto (productos vendidos en España primero). */
export async function offSearch(query: string): Promise<OffFood[]> {
  const q = encodeURIComponent(query.trim());
  const json = (await getJson(
    `https://es.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`,
  )) as { products?: unknown[] } | null;
  return (json?.products ?? []).map(parseOffProduct).filter((f): f is OffFood => f != null);
}
