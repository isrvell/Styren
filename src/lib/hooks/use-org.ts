"use client";

import { createContext, useContext } from "react";

export interface OrgContext {
  orgId: string;
  orgSlug: string;
  orgName: string;
  role: string;
  permissions: string[];
}

export const OrgCtx = createContext<OrgContext | null>(null);

export function useOrg() {
  const ctx = useContext(OrgCtx);
  if (!ctx) throw new Error("useOrg must be used within an OrgProvider");
  return ctx;
}

export function useHasPermission(permission: string) {
  const { permissions } = useOrg();
  return permissions.includes("*") || permissions.includes(permission);
}
