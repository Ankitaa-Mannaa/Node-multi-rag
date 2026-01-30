"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
  const router = useRouter();
  const { token, initialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized) return;
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router, token, initialized]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f3f0' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
        <p className="mt-4 text-gray-800">Loading...</p>
      </div>
    </div>
  );
}
