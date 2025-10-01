import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  attachTonConnect,
  getMiniAppThemeManager,
  type MiniAppThemeManager,
  type MiniAppThemeState,
  type TonConnectLike,
} from "./theme-loader";

export type UseMiniAppThemeResult = {
  manager: MiniAppThemeManager;
  state: MiniAppThemeState;
};

export function useMiniAppThemeManager(
  tonConnect?: TonConnectLike | null,
): UseMiniAppThemeResult {
  const manager = useMemo(() => getMiniAppThemeManager(), []);
  const state = useSyncExternalStore<MiniAppThemeState>(
    (listener) => manager.subscribe(listener),
    () => manager.getState(),
    () => manager.getState(),
  );

  useEffect(() => {
    if (!tonConnect) {
      manager.setWalletAddress(null);
      return;
    }
    const detach = attachTonConnect(manager, tonConnect);
    return () => detach();
  }, [manager, tonConnect]);

  return { manager, state };
}
