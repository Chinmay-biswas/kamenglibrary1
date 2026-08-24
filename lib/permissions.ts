export function isAdmin(email?: string | null) {
  return isSuperAdmin(email);
}

export function isSuperAdmin(email?: string | null) {
  if (!email) return false;
  return (process.env.SUPER_ADMIN_EMAIL ?? "").split(",").map((value) => value.trim().toLowerCase()).includes(email.toLowerCase());
}

export function hasAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
