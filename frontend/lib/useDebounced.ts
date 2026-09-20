"use client";

import { useEffect, useState } from "react";

// Trails `value` by `ms`, so typing in a filter box does not fire a request per keystroke.
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
