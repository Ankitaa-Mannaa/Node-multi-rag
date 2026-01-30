"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FiMessageSquare,
  FiFileText,
  FiDollarSign,
  FiZap,
  FiLogOut,
  FiHome,
} from "react-icons/fi";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: FiHome },
  { href: "/dashboard/support", label: "Support", icon: FiMessageSquare, ragType: "support" },
  { href: "/dashboard/resume", label: "Resume", icon: FiFileText, ragType: "resume" },
  { href: "/dashboard/expense", label: "Expense", icon: FiDollarSign, ragType: "expense" },
  { href: "/dashboard/general", label: "General", icon: FiZap, ragType: "general" },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearAuth();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      clearAuth();
      router.push("/login");
    }
  };

  return (
    <div className="w-64 border-r border-cream-300 flex flex-col h-screen shadow-sm" style={{ backgroundColor: '#faf8f5' }}>
      <div className="p-6 border-b border-cream-300">
        <h1 className="text-xl font-bold text-black">Multi-RAG AI</h1>
        <p className="text-xs text-gray-600 mt-1">Workspace Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-black text-white font-medium shadow-sm"
                  : "text-gray-800 hover:bg-cream-200"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-cream-300">
        <div className="px-4 py-2 mb-2">
          <p className="text-xs text-gray-600">Logged in as</p>
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-800 hover:bg-cream-200 transition-colors"
        >
          <FiLogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
