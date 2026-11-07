"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setTenantContext } from "@/store/slices/tenantSlice";

/**
 * Copies SERVER-VERIFIED tenant context into Redux for display (switcher, header).
 * Redux is a UI cache only; the server re-checks membership on every protected operation.
 */
export default function TenantHydrator({ activeTenantId, tenants }) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setTenantContext({ activeTenantId, tenants }));
  }, [dispatch, activeTenantId, tenants]);

  return null;
}
