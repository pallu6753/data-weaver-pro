import { useEffect, useState } from "react";

/**
 * Returns true only after the component has hydrated on the client.
 * Use to gate rendering of values that legitimately differ between
 * server and client (e.g. relative timestamps, Math.random, Date.now).
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
