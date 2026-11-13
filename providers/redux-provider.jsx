"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";
import { hydrateFromStorage } from "@/store/actions";
import { loadPersisted, savePersisted } from "@/store/persistence";

export function ReduxProvider({ children }) {
  const [store] = useState(() => makeStore());

  // Hydrate after mount (avoids SSR mismatch), then persist every change.
  useEffect(() => {
    store.dispatch(hydrateFromStorage(loadPersisted()));
    return store.subscribe(() => savePersisted(store.getState()));
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
