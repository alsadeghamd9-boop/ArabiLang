"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Package, ShieldCheck, LogOut, User, Menu, X } from "lucide-react";

interface UserInfo {
  userId: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
}

export default function Navbar() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null));
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-5xl h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-emerald-700">
          <Package className="w-6 h-6 text-emerald-600" />
          <span>سودان-بريدج</span>
          <span className="text-xs font-normal text-slate-400 hidden sm:inline">SudanBridge</span>
        </Link>

        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="text-slate-700 hover:text-emerald-600">
            حاسبة التكلفة
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-slate-700 hover:text-emerald-600">
                طلباتي
              </Link>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100"
                >
                  <ShieldCheck className="w-4 h-4" />
                  لوحة الإدارة
                </Link>
              )}
              <span className="text-slate-400">|</span>
              <span className="flex items-center gap-1 text-slate-600">
                <User className="w-4 h-4" />
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-red-600 hover:text-red-700"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-700 hover:text-emerald-600">
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
              >
                حساب جديد
              </Link>
            </>
          )}
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-slate-600"
          aria-label="القائمة"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2 text-sm">
          <Link href="/" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-700">
            حاسبة التكلفة
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-700">
                طلباتي
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" onClick={() => setMenuOpen(false)} className="block py-2 text-amber-700 font-semibold">
                  لوحة الإدارة
                </Link>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="block w-full text-right py-2 text-red-600"
              >
                تسجيل الخروج ({user.name})
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-700">
                تسجيل الدخول
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="block py-2 text-emerald-700 font-semibold">
                إنشاء حساب جديد
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
