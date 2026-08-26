import { useCallback, useEffect, useState } from "react";
import { makeResource } from "../api";

export function useResource<T extends { id: string }>(name: string, empty: Partial<T>) {
  const resource = makeResource<T>(name);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await resource.list());
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const add = useCallback(async (patch?: Partial<T>) => {
    const created = await resource.create(patch ? { ...empty, ...patch } : empty);
    setRows((prev) => [...prev, created]);
  }, [name]);

  const update = useCallback(async (id: string, patch: Partial<T>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    await resource.update(id, patch);
  }, [name]);

  const remove = useCallback(async (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await resource.remove(id);
  }, [name]);

  return { rows, loading, add, update, remove, reload };
}
