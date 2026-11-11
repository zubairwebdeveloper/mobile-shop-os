import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  announcementDismissed: false,
  mobileNavOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    dismissAnnouncement(state) {
      state.announcementDismissed = true;
    },
    setMobileNavOpen(state, action) {
      state.mobileNavOpen = Boolean(action.payload);
    },
  },
});

export const { dismissAnnouncement, setMobileNavOpen } = uiSlice.actions;
export default uiSlice.reducer;
