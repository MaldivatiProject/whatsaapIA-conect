"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/store/authStore";

function subscribeHydration(callback: () => void) {
  return useAuthStore.persist.onFinishHydration(callback);
}

function getHydrated() {
  return useAuthStore.persist.hasHydrated();
}

function getServerHydrated() {
  return false;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const apiKey = useAuthStore((state) => state.apiKey);
  const hydrated = useSyncExternalStore(subscribeHydration, getHydrated, getServerHydrated);

  useEffect(() => {
    if (hydrated && !apiKey) {
      router.replace("/login");
    }
  }, [hydrated, apiKey, router]);

  if (!hydrated || !apiKey) {
    return null;
  }

  return <>{children}</>;
}
