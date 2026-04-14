"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to `(min-width)` for responsive dashboard chrome.
 * Server snapshot is `false` (stacked / no grid) so narrow viewports never briefly mount the drag grid.
 */
export function useMinWidth(minWidth: number) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(`(min-width: ${minWidth}px)`).matches,
    () => false,
  );
}
