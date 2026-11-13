import { createAction } from "@reduxjs/toolkit";

// Dispatched once on the client after mount with whatever was found in localStorage.
export const hydrateFromStorage = createAction("app/hydrateFromStorage");
