
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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030711]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">

        {/* LOGO */}
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex shrink-0 items-center gap-3"
        >
          <Image
            src="/iron-league-logo.jpg"
            alt="Iron League"
            width={56}
            height={56}
            className="h-12 w-12 rounded-md object-cover"
          />

          <div>
            <div className="text-base font-black tracking-[0.12em] sm:text-lg">
              IRON LEAGUE
            </div>

            <div className="mt-1 text-[9px] uppercase tracking-[0.25em] text-white/50">
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
                className={`whitespace-nowrap text-xs font-semibold transition-colors duration-200 ${
                  active
                    ? "text-blue-300"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* MOBILE MENU BUTTON */}
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:border-blue-400/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 xl:hidden"
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
        className={`border-t border-white/10 bg-[#07101d] ${
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
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-blue-400/20 bg-blue-500/15 text-blue-300"
                    : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
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
