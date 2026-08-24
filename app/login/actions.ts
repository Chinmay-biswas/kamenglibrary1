"use server";

import { signIn } from "@/auth";

export async function signInWithMicrosoft(formData: FormData) {
  const requested = formData.get("callbackUrl");
  const redirectTo = typeof requested === "string" && requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/dashboard";
  await signIn("microsoft-entra-id", { redirectTo });
}

export async function signInWithGoogle(formData: FormData) {
  const requested = formData.get("callbackUrl");
  const redirectTo = typeof requested === "string" && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
  await signIn("google", { redirectTo });
}
