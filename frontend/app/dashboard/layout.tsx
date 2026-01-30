"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { authApi } from "@/lib/api";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, user, initialized, initialize, setUser } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized) return;
    if (!token) {
      router.push("/login");
      return;
    }
    if (!user) {
      authApi
        .getMe()
        .then((me) => setUser(me))
        .catch((error) => {
          console.error("Failed to load user:", error);
        });
    }
  }, [initialized, token, user, router, setUser]);

  if (!initialized || !token) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-800">Loading...</p>
        </div>
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
