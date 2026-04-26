export function normalizeRole(role?: string | null) {
  return role?.toUpperCase() ?? "";
}

export function isAdminPortalRole(role?: string | null) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "ADMIN" || normalizedRole === "AGENT";
}

export function isSupportAgentRole(role?: string | null) {
  return normalizeRole(role) === "SUPPORT_AGENT";
}

export function isBackofficeRole(role?: string | null) {
  return isAdminPortalRole(role) || isSupportAgentRole(role);
}

export function resolveHomePathByRole(role?: string | null) {
  if (isAdminPortalRole(role)) {
    return "/admin";
  }

  if (isSupportAgentRole(role)) {
    return "/agent";
  }

  return "/dashboard";
}

export function resolveLoginPathByPathname(pathname: string) {
  if (pathname.startsWith("/admin")) {
    return "/admin/login";
  }

  if (pathname.startsWith("/agent")) {
    return "/agent/login";
  }

  return "/login";
}
