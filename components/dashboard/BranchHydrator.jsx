"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setBranchContext } from "@/store/slices/branchSlice";

/** Copies the server-verified branch list into Redux for display. */
export default function BranchHydrator({ branches, canSeeAll }) {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setBranchContext({ branches, canSeeAll }));
  }, [dispatch, branches, canSeeAll]);
  return null;
}
