import type { Role } from "./api";

export type AppPath =
  | "/"
  | "/renew-permit"
  | "/records"
  | "/reports"
  | "/payments"
  | "/notifications"
  | "/user-management"
  | "/settings";

/** Module access by role — single source of truth for nav + route guards */
export const ROLE_MODULES: Record<Role, AppPath[]> = {
  "Head Admin": [
    "/",
    "/renew-permit",
    "/records",
    "/reports",
    "/payments",
    "/notifications",
    "/user-management",
    "/settings",
  ],
  Staff: ["/", "/renew-permit", "/records", "/reports", "/payments", "/notifications"],
  Cashier: ["/", "/records", "/payments", "/notifications"],
};

export const ROLE_FUNCTION: Record<Role, { title: string; summary: string; flow: string[] }> = {
  "Head Admin": {
    title: "Head Admin — Full System Control",
    summary: "Oversees the whole MFARPS workflow, approvals, users, fees, barangays, and settings.",
    flow: [
      "Review Staff-verified applications",
      "Approve or reject new / renew permits",
      "View rejected application history",
      "Manage users, fees, barangays, and settings",
    ],
  },
  Staff: {
    title: "Staff — Permit Processing",
    summary: "Encodes fisherfolk applications, renewals, and records; verifies documents before Head Admin approval.",
    flow: [
      "Register new / renew fisherfolk permits",
      "Check & verify pending applications",
      "Update fisherfolk & boat records",
      "Generate operational reports",
    ],
  },
  Cashier: {
    title: "Cashier — Collections",
    summary: "Receives payments and issues official receipts after Head Admin approves the permit.",
    flow: [
      "Look up approved permit records",
      "Record cash or online payments",
      "Print / save official receipts",
      "Monitor collection notifications",
    ],
  },
};

export function canAccess(role: Role, path: string) {
  const modules = ROLE_MODULES[role] || [];
  if (path === "/") return modules.includes("/");
  return modules.some((m) => m !== "/" && (path === m || path.startsWith(`${m}/`)));
}

export function canEncodePermits(role: Role) {
  return role === "Head Admin" || role === "Staff";
}

export function canEditRecords(role: Role) {
  return role === "Head Admin" || role === "Staff";
}

export function canManageFees(role: Role) {
  return role === "Head Admin";
}

export function canManageUsers(role: Role) {
  return role === "Head Admin";
}

export function canManageSettings(role: Role) {
  return role === "Head Admin";
}

export function canViewReports(role: Role) {
  return role === "Head Admin" || role === "Staff";
}

export function canProcessPayments(role: Role) {
  return role === "Head Admin" || role === "Staff" || role === "Cashier";
}

/** Permit status changes allowed for each role (system workflow) */
export function allowedPermitStatuses(role: Role): string[] {
  if (role === "Head Admin") {
    return ["Pending", "Verified", "Approved", "Rejected", "Active", "Released", "Expired"];
  }
  if (role === "Staff") {
    return ["Pending", "Verified"];
  }
  return [];
}

export function canViewRejectedHistory(role: Role) {
  return role === "Head Admin";
}

export function canUpdatePermitStatus(role: Role) {
  return allowedPermitStatuses(role).length > 0;
}
