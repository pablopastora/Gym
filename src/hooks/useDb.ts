import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useState } from 'react';
import { addDatabaseChangeListener } from 'expo-sqlite';

import { db } from '@/db/client';
import { profile } from '@/db/schema';

/** Perfil del usuario, reactivo a cambios. */
export function useProfile() {
  const { data } = useLiveQuery(db.select().from(profile));
  return data?.[0];
}

/**
 * Ejecuta una consulta asíncrona identificada por `key` y la repite cuando cambia la BD.
 * Para consultas relacionales o compuestas que `useLiveQuery` no cubre.
 */
export function useAsyncQuery<T>(key: string, fn: () => Promise<T>): { data: T | undefined; reload: () => void } {
  const [data, setData] = useState<T>();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    fn().then((r) => {
      if (alive) setData(r);
    });
    return () => {
      alive = false;
    };
    // `fn` se identifica por `key`: solo se vuelve a ejecutar si cambia la clave o la BD.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  useEffect(() => {
    const sub = addDatabaseChangeListener(() => setTick((t) => t + 1));
    return () => sub.remove();
  }, []);
  return { data, reload: () => setTick((t) => t + 1) };
}
