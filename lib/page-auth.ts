import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { hasAdminRole } from "./permissions";

export async function requireAdminPage(pathname: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  if (!hasAdminRole(user.role)) redirect("/dashboard?notice=admin-access-required");
  return user;
}
