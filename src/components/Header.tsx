"use client";

import React from "react";
import Link from "next/link";
import { Cloud, ShieldCheck, User, LogIn, LayoutDashboard } from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface HeaderProps {
  onReset?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset }) => {
  const { data: session } = useSession();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div
          onClick={onReset}
          className="flex items-center gap-3 cursor-pointer group"
          role="button"
          tabIndex={0}
        >
          <div className="p-2 bg-amber-500 rounded-lg text-slate-950 font-bold flex items-center justify-center shadow">
            <Cloud className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-amber-400 transition-colors">
                AWS Simulados
              </span>
              <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                CLF-C02
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Preparatório para AWS Certified Cloud Practitioner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-medium">PostgreSQL Local</span>
          </div>

          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                <span className="max-w-[120px] truncate">{session.user.name}</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white font-medium hover:bg-slate-800 transition-all flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-sm"
              >
                Cadastrar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
