"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { LogOut } from "lucide-react";

export function DashboardClientControls() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Erro ao sair:", err);
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoggingOut}
      className="py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700/80 text-slate-200 font-semibold text-xs sm:text-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
    >
      <LogOut className="w-4 h-4 text-slate-400" />
      {isLoggingOut ? "Saindo..." : "Sair"}
    </button>
  );
}
