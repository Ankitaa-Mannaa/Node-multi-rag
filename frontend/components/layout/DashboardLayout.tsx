"use client";

import React from "react";
import { Sidebar } from "./Sidebar";

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="flex h-screen bg-cream-100" style={{ backgroundColor: '#f5f3f0' }}>
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
};
