"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { messageOf } from "./api";

type Result<T> = { key: string; data?: T; error?: string };

/**
 * Runs an async loader whenever `deps` change and tracks its result.
 *
 * The previous data stays available while a reload is in flight, so a filter
 * change updates the list in place instead of flashing empty. `setData` lets a
 * page apply a successful edit locally without refetching.
 *
 * `loading` is derived by comparing the request key with the key of the last
 * result, rather than being set from inside the effect.
 */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[], enabled = true) {
  const key = JSON.stringify(deps);
  const [result, setResult] = useState<Result<T> | null>(null);
  const [nonce, setNonce] = useState(0);
  const run = useEffectEvent(load);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    run()
      .then((data) => alive && setResult({ key, data }))
      .catch((error) => alive && setResult({ key, error: messageOf(error) }));
    return () => {
      alive = false;
    };
  }, [key, nonce, enabled]);

  return {
    data: result?.data,
    error: result?.key === key ? result.error : undefined,
    loading: enabled && result?.key !== key,
    reload: () => setNonce((n) => n + 1),
    setData: (update: (current: T) => T) =>
      setResult((r) => (r && r.data !== undefined ? { ...r, data: update(r.data) } : r)),
  };
}
