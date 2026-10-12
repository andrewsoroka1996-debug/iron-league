
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { label: "Головна", href: "/" },
  { label: "Матчі", href: "/matches" },
  { label: "Дивізіони", href: "/divisions" },
  { label: "Турніри", href: "/#tournaments" },
  { label: "Гравці", href: "/players" },
  { label: "Коефіцієнти", href: "/coefficients" },
  { label: "Історія", href: "/history" },
  { label: "Новини", href: "/news" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    if (href.includes("#")) {
      return false;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-il-border bg-il-background/95 text-il-text shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-xl">

      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:h-[84px] sm:px-6">

        {/* BRAND */}
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="group flex min-w-0 shrink-0 items-center gap-3"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-1 sm:h-14 sm:w-14">
            <Image
              src="/iron-league-logo.jpg"
              alt="Iron League"
              width={56}
              height={56}
              priority
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <div className="min-w-0">
            <div className="whitespace-nowrap text-[15px] font-black tracking-[0.12em] sm:text-lg">
              IRON LEAGUE
            </div>

            <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.20em] text-il-secondary">
              БІЛЬШЕ НІЖ ГРА
            </div>
          </div>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav
          aria-label="Основна навігація"
          className="hidden items-center gap-5 xl:flex"
        >
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  active ? "page" : undefined
                }
                className={`group relative whitespace-nowrap py-3 text-xs font-bold transition-colors duration-200 ${
                  active
                    ? "text-white"
                    : "text-il-secondary hover:text-white"
                }`}
              >
                {item.label}

                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 h-[2px] rounded-full bg-il-primary transition-all duration-200 ${
                    active
                      ? "w-full opacity-100"
                      : "w-0 opacity-0 group-hover:w-full group-hover:opacity-70"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* MOBILE BUTTON */}
        <button
          type="button"
          aria-label={
            menuOpen
              ? "Закрити меню"
              : "Відкрити меню"
          }
          aria-expanded={menuOpen}
          aria-controls="iron-mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-white transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 xl:hidden ${
            menuOpen
              ? "border-blue-400/40 bg-blue-500/20"
              : "border-white/15 bg-white/5 hover:border-blue-400/30 hover:bg-white/10"
          }`}
        >
          {menuOpen ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* MOBILE NAVIGATION */}
      <nav
        id="iron-mobile-navigation"
        aria-label="Мобільна навігація"
        className={`border-t border-il-border bg-il-surface ${
          menuOpen ? "block" : "hidden"
        } xl:hidden`}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-4 sm:px-6">
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={
                  active ? "page" : undefined
                }
                className={`rounded-xl border px-4 py-3.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "border-blue-400/25 bg-blue-500/15 text-blue-300"
                    : "border-white/5 bg-white/[0.025] text-il-secondary hover:border-blue-400/20 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
